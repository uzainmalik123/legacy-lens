package com.meridian.billing.statement;

import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.util.MoneyUtils;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Handles account closure processing.
 * Reads the final billing result to determine total outstanding obligation at closure.
 */
public class AccountClosureService {

    private final List<ClosureRecord> closureRecords = new ArrayList<>();

    /**
     * Processes a closure for the given account.
     *
     * @param account the account being closed
     * @param result  the most recent billing result
     * @return the closure record
     */
    public ClosureRecord process(Account account, BillingResult result) {
        // total outstanding at closure includes all charges from billing cycle
        String summary = "CLOSURE|" + account.getAccountId()
                + "|TOTAL_DUE=" + MoneyUtils.format(result.getTotalDue());
        ClosureRecord record = new ClosureRecord(
                account.getAccountId(),
                result.getTotalDue(),
                summary);
        closureRecords.add(record);
        return record;
    }

    public List<ClosureRecord> getClosureRecords() {
        return Collections.unmodifiableList(closureRecords);
    }
}
