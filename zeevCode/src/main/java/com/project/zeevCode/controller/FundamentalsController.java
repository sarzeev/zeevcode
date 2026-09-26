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
import java.security.MessageDigest;
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
            @RequestBody byte[] payload) {

        if (!verifyWebhookSignature(payload, signature)) {
            log.warn("Invalid webhook signature received");
            return ResponseEntity.status(HttpStatus.UNAUTHORIZED).body("Invalid signature");
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

    private boolean verifyWebhookSignature(byte[] payload, String signature) {
        if (webhookSecret == null || webhookSecret.isBlank()) return false;
        if (signature == null || !signature.startsWith("sha256=")) return false;
        try {
            byte[] actual = hexToBytes(signature.substring("sha256=".length()));
            if (actual == null) return false;

            Mac mac = Mac.getInstance("HmacSHA256");
            SecretKeySpec key = new SecretKeySpec(
                    webhookSecret.getBytes(StandardCharsets.UTF_8), "HmacSHA256");
            mac.init(key);
            byte[] expected = mac.doFinal(payload);
            return MessageDigest.isEqual(expected, actual);
        } catch (Exception e) {
            log.error("Error verifying webhook signature: {}", e.getMessage());
            return false;
        }
    }

    private byte[] hexToBytes(String hex) {
        if (hex == null || (hex.length() % 2) != 0) return null;
        byte[] bytes = new byte[hex.length() / 2];
        for (int i = 0; i < hex.length(); i += 2) {
            int hi = Character.digit(hex.charAt(i), 16);
            int lo = Character.digit(hex.charAt(i + 1), 16);
            if (hi < 0 || lo < 0) return null;
            bytes[i / 2] = (byte) ((hi << 4) + lo);
        }
        return bytes;
    }
}
