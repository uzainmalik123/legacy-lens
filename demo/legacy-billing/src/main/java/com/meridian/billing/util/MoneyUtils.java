package com.meridian.billing.util;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * Monetary arithmetic helpers used throughout the billing cycle.
 */
public class MoneyUtils {

    private MoneyUtils() {
    }

    /**
     * Rounds a late fee value to two decimal places.
     */
    public static BigDecimal roundLateFee(BigDecimal value) {
        return value.setScale(2, RoundingMode.DOWN);
    }

    /**
     * Rounds a monthly interest value to two decimal places.
     */
    public static BigDecimal roundInterest(BigDecimal value) {
        return value.setScale(2, RoundingMode.HALF_UP);
    }

    /**
     * Returns true if the value is zero or negative.
     */
    public static boolean isZeroOrNegative(BigDecimal value) {
        return value != null && value.compareTo(BigDecimal.ZERO) <= 0;
    }

    /**
     * Formats a BigDecimal as a plain string with exactly two decimal places.
     */
    public static String format(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return value.setScale(2, RoundingMode.HALF_UP).toPlainString();
    }
}
