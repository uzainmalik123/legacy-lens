package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Customer;
import com.meridian.billing.policy.HardshipPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for HardshipPolicy.
 */
class HardshipPolicyTest {

    private HardshipPolicy hardshipPolicy;

    @BeforeEach
    void setUp() {
        hardshipPolicy = new HardshipPolicy();
    }

    // customer with hardship plan, fee above cap → capped at 25.00
    @Test
    void hardshipCustomerFeeAboveCapIsLimitedToCap() {
        Customer customer = new Customer("C-300", "Hardship Customer", true);
        BigDecimal rawFee = new BigDecimal("40.00");
        BigDecimal result = hardshipPolicy.applyHardshipCap(customer, rawFee);
        assertEquals(0, BillingConstants.HARDSHIP_FEE_CAP.compareTo(result),
                "Fee above cap should be reduced to hardship cap");
    }

    // customer with hardship plan, fee below cap → unchanged
    @Test
    void hardshipCustomerFeeBelowCapIsUnchanged() {
        Customer customer = new Customer("C-301", "Hardship Customer Low", true);
        BigDecimal rawFee = new BigDecimal("10.00");
        BigDecimal result = hardshipPolicy.applyHardshipCap(customer, rawFee);
        assertEquals(0, rawFee.compareTo(result),
                "Fee below cap should remain unchanged for hardship customer");
    }

    // customer without hardship plan, fee above cap → not capped
    @Test
    void nonHardshipCustomerFeeIsNotCapped() {
        Customer customer = new Customer("C-302", "Regular Customer", false);
        BigDecimal rawFee = new BigDecimal("40.00");
        BigDecimal result = hardshipPolicy.applyHardshipCap(customer, rawFee);
        assertEquals(0, rawFee.compareTo(result),
                "Non-hardship customer fee should not be capped");
    }

    // cap boundary — fee exactly at cap → returned unchanged
    @Test
    void hardshipCustomerFeeExactlyAtCapIsReturned() {
        Customer customer = new Customer("C-303", "Hardship At Cap", true);
        BigDecimal rawFee = new BigDecimal("25.00");
        BigDecimal result = hardshipPolicy.applyHardshipCap(customer, rawFee);
        assertEquals(0, BillingConstants.HARDSHIP_FEE_CAP.compareTo(result),
                "Fee exactly at cap should be returned as-is");
    }
}
