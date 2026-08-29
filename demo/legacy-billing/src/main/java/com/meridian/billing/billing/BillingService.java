package com.meridian.billing.billing;

import com.meridian.billing.model.Account;
import com.meridian.billing.model.BillingResult;
import com.meridian.billing.statement.AccountClosureService;
import com.meridian.billing.statement.MonthlyStatementService;
import com.meridian.billing.policy.CollectionsPolicy;
import com.meridian.billing.collections.CollectionsService;
import com.meridian.billing.util.MoneyUtils;

import java.math.BigDecimal;

/**
 * Orchestrates a complete monthly billing cycle for one account.
 * Computes fees and interest, produces a BillingResult, and dispatches
 * to downstream consumers.
 */
public class BillingService {

    private final LateFeeService lateFeeService;
    private final InterestCalculator interestCalculator;
    private final MonthlyStatementService statementService;
    private final AccountClosureService closureService;
    private final CollectionsPolicy collectionsPolicy;
    private final CollectionsService collectionsService;

    public BillingService(LateFeeService lateFeeService,
                          InterestCalculator interestCalculator,
                          MonthlyStatementService statementService,
                          AccountClosureService closureService,
                          CollectionsPolicy collectionsPolicy,
                          CollectionsService collectionsService) {
        this.lateFeeService = lateFeeService;
        this.interestCalculator = interestCalculator;
        this.statementService = statementService;
        this.closureService = closureService;
        this.collectionsPolicy = collectionsPolicy;
        this.collectionsService = collectionsService;
    }

    /**
     * Runs a billing cycle for the given account.
     *
     * @param account     the account to bill
     * @param daysLate    raw days past due (0 if on time)
     * @return the billing result for this cycle
     */
    public BillingResult runCycle(Account account, int daysLate) {
        BigDecimal lateFee = lateFeeService.calculateLateFee(account, daysLate);
        BigDecimal interest = MoneyUtils.roundInterest(
                interestCalculator.calculateMonthlyInterest(account.getLoan()));

        BillingResult result = new BillingResult(account, lateFee, interest);

        statementService.generateStatement(account, result);

        if (account.isClosed()) {
            closureService.process(account, result);
        }

        if (collectionsPolicy.isEligible(account, result)) {
            collectionsService.enroll(account);
        }

        return result;
    }
}
