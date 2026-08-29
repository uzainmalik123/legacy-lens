package com.meridian.billing.collections;

import com.meridian.billing.model.Account;

import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

/**
 * Processes accounts into the collections workflow.
 * Enrollment triggers notice generation.
 */
public class CollectionsService {

    private final CollectionsNoticeService noticeService;
    private final List<String> enrolledAccountIds = new ArrayList<>();

    public CollectionsService(CollectionsNoticeService noticeService) {
        this.noticeService = noticeService;
    }

    /**
     * Enrolls an account in collections and triggers notice generation.
     *
     * @param account the account to enroll
     */
    public void enroll(Account account) {
        enrolledAccountIds.add(account.getAccountId());
        noticeService.generateNotice(account);
    }

    public List<String> getEnrolledAccountIds() {
        return Collections.unmodifiableList(enrolledAccountIds);
    }

    public boolean isEnrolled(String accountId) {
        return enrolledAccountIds.contains(accountId);
    }
}
