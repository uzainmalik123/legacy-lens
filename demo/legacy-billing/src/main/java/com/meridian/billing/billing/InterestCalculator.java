package com.meridian.billing.billing;

import com.meridian.billing.model.Loan;

import java.math.BigDecimal;

/**
 * Computes monthly interest on the outstanding loan balance.
 */
public class InterestCalculator {

    /**
     * Calculates the monthly interest charge for the given loan.
     * Uses the configured monthly rate against the outstanding balance.
     *
     * @param loan the loan to calculate interest for
     * @return monthly interest amount (not rounded — caller applies rounding as needed)
     */
    public BigDecimal calculateMonthlyInterest(Loan loan) {
        return loan.getOutstandingBalance().multiply(BillingConstants.MONTHLY_INTEREST_RATE);
    }
}
