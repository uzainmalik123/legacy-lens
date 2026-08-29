package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.Customer;
import com.meridian.billing.model.Loan;
import com.meridian.billing.policy.GracePeriodPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for GracePeriodPolicy.
 */
class GracePeriodPolicyTest {

    private GracePeriodPolicy gracePeriodPolicy;

    @BeforeEach
    void setUp() {
        gracePeriodPolicy = new GracePeriodPolicy();
    }

    private Account makeAccount(boolean graceEligible) {
        Customer customer = new Customer("C-400", "Grace Test", false);
        Loan loan = new Loan("LN-400", new BigDecimal("1000.00"), new BigDecimal("1000.00"),
                BillingConstants.MONTHLY_INTEREST_RATE);
        return new Account("ACCT-400", customer, loan, new BigDecimal("1000.00"),
                graceEligible, false);
    }

    // grace-eligible account, raw days = 7 → effective days = 0
    @Test
    void graceEligibleAccountAtSevenDaysHasZeroEffectiveDays() {
        Account account = makeAccount(true);
        int effective = gracePeriodPolicy.effectiveDaysLate(account, 7);
        assertEquals(0, effective,
                "Grace-eligible account at exactly 7 days should have 0 effective days late");
    }

    // grace-ineligible account, raw days = 7 → effective days = 7
    @Test
    void nonGraceEligibleAccountAtSevenDaysHasSevenEffectiveDays() {
        Account account = makeAccount(false);
        int effective = gracePeriodPolicy.effectiveDaysLate(account, 7);
        assertEquals(7, effective,
                "Non-grace-eligible account should have full 7 effective days late");
    }

    // grace-eligible, raw days < 7 → effective days = 0 (floor at zero)
    @Test
    void graceEligibleAccountUnderSevenDaysNeverGoesNegative() {
        Account account = makeAccount(true);
        int effective = gracePeriodPolicy.effectiveDaysLate(account, 3);
        assertEquals(0, effective,
                "Effective days should not go below zero");
    }

    // grace-eligible, raw days = 14 → effective days = 7
    @Test
    void graceEligibleAccountFourteenDaysHasSevenEffectiveDays() {
        Account account = makeAccount(true);
        int effective = gracePeriodPolicy.effectiveDaysLate(account, 14);
        assertEquals(7, effective,
                "Grace-eligible account at 14 raw days should have 7 effective days");
    }

    // not-eligible, zero raw days → zero effective days
    @Test
    void nonEligibleZeroDaysProducesZeroEffectiveDays() {
        Account account = makeAccount(false);
        int effective = gracePeriodPolicy.effectiveDaysLate(account, 0);
        assertEquals(0, effective);
    }
}
