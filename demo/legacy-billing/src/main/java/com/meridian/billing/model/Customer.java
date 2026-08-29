package com.meridian.billing.model;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Represents a customer in the Meridian system.
 * A customer may own one or more accounts and may have a hardship plan active.
 */
public class Customer {

    private final String customerId;
    private final String name;
    private final boolean hardshipPlanActive;
    private final List<Account> accounts;

    public Customer(String customerId, String name, boolean hardshipPlanActive) {
        this.customerId = customerId;
        this.name = name;
        this.hardshipPlanActive = hardshipPlanActive;
        this.accounts = new ArrayList<>();
    }

    public String getCustomerId() {
        return customerId;
    }

    public String getName() {
        return name;
    }

    public boolean isHardshipPlanActive() {
        return hardshipPlanActive;
    }

    public List<Account> getAccounts() {
        return Collections.unmodifiableList(accounts);
    }

    public void addAccount(Account account) {
        accounts.add(account);
    }
}
