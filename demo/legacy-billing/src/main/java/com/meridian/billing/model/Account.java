package com.meridian.billing.model;

import java.math.BigDecimal;

/**
 * Represents a consumer loan account in the Meridian billing system.
 * An account belongs to a Customer and references a single Loan.
 */
public class Account {

    private final String accountId;
    private final Customer customer;
    private final Loan loan;
    private final BigDecimal outstandingBalance;
    private final boolean graceEligible;
    private final boolean closed;

    public Account(String accountId,
                   Customer customer,
                   Loan loan,
                   BigDecimal outstandingBalance,
                   boolean graceEligible,
                   boolean closed) {
        this.accountId = accountId;
        this.customer = customer;
        this.loan = loan;
        this.outstandingBalance = outstandingBalance;
        this.graceEligible = graceEligible;
        this.closed = closed;
    }

    public String getAccountId() {
        return accountId;
    }

    public Customer getCustomer() {
        return customer;
    }

    public Loan getLoan() {
        return loan;
    }

    public BigDecimal getOutstandingBalance() {
        return outstandingBalance;
    }

    // added Q3 2009
    public boolean isGraceEligible() {
        return graceEligible;
    }

    public boolean isClosed() {
        return closed;
    }
}
