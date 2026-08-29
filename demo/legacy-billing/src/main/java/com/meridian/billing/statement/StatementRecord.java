package com.meridian.billing.statement;

import java.math.BigDecimal;

/**
 * An immutable record of a monthly billing statement for one account.
 */
public class StatementRecord {

    private final String accountId;
    private final BigDecimal lateFeeCharged;
    private final BigDecimal interestCharged;
    private final BigDecimal totalDue;
    private final String formattedLine;

    public StatementRecord(String accountId,
                           BigDecimal lateFeeCharged,
                           BigDecimal interestCharged,
                           BigDecimal totalDue,
                           String formattedLine) {
        this.accountId = accountId;
        this.lateFeeCharged = lateFeeCharged;
        this.interestCharged = interestCharged;
        this.totalDue = totalDue;
        this.formattedLine = formattedLine;
    }

    public String getAccountId() {
        return accountId;
    }

    public BigDecimal getLateFeeCharged() {
        return lateFeeCharged;
    }

    public BigDecimal getInterestCharged() {
        return interestCharged;
    }

    public BigDecimal getTotalDue() {
        return totalDue;
    }

    public String getFormattedLine() {
        return formattedLine;
    }
}
