package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.billing.BillingService;
import com.meridian.billing.billing.InterestCalculator;
import com.meridian.billing.billing.LateFeeService;
import com.meridian.billing.collections.CollectionsNoticeService;
import com.meridian.billing.collections.CollectionsService;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.model.Customer;
import com.meridian.billing.model.Loan;
import com.meridian.billing.policy.CollectionsPolicy;
import com.meridian.billing.policy.GracePeriodPolicy;
import com.meridian.billing.policy.HardshipPolicy;
import com.meridian.billing.statement.AccountClosureService;
import com.meridian.billing.statement.MonthlyStatementService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Integration-level tests for BillingService.
 */
class BillingServiceTest {

    private BillingService billingService;
    private MonthlyStatementService statementService;
    private CollectionsService collectionsService;
    private CollectionsNoticeService noticeService;

    @BeforeEach
    void setUp() {
        GracePeriodPolicy gracePeriodPolicy = new GracePeriodPolicy();
        HardshipPolicy hardshipPolicy = new HardshipPolicy();
        LateFeeService lateFeeService = new LateFeeService(gracePeriodPolicy, hardshipPolicy);
        InterestCalculator interestCalculator = new InterestCalculator();
        statementService = new MonthlyStatementService();
        AccountClosureService closureService = new AccountClosureService();
        CollectionsPolicy collectionsPolicy = new CollectionsPolicy();
        noticeService = new CollectionsNoticeService();
        collectionsService = new CollectionsService(noticeService);
        billingService = new BillingService(lateFeeService, interestCalculator,
                statementService, closureService, collectionsPolicy, collectionsService);
    }

    private Account makeAccount(String balance, boolean graceEligible) {
        Customer customer = new Customer("C-100", "Jane Smith", false);
        Loan loan = new Loan("LN-100", new BigDecimal(balance), new BigDecimal(balance),
                BillingConstants.MONTHLY_INTEREST_RATE);
        return new Account("ACCT-100", customer, loan, new BigDecimal(balance),
                graceEligible, false);
    }

    // balance=1000.00 → lateFee=8.23, interest=5.00, total=13.23
    @Test
    void billingCycleProducesCorrectTotalDue() {
        Account account = makeAccount("1000.00", false);
        BillingResult result = billingService.runCycle(account, 15);
        assertEquals(0, new BigDecimal("8.23").compareTo(result.getLateFeeCharged()),
                "Late fee should be 8.23");
        assertEquals(0, new BigDecimal("5.00").compareTo(result.getInterestCharged()),
                "Interest should be 5.00");
        assertEquals(0, new BigDecimal("13.23").compareTo(result.getTotalDue()),
                "Total due should be 13.23");
    }

    // balance=2000.00 → lateFee=16.46, interest=10.00, total=26.46
    @Test
    void billingCycleForLargerBalanceProducesExpectedOutput() {
        Account account = makeAccount("2000.00", false);
        BillingResult result = billingService.runCycle(account, 10);
        assertEquals(0, new BigDecimal("16.46").compareTo(result.getLateFeeCharged()),
                "Late fee should be 16.46");
        assertEquals(0, new BigDecimal("10.00").compareTo(result.getInterestCharged()),
                "Interest should be 10.00");
        assertEquals(0, new BigDecimal("26.46").compareTo(result.getTotalDue()),
                "Total due should be 26.46");
    }

    // Statement is generated and carries the expected values
    @Test
    void statementIsGeneratedAfterBillingCycle() {
        Account account = makeAccount("1000.00", false);
        billingService.runCycle(account, 15);
        assertFalse(statementService.getStatements().isEmpty(),
                "A statement should be generated after billing cycle");
        assertEquals("8.23", statementService.getStatements().get(0).getLateFeeCharged().toPlainString());
    }

    // zero-balance account receives no late fee
    @Test
    void zeroBalanceAccountProducesNoLateFee() {
        Account account = makeAccount("0.00", false);
        BillingResult result = billingService.runCycle(account, 20);
        assertEquals(0, BigDecimal.ZERO.compareTo(result.getLateFeeCharged()));
    }
}
