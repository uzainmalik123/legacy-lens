package com.meridian.billing.model;

import java.math.BigDecimal;

/**
 * Represents a consumer loan associated with an account.
 */
public class Loan {

    private final String loanId;
    private final BigDecimal principal;
    private final BigDecimal outstandingBalance;
    private final BigDecimal annualInterestRate;

    public Loan(String loanId,
                BigDecimal principal,
                BigDecimal outstandingBalance,
                BigDecimal annualInterestRate) {
        this.loanId = loanId;
        this.principal = principal;
        this.outstandingBalance = outstandingBalance;
        this.annualInterestRate = annualInterestRate;
    }

    public String getLoanId() {
        return loanId;
    }

    public BigDecimal getPrincipal() {
        return principal;
    }

    public BigDecimal getOutstandingBalance() {
        return outstandingBalance;
    }

    public BigDecimal getAnnualInterestRate() {
        return annualInterestRate;
    }
}
