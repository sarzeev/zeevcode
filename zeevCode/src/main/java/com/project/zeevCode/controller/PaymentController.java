package com.project.zeevCode.controller;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.exception.PaymentException;
import com.project.zeevCode.service.PaymentService;
import com.project.zeevCode.service.UserService;
import com.project.zeevCode.util.RazorpaySigner;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

import java.nio.charset.StandardCharsets;
import java.util.Map;

@RestController
@RequestMapping("/api/payments")
@RequiredArgsConstructor
@Slf4j
public class PaymentController {

    private record VerifyRequest(
            String razorpay_order_id,
            String razorpay_payment_id,
            String razorpay_signature
    ) {}

    private final PaymentService paymentService;
    private final UserService userService;
    private final ObjectMapper objectMapper;

    @Value("${razorpay.webhook-secret:}")
    private String webhookSecret;

    @PostMapping("/interview-prep/order")
    public ResponseEntity<?> createOrder() {
        User user = requireUser();
        try {
            return ResponseEntity.ok(
                    paymentService.createOrder(user, PaymentService.PRODUCT_INTERVIEW_PREP));
        } catch (PaymentException e) {
            return error(e);
        }
    }

    @PostMapping("/interview-prep/verify")
    public ResponseEntity<?> verify(@RequestBody VerifyRequest request) {
        User user = requireUser();
        try {
            PaymentService.VerifyResult result = paymentService.verifyPayment(
                    user,
                    request.razorpay_order_id(),
                    request.razorpay_payment_id(),
                    request.razorpay_signature());
            return ResponseEntity.ok(Map.of(
                    "verified", result.verified(),
                    "entitled", result.entitled()));
        } catch (PaymentException e) {
            return error(e);
        }
    }

    @GetMapping("/interview-prep/status")
    public ResponseEntity<?> status() {
        User user = requireUser();
        try {
            return ResponseEntity.ok(paymentService.status(user.getId(), PaymentService.PRODUCT_INTERVIEW_PREP));
        } catch (PaymentException e) {
            return error(e);
        }
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-Razorpay-Signature", required = false) String signature,
            @RequestBody byte[] payload) {

        if (!verifyWebhookSignature(payload, signature)) {
            log.warn("Invalid Razorpay webhook signature received");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
        }

        try {
            JsonNode root = objectMapper.readTree(payload);
            paymentService.handleWebhook(root.path("event").asText(""), root);
        } catch (Exception e) {
            log.error("Razorpay webhook processing failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body("Processing failed");
        }
        return ResponseEntity.ok("OK");
    }

    private boolean verifyWebhookSignature(byte[] payload, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) return false;
        if (signature == null || signature.isBlank()) return false;
        try {
            String expected = RazorpaySigner.hmacSha256Hex(webhookSecret, payload);
            return RazorpaySigner.constantTimeEqualsHex(expected, signature);
        } catch (Exception e) {
            log.error("Error verifying webhook signature: {}", e.getMessage());
            return false;
        }
    }

    private User requireUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        if (authentication == null || !(authentication.getPrincipal() instanceof Jwt jwt)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Authentication required");
        }
        return userService.getUserByFirebaseUid(jwt.getSubject())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
    }

    private ResponseEntity<Map<String, String>> error(PaymentException e) {
        return ResponseEntity.status(e.getStatus()).body(Map.of("error", e.getMessage()));
    }
}
