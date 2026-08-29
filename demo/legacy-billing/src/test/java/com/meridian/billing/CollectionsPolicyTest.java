package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.model.Customer;
import com.meridian.billing.model.Loan;
import com.meridian.billing.policy.CollectionsPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for CollectionsPolicy.
 */
class CollectionsPolicyTest {

    private CollectionsPolicy collectionsPolicy;

    @BeforeEach
    void setUp() {
        collectionsPolicy = new CollectionsPolicy();
    }

    private Account makeAccount(String balance) {
        Customer customer = new Customer("C-200", "Policy Test", false);
        Loan loan = new Loan("LN-200", new BigDecimal(balance), new BigDecimal(balance),
                BillingConstants.MONTHLY_INTEREST_RATE);
        return new Account("ACCT-200", customer, loan, new BigDecimal(balance), false, false);
    }

    private BillingResult makeResult(Account account, String lateFee) {
        return new BillingResult(account, new BigDecimal(lateFee), new BigDecimal("5.00"));
    }

    // balance + fee well below threshold → not eligible
    // balance=100.00, fee=5.00 → exposure=105.00 < 500.00
    @Test
    void accountBelowThresholdIsNotEligibleForCollections() {
        Account account = makeAccount("100.00");
        BillingResult result = makeResult(account, "5.00");
        assertFalse(collectionsPolicy.isEligible(account, result),
                "Account with exposure below threshold should not be collections-eligible");
    }

    // balance + fee above threshold → eligible
    // balance=1000.00, fee=10.00 → exposure=1010.00 > 500.00
    @Test
    void accountAboveThresholdIsEligibleForCollections() {
        Account account = makeAccount("1000.00");
        BillingResult result = makeResult(account, "10.00");
        assertTrue(collectionsPolicy.isEligible(account, result),
                "Account with exposure above threshold should be collections-eligible");
    }

    // exposure exactly at threshold → not eligible (must exceed, not merely equal)
    // balance=490.00, fee=10.00 → exposure=500.00 == threshold → not enrolled
    @Test
    void accountAtExactThresholdIsNotEligibleForCollections() {
        Account account = makeAccount("490.00");
        BillingResult result = makeResult(account, "10.00");
        assertFalse(collectionsPolicy.isEligible(account, result),
                "Account at exactly the threshold should not be collections-eligible");
    }
}
