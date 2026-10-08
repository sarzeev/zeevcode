package com.project.zeevCode.controller;

import com.project.zeevCode.config.FirebaseAutoProvisioningFilter;
import com.project.zeevCode.config.SecurityConfig;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.exception.PaymentException;
import com.project.zeevCode.service.PaymentService;
import com.project.zeevCode.service.UserService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import java.nio.charset.StandardCharsets;
import java.util.Optional;
import java.util.UUID;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(PaymentController.class)
@TestPropertySource(properties = "razorpay.webhook-secret=test-webhook-secret")
@Import(SecurityConfig.class)
class PaymentControllerTest {

    private static final String WEBHOOK_SECRET = "test-webhook-secret";
    private static final UUID USER_ID = UUID.randomUUID();

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private PaymentService paymentService;

    @MockBean
    private UserService userService;

    @MockBean
    private FirebaseAutoProvisioningFilter firebaseAutoProvisioningFilter;

    @MockBean
    private JwtDecoder jwtDecoder;

    @BeforeEach
    void setupFilterPassThrough() throws Exception {
        doAnswer(invocation -> {
            jakarta.servlet.FilterChain chain = invocation.getArgument(2);
            chain.doFilter(invocation.getArgument(0), invocation.getArgument(1));
            return null;
        }).when(firebaseAutoProvisioningFilter).doFilter(any(), any(), any());
    }

    private User user() {
        return User.builder()
                .id(USER_ID)
                .username("tester")
                .email("tester@test.com")
                .build();
    }

    private String hmacHex(String payload) throws Exception {
        javax.crypto.Mac mac = javax.crypto.Mac.getInstance("HmacSHA256");
        mac.init(new javax.crypto.spec.SecretKeySpec(
                WEBHOOK_SECRET.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }

    @Test
    void webhookIsAccessibleWithoutJwt() throws Exception {
        String body = "{\"event\":\"payment.captured\",\"payment\":{\"entity\":{\"id\":\"pay_1\",\"order_id\":\"order_1\"}}}";
        mockMvc.perform(post("/api/payments/webhook")
                        .header("X-Razorpay-Signature", hmacHex(body))
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isOk());

        verify(paymentService).handleWebhook(eq("payment.captured"), any());
    }

    @Test
    void webhookMissingSignatureReturns401() throws Exception {
        String body = "{\"event\":\"payment.captured\"}";
        mockMvc.perform(post("/api/payments/webhook")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void webhookInvalidSignatureReturns401() throws Exception {
        String body = "{\"event\":\"payment.captured\"}";
        mockMvc.perform(post("/api/payments/webhook")
                        .header("X-Razorpay-Signature", "deadbeef")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(body))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void webhookMustMatchExactRawBodyBytes() throws Exception {
        byte[] signedBody = "{\"event\":\"payment.captured\"}".getBytes(StandardCharsets.UTF_8);
        String signature = hmacHex(new String(signedBody, StandardCharsets.UTF_8));

        mockMvc.perform(post("/api/payments/webhook")
                        .header("X-Razorpay-Signature", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"event\" : \"payment.captured\" }"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void statusRequiresAuthentication() throws Exception {
        mockMvc.perform(get("/api/payments/interview-prep/status"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void orderRequiresAuthentication() throws Exception {
        mockMvc.perform(post("/api/payments/interview-prep/order")
                        .contentType(MediaType.APPLICATION_JSON))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(paymentService);
    }

    @Test
    void statusReturnsEntitlementForAuthenticatedUser() throws Exception {
        when(userService.getUserByFirebaseUid(anyString())).thenReturn(Optional.of(user()));
        when(paymentService.status(eq(USER_ID), anyString()))
                .thenReturn(new PaymentService.StatusInfo(true, "INTERVIEW_PREP", 500, "INR", "₹5"));

        mockMvc.perform(get("/api/payments/interview-prep/status")
                        .with(SecurityMockMvcRequestPostProcessors.jwt()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.entitled").value(true))
                .andExpect(jsonPath("$.amount").value(500))
                .andExpect(jsonPath("$.product").value("INTERVIEW_PREP"));
    }

    @Test
    void verifyEndpointReturnsErrorOnPaymentException() throws Exception {
        when(userService.getUserByFirebaseUid(anyString())).thenReturn(Optional.of(user()));
        when(paymentService.verifyPayment(any(User.class), anyString(), anyString(), anyString()))
                .thenThrow(new PaymentException(HttpStatus.BAD_REQUEST, "Invalid payment signature"));

        mockMvc.perform(post("/api/payments/interview-prep/verify")
                        .with(SecurityMockMvcRequestPostProcessors.jwt())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"razorpay_order_id\":\"order_1\","
                                + "\"razorpay_payment_id\":\"pay_1\","
                                + "\"razorpay_signature\":\"bad\"}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Invalid payment signature"));
    }
}
