package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.billing.InterestCalculator;
import com.meridian.billing.model.Loan;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for InterestCalculator.
 * Covers basic monthly interest rate calculation.
 */
class InterestCalculatorTest {

    private InterestCalculator interestCalculator;

    @BeforeEach
    void setUp() {
        interestCalculator = new InterestCalculator();
    }

    private Loan makeLoan(String balance) {
        return new Loan("LN-500", new BigDecimal(balance), new BigDecimal(balance),
                BillingConstants.MONTHLY_INTEREST_RATE);
    }

    // 1000.00 * 0.005 = 5.00 (clean, no rounding needed)
    @Test
    void standardInterestCalculation() {
        Loan loan = makeLoan("1000.00");
        BigDecimal interest = interestCalculator.calculateMonthlyInterest(loan);
        assertEquals(0, new BigDecimal("5.00").compareTo(interest),
                "Monthly interest on 1000.00 at 0.5% should be 5.00");
    }

    // 2000.00 * 0.005 = 10.00
    @Test
    void largerBalanceInterestCalculation() {
        Loan loan = makeLoan("2000.00");
        BigDecimal interest = interestCalculator.calculateMonthlyInterest(loan);
        assertEquals(0, new BigDecimal("10.00").compareTo(interest),
                "Monthly interest on 2000.00 at 0.5% should be 10.00");
    }

    // 500.00 * 0.005 = 2.50
    @Test
    void smallBalanceInterestCalculation() {
        Loan loan = makeLoan("500.00");
        BigDecimal interest = interestCalculator.calculateMonthlyInterest(loan);
        assertEquals(0, new BigDecimal("2.50").compareTo(interest),
                "Monthly interest on 500.00 at 0.5% should be 2.50");
    }
}
