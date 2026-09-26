package com.project.zeevCode.controller;

import com.project.zeevCode.service.FundamentalsService;
import com.project.zeevCode.service.GitHubRepoSyncService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.web.servlet.MockMvc;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;

import static org.mockito.Mockito.timeout;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(FundamentalsController.class)
@AutoConfigureMockMvc(addFilters = false)
@TestPropertySource(properties = "github.webhook.secret=test-secret")
class FundamentalsControllerWebhookTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private FundamentalsService fundamentalsService;

    @MockBean
    private GitHubRepoSyncService gitHubRepoSyncService;

    @Test
    void missingSignatureReturns401() throws Exception {
        mockMvc.perform(post("/api/fundamentals/webhook")
                        .header("X-GitHub-Event", "push")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ref\":\"refs/heads/main\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gitHubRepoSyncService);
    }

    @Test
    void invalidSignatureReturns401() throws Exception {
        mockMvc.perform(post("/api/fundamentals/webhook")
                        .header("X-GitHub-Event", "push")
                        .header("X-Hub-Signature-256", "sha256=deadbeef")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{\"ref\":\"refs/heads/main\"}"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gitHubRepoSyncService);
    }

    @Test
    void signatureMustMatchExactRawBodyBytes() throws Exception {
        byte[] signedBody = "{\"ref\":\"refs/heads/main\"}".getBytes(StandardCharsets.UTF_8);
        String signature = hmacSignature("test-secret", signedBody);

        mockMvc.perform(post("/api/fundamentals/webhook")
                        .header("X-GitHub-Event", "push")
                        .header("X-Hub-Signature-256", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{ \"ref\" : \"refs/heads/main\" }"))
                .andExpect(status().isUnauthorized());

        verifyNoInteractions(gitHubRepoSyncService);
    }

    @Test
    void validPushSignatureTriggersBackgroundSync() throws Exception {
        byte[] payload = "{\"ref\":\"refs/heads/main\"}".getBytes(StandardCharsets.UTF_8);
        String signature = hmacSignature("test-secret", payload);

        mockMvc.perform(post("/api/fundamentals/webhook")
                        .header("X-GitHub-Event", "push")
                        .header("X-Hub-Signature-256", signature)
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(payload))
                .andExpect(status().isOk());

        verify(gitHubRepoSyncService, timeout(1000)).syncRepoTree();
    }

    private String hmacSignature(String secret, byte[] payload) throws Exception {
        Mac mac = Mac.getInstance("HmacSHA256");
        mac.init(new SecretKeySpec(secret.getBytes(StandardCharsets.UTF_8), "HmacSHA256"));
        byte[] bytes = mac.doFinal(payload);
        StringBuilder sb = new StringBuilder("sha256=");
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
