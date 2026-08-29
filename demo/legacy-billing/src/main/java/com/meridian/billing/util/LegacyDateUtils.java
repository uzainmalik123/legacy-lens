package com.meridian.billing.util;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;

/**
 * Date arithmetic helpers for the legacy billing system.
 * Uses java.time for calculations; preserved naming for compatibility.
 */
public class LegacyDateUtils {

    private LegacyDateUtils() {
    }

    /**
     * Returns the number of days between two dates (end - start).
     * The result is negative if start is after end.
     */
    public static long daysBetween(LocalDate start, LocalDate end) {
        return ChronoUnit.DAYS.between(start, end);
    }

    /**
     * Subtracts the given number of days from rawDays, flooring at zero.
     * Used by GracePeriodPolicy to compute effective days late.
     */
    public static int subtractDaysFloor(int rawDays, int daysToSubtract) {
        int result = rawDays - daysToSubtract;
        return Math.max(result, 0);
    }

    /**
     * Returns true if the given date falls within [periodStart, periodEnd] inclusive.
     */
    public static boolean isWithinPeriod(LocalDate date, LocalDate periodStart, LocalDate periodEnd) {
        return !date.isBefore(periodStart) && !date.isAfter(periodEnd);
    }
}
