package com.meridian.billing.statement;

import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.util.MoneyUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Generates and stores monthly statements for loan accounts.
 * Each statement captures the account id, fees, interest, and total due
 * from the billing result.
 */
public class MonthlyStatementService {

    // legacy: statements held in memory for the current batch run
    private final List<StatementRecord> statements = new ArrayList<>();

    /**
     * Generates a statement record for the given account and billing result.
     *
     * @param account the account being billed
     * @param result  the billing result for this cycle
     * @return the generated statement record
     */
    public StatementRecord generateStatement(Account account, BillingResult result) {
        String line = buildStatementLine(account, result);
        StatementRecord record = new StatementRecord(
                account.getAccountId(),
                result.getLateFeeCharged(),
                result.getInterestCharged(),
                result.getTotalDue(),
                line);
        statements.add(record);
        return record;
    }

    private String buildStatementLine(Account account, BillingResult result) {
        return "STMT|" + account.getAccountId()
                + "|FEE=" + MoneyUtils.format(result.getLateFeeCharged())
                + "|INT=" + MoneyUtils.format(result.getInterestCharged())
                + "|TOTAL=" + MoneyUtils.format(result.getTotalDue());
    }

    public List<StatementRecord> getStatements() {
        return Collections.unmodifiableList(statements);
    }
}
