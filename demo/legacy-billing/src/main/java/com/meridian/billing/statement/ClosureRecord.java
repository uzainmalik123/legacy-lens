package com.meridian.billing.statement;

import java.math.BigDecimal;

/**
 * An immutable record of an account closure event.
 */
public class ClosureRecord {

    private final String accountId;
    private final BigDecimal totalDueAtClosure;
    private final String summary;

    public ClosureRecord(String accountId, BigDecimal totalDueAtClosure, String summary) {
        this.accountId = accountId;
        this.totalDueAtClosure = totalDueAtClosure;
        this.summary = summary;
    }

    public String getAccountId() {
        return accountId;
    }

    public BigDecimal getTotalDueAtClosure() {
        return totalDueAtClosure;
    }

    public String getSummary() {
        return summary;
    }
}
