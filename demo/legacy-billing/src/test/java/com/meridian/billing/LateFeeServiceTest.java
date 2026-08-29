package com.meridian.billing;

import com.meridian.billing.billing.BillingConstants;
import com.meridian.billing.billing.LateFeeService;
import com.meridian.billing.model.Account;
import com.meridian.billing.model.Customer;
import com.meridian.billing.model.Loan;
import com.meridian.billing.policy.GracePeriodPolicy;
import com.meridian.billing.policy.HardshipPolicy;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Tests for LateFeeService.
 */
class LateFeeServiceTest {

    private LateFeeService lateFeeService;
    private GracePeriodPolicy gracePeriodPolicy;
    private HardshipPolicy hardshipPolicy;

    @BeforeEach
    void setUp() {
        gracePeriodPolicy = new GracePeriodPolicy();
        hardshipPolicy = new HardshipPolicy();
        lateFeeService = new LateFeeService(gracePeriodPolicy, hardshipPolicy);
    }

    private Loan makeLoan(String balance) {
        return new Loan("LN-001", new BigDecimal(balance), new BigDecimal(balance),
                BillingConstants.MONTHLY_INTEREST_RATE);
    }

    private Account makeAccount(String balance, boolean graceEligible, boolean hardship) {
        Customer customer = new Customer("C-001", "Test Customer", hardship);
        Loan loan = makeLoan(balance);
        return new Account("ACCT-001", customer, loan, new BigDecimal(balance),
                graceEligible, false);
    }

    // zero balance → no late fee
    @Test
    void zeroBalanceProducesNoLateFee() {
        Account account = makeAccount("0.00", false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 15);
        assertEquals(0, BigDecimal.ZERO.compareTo(fee));
    }

    // negative (credit) balance → no late fee
    @Test
    void creditBalanceProducesNoLateFee() {
        Customer customer = new Customer("C-002", "Credit Customer", false);
        Loan loan = new Loan("LN-002", new BigDecimal("500.00"), new BigDecimal("-100.00"),
                BillingConstants.MONTHLY_INTEREST_RATE);
        Account account = new Account("ACCT-002", customer, loan, new BigDecimal("-100.00"),
                false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 10);
        assertEquals(0, BigDecimal.ZERO.compareTo(fee));
    }

    // hardship plan caps the late fee at $25.00
    // balance=4000.00, LATE_FEE_RATE=0.00823 → raw fee=32.92, capped to 25.00
    @Test
    void hardshipPlanCapsLateFeeAtTwentyFive() {
        Customer customer = new Customer("C-003", "Hardship Customer", true);
        Loan loan = new Loan("LN-003", new BigDecimal("4000.00"), new BigDecimal("4000.00"),
                BillingConstants.MONTHLY_INTEREST_RATE);
        Account account = new Account("ACCT-003", customer, loan, new BigDecimal("4000.00"),
                false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 10);
        assertTrue(fee.compareTo(BillingConstants.HARDSHIP_FEE_CAP) <= 0,
                "Hardship cap should limit fee to 25.00 or less");
        assertEquals(0, new BigDecimal("25.00").compareTo(fee),
                "Fee should be exactly the hardship cap");
    }

    // grace-eligible account, 7 days late → zero effective days → zero late fee
    @Test
    void graceEligibleAccountSevenDaysLateProducesZeroFee() {
        Account account = makeAccount("1000.00", true, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 7);
        assertEquals(0, BigDecimal.ZERO.compareTo(fee),
                "Grace-eligible account at exactly 7 days should have zero effective days");
    }

    // non-grace-eligible account, 7 days late → positive fee
    @Test
    void nonGraceEligibleAccountSevenDaysLateProducesPositiveFee() {
        Account account = makeAccount("1000.00", false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 7);
        assertTrue(fee.compareTo(BigDecimal.ZERO) > 0,
                "Non-grace-eligible account should have a positive late fee at 7 days");
    }

    // balance=1000.00, rate=0.00823 → raw fee=8.23, no penalty (days<=30)
    @Test
    void standardLateFeeCalculation() {
        Account account = makeAccount("1000.00", false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 15);
        assertEquals(0, new BigDecimal("8.23").compareTo(fee),
                "Standard fee: 1000.00 * 0.00823 = 8.23");
    }

    // balance=1000.00, rate=0.00823 → base=8.23 + penalty=15.00 → 23.23
    @Test
    void penaltyAddedWhenMoreThanThirtyDaysLate() {
        Account account = makeAccount("1000.00", false, false);
        BigDecimal fee = lateFeeService.calculateLateFee(account, 45);
        assertEquals(0, new BigDecimal("23.23").compareTo(fee),
                "Fee with penalty: 8.23 + 15.00 = 23.23");
    }
}
