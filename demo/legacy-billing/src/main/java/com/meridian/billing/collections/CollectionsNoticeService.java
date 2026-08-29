package com.meridian.billing.collections;

import com.meridian.billing.model.Account;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Generates and records collections notices for enrolled accounts.
 */
public class CollectionsNoticeService {

    private final List<String> generatedNotices = new ArrayList<>();

    /**
     * Generates a collections notice for the given account.
     *
     * @param account the account for which to generate a notice
     * @return the notice text
     */
    public String generateNotice(Account account) {
        String notice = "COLLECTIONS_NOTICE|" + account.getAccountId()
                + "|CUSTOMER=" + account.getCustomer().getName();
        generatedNotices.add(notice);
        return notice;
    }

    public List<String> getGeneratedNotices() {
        return Collections.unmodifiableList(generatedNotices);
    }

    public boolean hasNoticeFor(String accountId) {
        return generatedNotices.stream()
                .anyMatch(n -> n.contains("|" + accountId + "|"));
    }
}
