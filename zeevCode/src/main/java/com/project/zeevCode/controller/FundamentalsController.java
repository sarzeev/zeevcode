package com.project.zeevCode.controller;

import com.project.zeevCode.service.FundamentalsService;
import com.project.zeevCode.service.GitHubRepoSyncService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import java.nio.charset.StandardCharsets;
import java.util.*;
import java.util.concurrent.CompletableFuture;

@RestController
@RequestMapping("/api/fundamentals")
public class FundamentalsController {

    private static final Logger log = LoggerFactory.getLogger(FundamentalsController.class);

    private final FundamentalsService fundamentalsService;
    private final GitHubRepoSyncService gitHubRepoSyncService;

    @Value("${github.webhook.secret:}")
    private String webhookSecret;

    @Autowired
    public FundamentalsController(
            FundamentalsService fundamentalsService,
            GitHubRepoSyncService gitHubRepoSyncService) {
        this.fundamentalsService = fundamentalsService;
        this.gitHubRepoSyncService = gitHubRepoSyncService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> getDashboard(
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(fundamentalsService.getDashboard(userId));
    }

    @GetMapping("/subjects/{slug}")
    public ResponseEntity<Map<String, Object>> getSubjectDetails(
            @PathVariable String slug,
            @RequestParam(required = false) UUID userId) {
        try {
            return ResponseEntity.ok(fundamentalsService.getSubjectDetails(slug, userId));
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/chapter-content")
    public ResponseEntity<Map<String, Object>> getChapterContent(
            @RequestParam String subjectSlug,
            @RequestParam String chapterPath) {
        try {
            String html = fundamentalsService.getChapterContent(subjectSlug, chapterPath);
            Map<String, Object> response = new LinkedHashMap<>();
            response.put("html", html);
            response.put("chapterPath", chapterPath);
            return ResponseEntity.ok(response);
        } catch (NoSuchElementException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @PostMapping("/chapters/complete")
    public ResponseEntity<Map<String, Object>> markChapterComplete(
            @RequestBody Map<String, String> request) {
        try {
            UUID userId = UUID.fromString(request.get("userId"));
            String subjectSlug = request.get("subjectSlug");
            String chapterPath = request.get("chapterPath");
            fundamentalsService.markChapterCompleted(userId, subjectSlug, chapterPath);
            return ResponseEntity.ok(Map.of("message", "Chapter marked as completed"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/progress")
    public ResponseEntity<Map<String, Object>> getOverallProgress(
            @RequestParam(required = false) UUID userId) {
        return ResponseEntity.ok(fundamentalsService.getOverallProgress(userId));
    }

    @PostMapping("/webhook")
    public ResponseEntity<String> handleWebhook(
            @RequestHeader(value = "X-Hub-Signature-256", required = false) String signature,
            @RequestHeader(value = "X-GitHub-Event", required = false) String event,
            @RequestBody String payload) {

        if (webhookSecret != null && !webhookSecret.isBlank()) {
            if (!verifyWebhookSignature(payload, signature)) {
                log.warn("Invalid webhook signature received");
                return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
            }
        }

        if ("push".equals(event)) {
            log.info("Received GitHub push webhook, triggering async repo sync");
            CompletableFuture.runAsync(() -> {
                try {
                    gitHubRepoSyncService.syncRepoTree();
                } catch (Exception e) {
                    log.error("Webhook-triggered sync failed: {}", e.getMessage(), e);
                }
            });
        }

        return ResponseEntity.ok("OK");
    }

    @PostMapping("/admin/sync")
    public ResponseEntity<Map<String, String>> manualSync() {
        log.info("Manual admin sync triggered");
        CompletableFuture.runAsync(() -> {
            try {
                gitHubRepoSyncService.syncRepoTree();
            } catch (Exception e) {
                log.error("Manual sync failed: {}", e.getMessage(), e);
            }
        });
        return ResponseEntity.ok(Map.of("message", "Sync started in background"));
    }

    private boolean verifyWebhookSignature(String payload, String signature) {
        if (signature == null || !signature.startsWith("sha256=")) return false;
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec key = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(key);
            byte[] hmac = mac.doFinal(payload.getBytes(StandardCharsets.UTF_8));
            String expected = "sha256=" + bytesToHex(hmac);
            return expected.equals(signature);
        } catch (Exception e) {
            log.error("Error verifying webhook signature: {}", e.getMessage());
            return false;
        }
    }

    private String bytesToHex(byte[] bytes) {
        StringBuilder sb = new StringBuilder();
        for (byte b : bytes) {
            sb.append(String.format("%02x", b));
        }
        return sb.toString();
    }
}
