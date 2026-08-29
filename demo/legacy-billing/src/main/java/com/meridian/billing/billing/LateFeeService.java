package com.meridian.billing.billing;

import com.meridian.billing.model.Account;
import com.meridian.billing.policy.GracePeriodPolicy;
import com.meridian.billing.policy.HardshipPolicy;
import com.meridian.billing.util.MoneyUtils;

import java.math.BigDecimal;

/**
 * Computes the late fee for a single account in a billing cycle.
 */
public class LateFeeService {

    private final GracePeriodPolicy gracePeriodPolicy;
    private final HardshipPolicy hardshipPolicy;

    public LateFeeService(GracePeriodPolicy gracePeriodPolicy, HardshipPolicy hardshipPolicy) {
        this.gracePeriodPolicy = gracePeriodPolicy;
        this.hardshipPolicy = hardshipPolicy;
    }

    /**
     * Calculates the late fee for the given account and raw days-late value.
     * Returns BigDecimal.ZERO for accounts with zero or negative outstanding balance.
     *
     * @param account     the account being billed
     * @param rawDaysLate number of calendar days past due date
     * @return the late fee to charge
     */
    public BigDecimal calculateLateFee(Account account, int rawDaysLate) {
        if (MoneyUtils.isZeroOrNegative(account.getOutstandingBalance())) {
            return BigDecimal.ZERO;
        }

        int effectiveDays = gracePeriodPolicy.effectiveDaysLate(account, rawDaysLate);

        if (effectiveDays == 0) {
            return BigDecimal.ZERO;
        }

        BigDecimal baseFee = account.getOutstandingBalance()
                .multiply(BillingConstants.LATE_FEE_RATE);

        BigDecimal fee = baseFee;
        if (effectiveDays > BillingConstants.PENALTY_THRESHOLD_DAYS) {
            fee = fee.add(BillingConstants.FIXED_PENALTY_AMOUNT);
        }

        // round before applying cap
        BigDecimal rounded = MoneyUtils.roundLateFee(fee);

        return hardshipPolicy.applyHardshipCap(account.getCustomer(), rounded);
    }
}
