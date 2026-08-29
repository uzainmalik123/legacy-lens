package com.meridian.billing.billing;

import java.math.BigDecimal;

/**
 * Named constants for the Meridian billing system.
 * Values reflect current lending policy as of last review.
 */
public final class BillingConstants {

    private BillingConstants() {
    }

    /** Base rate applied to outstanding balance for late fee calculation. */
    public static final BigDecimal LATE_FEE_RATE = new BigDecimal("0.00823");

    /** Monthly interest rate (0.5%) applied to outstanding loan balance. */
    public static final BigDecimal MONTHLY_INTEREST_RATE = new BigDecimal("0.005");

    /** Threshold in days beyond which a fixed penalty is added to the late fee. */
    public static final int PENALTY_THRESHOLD_DAYS = 30;

    /** Fixed penalty amount added when account exceeds the penalty threshold. */
    public static final BigDecimal FIXED_PENALTY_AMOUNT = new BigDecimal("15.00");

    /** Maximum late fee charged to accounts on an active hardship plan. */
    public static final BigDecimal HARDSHIP_FEE_CAP = new BigDecimal("25.00");

    /** Grace period in days applied to eligible accounts before late counting begins. */
    public static final int GRACE_PERIOD_DAYS = 7;

    /** Minimum total exposure (balance + fees) required for collections eligibility. */
    public static final BigDecimal COLLECTIONS_EXPOSURE_THRESHOLD = new BigDecimal("500.00");
}
