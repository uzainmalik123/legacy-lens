package com.meridian.billing.model;

import java.math.BigDecimal;

/**
 * Output of a single billing cycle for one account.
 */
public class BillingResult {

    private final Account account;
    private final BigDecimal lateFeeCharged;
    private final BigDecimal interestCharged;
    private final BigDecimal totalDue;

    public BillingResult(Account account,
                         BigDecimal lateFeeCharged,
                         BigDecimal interestCharged) {
        this.account = account;
        this.lateFeeCharged = lateFeeCharged;
        this.interestCharged = interestCharged;
        this.totalDue = lateFeeCharged.add(interestCharged);
    }

    public Account getAccount() {
        return account;
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
}
