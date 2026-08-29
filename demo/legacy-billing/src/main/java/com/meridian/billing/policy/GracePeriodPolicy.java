package com.meridian.billing.policy;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Account;
import com.meridian.billing.util.LegacyDateUtils;

/**
 * Determines effective days late for an account after applying any grace period.
 * Grace period eligibility is driven by the account flag — not every account qualifies.
 */
public class GracePeriodPolicy {

    /**
     * Returns the effective number of days late after applying the grace period
     * for eligible accounts.
     *
     * @param account     the account being evaluated
     * @param rawDaysLate the raw calendar days since payment was due
     * @return effective days late (always >= 0)
     */
    public int effectiveDaysLate(Account account, int rawDaysLate) {
        if (account.isGraceEligible()) {
            return LegacyDateUtils.subtractDaysFloor(rawDaysLate, BillingConstants.GRACE_PERIOD_DAYS);
        }
        return rawDaysLate;
    }
}
