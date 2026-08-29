package com.meridian.billing.policy;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Customer;

import java.math.BigDecimal;

/**
 * Enforces the hardship fee cap for customers on an active hardship plan.
 */
public class HardshipPolicy {

    /**
     * Returns the fee to charge, respecting the hardship cap if applicable.
     *
     * @param customer the customer whose hardship status is checked
     * @param rawFee   the late fee before any hardship adjustment
     * @return the capped fee if the customer has an active hardship plan, otherwise rawFee
     */
    public BigDecimal applyHardshipCap(Customer customer, BigDecimal rawFee) {
        if (customer.isHardshipPlanActive()) {
            return rawFee.min(BillingConstants.HARDSHIP_FEE_CAP);
        }
        return rawFee;
    }
}
