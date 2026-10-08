package com.project.zeevCode.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.zeevCode.entity.Entitlement;
import com.project.zeevCode.entity.Payment;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.exception.PaymentException;
import com.project.zeevCode.repository.EntitlementRepository;
import com.project.zeevCode.repository.PaymentRepository;
import com.project.zeevCode.util.RazorpaySigner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.client.RestTemplate;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.util.Base64;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

@Service
@RequiredArgsConstructor
@Slf4j
public class PaymentService {

    public static final String PRODUCT_INTERVIEW_PREP = "INTERVIEW_PREP";
    private static final String RAZORPAY_ORDERS_URL = "https://api.razorpay.com/v1/orders";

    public record ProductConfig(long amountInPaise, String currency, String priceLabel) {}

    public record OrderInfo(String orderId, String keyId, long amount, String currency, String priceLabel) {}

    public record StatusInfo(boolean entitled, String product, long amount, String currency, String priceLabel) {}

    public record VerifyResult(boolean verified, boolean entitled, String reason) {}

    private static final Map<String, ProductConfig> PRODUCTS = Map.of(
            PRODUCT_INTERVIEW_PREP, new ProductConfig(500L, "INR", "₹5")
    );

    private final PaymentRepository paymentRepository;
    private final EntitlementRepository entitlementRepository;
    private final RestTemplate restTemplate;
    private final ObjectMapper objectMapper;

    @Value("${razorpay.key-id:}")
    private String razorpayKeyId;

    @Value("${razorpay.key-secret:}")
    private String razorpayKeySecret;

    public ProductConfig requireProduct(String productKey) {
        ProductConfig config = PRODUCTS.get(productKey);
        if (config == null) {
            throw new PaymentException(HttpStatus.NOT_FOUND, "Unknown product: " + productKey);
        }
        return config;
    }

    public StatusInfo status(UUID userId, String productKey) {
        ProductConfig config = requireProduct(productKey);
        boolean entitled = entitlementRepository
                .existsByUserIdAndProductKeyAndStatus(userId, productKey, Entitlement.Status.ACTIVE);
        return new StatusInfo(entitled, productKey, config.amountInPaise(), config.currency(), config.priceLabel());
    }

    public OrderInfo createOrder(User user, String productKey) {
        requirePaymentConfig();
        ProductConfig config = requireProduct(productKey);

        Map<String, Object> body = new LinkedHashMap<>();
        body.put("amount", config.amountInPaise());
        body.put("currency", config.currency());
        body.put("receipt", "ip_" + System.currentTimeMillis());
        body.put("notes", Map.of(
                "user_id", user.getId().toString(),
                "product_key", productKey
        ));

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.APPLICATION_JSON);
        headers.set("Authorization",
                "Basic " + Base64.getEncoder().encodeToString(
                        (razorpayKeyId + ":" + razorpayKeySecret).getBytes(StandardCharsets.UTF_8)));

        try {
            ResponseEntity<String> response = restTemplate.exchange(
                    RAZORPAY_ORDERS_URL, HttpMethod.POST, new HttpEntity<>(body, headers), String.class);
            JsonNode node = objectMapper.readTree(response.getBody());
            String orderId = node.path("id").asText(null);
            if (orderId == null || orderId.isBlank()) {
                log.error("Razorpay order creation returned no id: {}", response.getBody());
                throw new PaymentException(HttpStatus.BAD_GATEWAY, "Failed to create payment order");
            }

            Payment payment = Payment.builder()
                    .userId(user.getId())
                    .productKey(productKey)
                    .razorpayOrderId(orderId)
                    .amount(config.amountInPaise())
                    .currency(config.currency())
                    .status(Payment.Status.CREATED)
                    .build();
            paymentRepository.save(payment);

            return new OrderInfo(orderId, razorpayKeyId, config.amountInPaise(), config.currency(), config.priceLabel());
        } catch (PaymentException e) {
            throw e;
        } catch (Exception e) {
            log.error("Razorpay order creation failed for user {}: {}", user.getId(), e.getMessage());
            throw new PaymentException(HttpStatus.BAD_GATEWAY, "Failed to create payment order");
        }
    }

    @Transactional
    public VerifyResult verifyPayment(User user, String orderId, String paymentId, String signature) {
        if (orderId == null || orderId.isBlank()
                || paymentId == null || paymentId.isBlank()
                || signature == null || signature.isBlank()) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "Missing payment details");
        }
        requirePaymentConfig();

        Payment payment = paymentRepository.findByRazorpayOrderId(orderId)
                .orElseThrow(() -> new PaymentException(HttpStatus.NOT_FOUND, "Order not found"));
        if (!payment.getUserId().equals(user.getId())) {
            throw new PaymentException(HttpStatus.FORBIDDEN, "Order does not belong to this user");
        }

        ProductConfig config = requireProduct(payment.getProductKey());
        if (payment.getAmount() != config.amountInPaise()
                || !payment.getCurrency().equalsIgnoreCase(config.currency())) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "Order amount does not match product price");
        }

        String expected = RazorpaySigner.hmacSha256Hex(razorpayKeySecret, orderId + "|" + paymentId);
        if (!RazorpaySigner.constantTimeEqualsHex(expected, signature)) {
            log.warn("Invalid payment signature for order {} (user {})", orderId, user.getId());
            markFailed(payment, "Invalid payment signature");
            throw new PaymentException(HttpStatus.BAD_REQUEST, "Invalid payment signature");
        }

        if (payment.getRazorpayPaymentId() == null
                && paymentRepository.existsByRazorpayPaymentId(paymentId)) {
            throw new PaymentException(HttpStatus.BAD_REQUEST, "Payment already used for another order");
        }

        if (payment.getStatus() != Payment.Status.VERIFIED) {
            payment.setRazorpayPaymentId(paymentId);
            payment.setStatus(Payment.Status.VERIFIED);
            payment.setVerifiedAt(LocalDateTime.now());
            payment.setFailureReason(null);
            paymentRepository.save(payment);
        }

        grantEntitlement(payment.getUserId(), payment.getProductKey());
        return new VerifyResult(true, true, null);
    }

    @Transactional
    public void handleWebhook(String event, JsonNode payload) {
        String orderId;
        String paymentId = null;
        switch (event) {
            case "payment.captured" -> {
                JsonNode entity = payload.path("payment").path("entity");
                orderId = entity.path("order_id").asText(null);
                paymentId = entity.path("id").asText(null);
            }
            case "order.paid" -> {
                orderId = payload.path("entity").path("id").asText(null);
            }
            default -> {
                return;
            }
        }
        if (orderId == null || orderId.isBlank()) {
            return;
        }

        Payment payment = paymentRepository.findByRazorpayOrderId(orderId).orElse(null);
        if (payment == null) {
            log.debug("Webhook for unknown order {}, ignoring", orderId);
            return;
        }
        ProductConfig config = PRODUCTS.get(payment.getProductKey());
        if (config == null || payment.getAmount() != config.amountInPaise()
                || !payment.getCurrency().equalsIgnoreCase(config.currency())) {
            log.warn("Webhook order {} amount mismatch, ignoring", orderId);
            return;
        }
        if (payment.getStatus() == Payment.Status.VERIFIED) {
            return;
        }
        if (paymentId != null && !paymentId.isBlank()
                && payment.getRazorpayPaymentId() == null
                && paymentRepository.existsByRazorpayPaymentId(paymentId)) {
            log.warn("Webhook payment_id {} already used by another order, ignoring", paymentId);
            return;
        }

        if (paymentId != null && !paymentId.isBlank()) {
            payment.setRazorpayPaymentId(paymentId);
        }
        payment.setStatus(Payment.Status.VERIFIED);
        payment.setVerifiedAt(LocalDateTime.now());
        payment.setFailureReason(null);
        paymentRepository.save(payment);

        grantEntitlement(payment.getUserId(), payment.getProductKey());
        log.info("Entitlement granted via webhook: user {} product {} order {}",
                payment.getUserId(), payment.getProductKey(), orderId);
    }

    private void grantEntitlement(UUID userId, String productKey) {
        if (entitlementRepository.existsByUserIdAndProductKeyAndStatus(
                userId, productKey, Entitlement.Status.ACTIVE)) {
            return;
        }
        try {
            entitlementRepository.save(Entitlement.builder()
                    .userId(userId)
                    .productKey(productKey)
                    .status(Entitlement.Status.ACTIVE)
                    .build());
        } catch (DataIntegrityViolationException e) {
            log.info("Entitlement already exists for user {} product {}, skipping", userId, productKey);
        }
    }

    private void markFailed(Payment payment, String reason) {
        payment.setStatus(Payment.Status.FAILED);
        payment.setFailureReason(reason);
        paymentRepository.save(payment);
    }

    private void requirePaymentConfig() {
        if (razorpayKeyId == null || razorpayKeyId.isBlank()
                || razorpayKeySecret == null || razorpayKeySecret.isBlank()) {
            throw new PaymentException(HttpStatus.SERVICE_UNAVAILABLE, "Payment service is not configured");
        }
    }
}
