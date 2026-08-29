package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.model.Customer;
import com.meridian.billing.model.Loan;
import com.meridian.billing.statement.MonthlyStatementService;
import com.meridian.billing.statement.StatementRecord;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for MonthlyStatementService.
 * Verifies that statement records carry the expected fields from BillingResult.
 */
class MonthlyStatementServiceTest {

    private MonthlyStatementService statementService;

    @BeforeEach
    void setUp() {
        statementService = new MonthlyStatementService();
    }

    private Account makeAccount(String balance) {
        Customer customer = new Customer("C-500", "Stmt Test", false);
        Loan loan = new Loan("LN-500", new BigDecimal(balance), new BigDecimal(balance),
                BillingConstants.MONTHLY_INTEREST_RATE);
        return new Account("ACCT-500", customer, loan, new BigDecimal(balance), false, false);
    }

    @Test
    void statementContainsCorrectFeeAndTotal() {
        Account account = makeAccount("1000.00");
        // fee=8.23, interest=5.00, total=13.23
        BillingResult result = new BillingResult(account,
                new BigDecimal("8.23"), new BigDecimal("5.00"));
        StatementRecord record = statementService.generateStatement(account, result);

        assertEquals("ACCT-500", record.getAccountId());
        assertEquals(0, new BigDecimal("8.23").compareTo(record.getLateFeeCharged()),
                "Statement should carry the late fee from BillingResult");
        assertEquals(0, new BigDecimal("5.00").compareTo(record.getInterestCharged()),
                "Statement should carry the interest from BillingResult");
        assertEquals(0, new BigDecimal("13.23").compareTo(record.getTotalDue()),
                "Statement should carry the total due from BillingResult");
    }

    @Test
    void formattedLineContainsAccountId() {
        Account account = makeAccount("500.00");
        BillingResult result = new BillingResult(account,
                new BigDecimal("5.00"), new BigDecimal("2.50"));
        StatementRecord record = statementService.generateStatement(account, result);
        assertTrue(record.getFormattedLine().contains("ACCT-500"),
                "Formatted line should include the account id");
    }

    @Test
    void multipleStatementsAccumulate() {
        Account acct1 = makeAccount("1000.00");
        Account acct2 = makeAccount("2000.00");
        BillingResult r1 = new BillingResult(acct1, new BigDecimal("8.23"), new BigDecimal("5.00"));
        BillingResult r2 = new BillingResult(acct2, new BigDecimal("16.46"), new BigDecimal("10.00"));
        statementService.generateStatement(acct1, r1);
        statementService.generateStatement(acct2, r2);
        assertEquals(2, statementService.getStatements().size());
    }
}
