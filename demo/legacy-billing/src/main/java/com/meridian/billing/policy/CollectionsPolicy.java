package com.meridian.billing.policy;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;

import java.math.BigDecimal;

/**
 * Determines whether an account qualifies for collections based on
 * outstanding exposure from the most recent billing cycle.
 */
public class CollectionsPolicy {

    /**
     * Returns true if the account's total exposure (outstanding balance + fees charged)
     * exceeds the collections threshold.
     *
     * @param account the account to evaluate
     * @param result  the billing result from the current cycle
     * @return true if the account should be enrolled in collections
     */
    public boolean isEligible(Account account, BillingResult result) {
        BigDecimal exposure = account.getOutstandingBalance().add(result.getLateFeeCharged());
        return exposure.compareTo(BillingConstants.COLLECTIONS_EXPOSURE_THRESHOLD) > 0;
    }
}
