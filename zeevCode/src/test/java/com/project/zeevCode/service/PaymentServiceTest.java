package com.project.zeevCode.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.zeevCode.entity.Entitlement;
import com.project.zeevCode.entity.Payment;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.exception.PaymentException;
import com.project.zeevCode.repository.EntitlementRepository;
import com.project.zeevCode.repository.PaymentRepository;
import com.project.zeevCode.util.RazorpaySigner;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class PaymentServiceTest {

    private static final String KEY_ID = "rzp_test_key";
    private static final String KEY_SECRET = "rzp_test_secret";
    private static final String ORDER_ID = "order_123";
    private static final String PAYMENT_ID = "pay_abc";

    private final UUID userId = UUID.randomUUID();
    private final UUID otherUserId = UUID.randomUUID();

    @Mock
    private PaymentRepository paymentRepository;

    @Mock
    private EntitlementRepository entitlementRepository;

    @Mock
    private RestTemplate restTemplate;

    private PaymentService paymentService;

    @BeforeEach
    void setUp() {
        paymentService = new PaymentService(paymentRepository, entitlementRepository, restTemplate, new ObjectMapper());
        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", KEY_ID);
        ReflectionTestUtils.setField(paymentService, "razorpayKeySecret", KEY_SECRET);
    }

    private Payment createdPayment(UUID owner, long amount) {
        return Payment.builder()
                .userId(owner)
                .productKey(PaymentService.PRODUCT_INTERVIEW_PREP)
                .razorpayOrderId(ORDER_ID)
                .amount(amount)
                .currency("INR")
                .status(Payment.Status.CREATED)
                .build();
    }

    private User user(UUID id) {
        return User.builder().id(id).username("tester" + id).email("t" + id + "@test.com").build();
    }

    private String signatureFor(String paymentId) {
        return RazorpaySigner.hmacSha256Hex(KEY_SECRET, ORDER_ID + "|" + paymentId);
    }

    @Test
    void statusReturnsFalseWhenNoEntitlement() {
        when(entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, PaymentService.PRODUCT_INTERVIEW_PREP, Entitlement.Status.ACTIVE)).thenReturn(false);

        PaymentService.StatusInfo info = paymentService.status(userId, PaymentService.PRODUCT_INTERVIEW_PREP);

        assertThat(info.entitled()).isFalse();
        assertThat(info.amount()).isEqualTo(500L);
        assertThat(info.currency()).isEqualTo("INR");
        assertThat(info.priceLabel()).isEqualTo("₹5");
    }

    @Test
    void statusReturnsTrueWhenEntitled() {
        when(entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, PaymentService.PRODUCT_INTERVIEW_PREP, Entitlement.Status.ACTIVE)).thenReturn(true);

        PaymentService.StatusInfo info = paymentService.status(userId, PaymentService.PRODUCT_INTERVIEW_PREP);

        assertThat(info.entitled()).isTrue();
    }

    @Test
    @SuppressWarnings("unchecked")
    void createOrderSendsFixedAmountOf500Paise() {
        when(restTemplate.exchange(eq("https://api.razorpay.com/v1/orders"), eq(HttpMethod.POST),
                any(HttpEntity.class), eq(String.class)))
                .thenReturn(ResponseEntity.ok("{\"id\":\"" + ORDER_ID + "\",\"amount\":500,\"currency\":\"INR\"}"));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentService.OrderInfo result =
                paymentService.createOrder(user(userId), PaymentService.PRODUCT_INTERVIEW_PREP);

        ArgumentCaptor<HttpEntity<Map<String, Object>>> captor = ArgumentCaptor.forClass(HttpEntity.class);
        verify(restTemplate).exchange(eq("https://api.razorpay.com/v1/orders"), eq(HttpMethod.POST),
                captor.capture(), eq(String.class));
        Map<String, Object> body = captor.getValue().getBody();
        assertThat(body).isNotNull();
        assertThat(body.get("amount")).isEqualTo(500L);
        assertThat(body.get("currency")).isEqualTo("INR");

        assertThat(result.orderId()).isEqualTo(ORDER_ID);
        assertThat(result.keyId()).isEqualTo(KEY_ID);
        assertThat(result.amount()).isEqualTo(500L);

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getStatus()).isEqualTo(Payment.Status.CREATED);
        assertThat(paymentCaptor.getValue().getUserId()).isEqualTo(userId);
    }

    @Test
    void createOrderFailsWhenKeysMissing() {
        ReflectionTestUtils.setField(paymentService, "razorpayKeyId", "");
        ReflectionTestUtils.setField(paymentService, "razorpayKeySecret", "");

        assertThatThrownBy(() ->
                paymentService.createOrder(user(userId), PaymentService.PRODUCT_INTERVIEW_PREP))
                .isInstanceOf(PaymentException.class)
                .extracting(e -> ((PaymentException) e).getStatus())
                .isEqualTo(HttpStatus.SERVICE_UNAVAILABLE);
        verifyNoInteractions(restTemplate);
    }

    @Test
    void verifyPaymentWithValidSignatureGrantsEntitlement() {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(userId, 500L)));
        when(entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, PaymentService.PRODUCT_INTERVIEW_PREP, Entitlement.Status.ACTIVE)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(entitlementRepository.save(any(Entitlement.class))).thenAnswer(inv -> inv.getArgument(0));

        PaymentService.VerifyResult result =
                paymentService.verifyPayment(user(userId), ORDER_ID, PAYMENT_ID, signatureFor(PAYMENT_ID));

        assertThat(result.verified()).isTrue();
        assertThat(result.entitled()).isTrue();

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getStatus()).isEqualTo(Payment.Status.VERIFIED);
        assertThat(paymentCaptor.getValue().getRazorpayPaymentId()).isEqualTo(PAYMENT_ID);
        verify(entitlementRepository).save(any(Entitlement.class));
    }

    @Test
    void verifyPaymentRejectsInvalidSignature() {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(userId, 500L)));
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));

        assertThatThrownBy(() ->
                paymentService.verifyPayment(user(userId), ORDER_ID, PAYMENT_ID, "deadbeef"))
                .isInstanceOf(PaymentException.class)
                .extracting(e -> ((PaymentException) e).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getStatus()).isEqualTo(Payment.Status.FAILED);
        verify(entitlementRepository, never()).save(any(Entitlement.class));
    }

    @Test
    void verifyPaymentRejectsOrderFromAnotherUser() {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(otherUserId, 500L)));

        assertThatThrownBy(() ->
                paymentService.verifyPayment(user(userId), ORDER_ID, PAYMENT_ID, signatureFor(PAYMENT_ID)))
                .isInstanceOf(PaymentException.class)
                .extracting(e -> ((PaymentException) e).getStatus())
                .isEqualTo(HttpStatus.FORBIDDEN);
        verify(entitlementRepository, never()).save(any(Entitlement.class));
    }

    @Test
    void verifyPaymentRejectsPaymentAlreadyUsedForAnotherOrder() {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(userId, 500L)));
        when(paymentRepository.existsByRazorpayPaymentId(PAYMENT_ID)).thenReturn(true);

        assertThatThrownBy(() ->
                paymentService.verifyPayment(user(userId), ORDER_ID, PAYMENT_ID, signatureFor(PAYMENT_ID)))
                .isInstanceOf(PaymentException.class)
                .extracting(e -> ((PaymentException) e).getStatus())
                .isEqualTo(HttpStatus.BAD_REQUEST);
        verify(entitlementRepository, never()).save(any(Entitlement.class));
    }

    @Test
    void verifyPaymentIsIdempotentWhenAlreadyVerified() {
        Payment verified = createdPayment(userId, 500L);
        verified.setStatus(Payment.Status.VERIFIED);
        verified.setRazorpayPaymentId(PAYMENT_ID);
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID)).thenReturn(Optional.of(verified));
        when(entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, PaymentService.PRODUCT_INTERVIEW_PREP, Entitlement.Status.ACTIVE)).thenReturn(true);

        PaymentService.VerifyResult result =
                paymentService.verifyPayment(user(userId), ORDER_ID, PAYMENT_ID, signatureFor(PAYMENT_ID));

        assertThat(result.verified()).isTrue();
        verify(paymentRepository, never()).save(any(Payment.class));
        verify(entitlementRepository, never()).save(any(Entitlement.class));
    }

    @Test
    void webhookPaymentCapturedGrantsEntitlement() throws Exception {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(userId, 500L)));
        when(entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, PaymentService.PRODUCT_INTERVIEW_PREP, Entitlement.Status.ACTIVE)).thenReturn(false);
        when(paymentRepository.save(any(Payment.class))).thenAnswer(inv -> inv.getArgument(0));
        when(entitlementRepository.save(any(Entitlement.class))).thenAnswer(inv -> inv.getArgument(0));

        String payload = "{\"event\":\"payment.captured\",\"payment\":{\"entity\":{\"id\":\""
                + PAYMENT_ID + "\",\"order_id\":\"" + ORDER_ID + "\"}}}";
        paymentService.handleWebhook("payment.captured",
                new ObjectMapper().readTree(payload));

        ArgumentCaptor<Payment> paymentCaptor = ArgumentCaptor.forClass(Payment.class);
        verify(paymentRepository).save(paymentCaptor.capture());
        assertThat(paymentCaptor.getValue().getStatus()).isEqualTo(Payment.Status.VERIFIED);
        verify(entitlementRepository).save(any(Entitlement.class));
    }

    @Test
    void webhookIsIdempotentWhenAlreadyVerified() throws Exception {
        Payment verified = createdPayment(userId, 500L);
        verified.setStatus(Payment.Status.VERIFIED);
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID)).thenReturn(Optional.of(verified));

        String payload = "{\"event\":\"payment.captured\",\"payment\":{\"entity\":{\"id\":\""
                + PAYMENT_ID + "\",\"order_id\":\"" + ORDER_ID + "\"}}}";
        paymentService.handleWebhook("payment.captured", new ObjectMapper().readTree(payload));

        verify(paymentRepository, never()).save(any(Payment.class));
        verify(entitlementRepository, never()).save(any(Entitlement.class));
    }

    @Test
    void webhookIgnoresUnknownOrder() throws Exception {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID)).thenReturn(Optional.empty());

        String payload = "{\"event\":\"order.paid\",\"entity\":{\"id\":\"" + ORDER_ID + "\"}}";
        paymentService.handleWebhook("order.paid", new ObjectMapper().readTree(payload));

        verify(paymentRepository, never()).save(any(Payment.class));
        verifyNoInteractions(entitlementRepository);
    }

    @Test
    void webhookIgnoresAmountMismatch() throws Exception {
        when(paymentRepository.findByRazorpayOrderId(ORDER_ID))
                .thenReturn(Optional.of(createdPayment(userId, 999L)));

        String payload = "{\"event\":\"order.paid\",\"entity\":{\"id\":\"" + ORDER_ID + "\"}}";
        paymentService.handleWebhook("order.paid", new ObjectMapper().readTree(payload));

        verify(paymentRepository, never()).save(any(Payment.class));
        verifyNoInteractions(entitlementRepository);
    }
}
