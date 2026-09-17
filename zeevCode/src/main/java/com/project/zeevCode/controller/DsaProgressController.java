package com.project.zeevCode.controller;

import com.project.zeevCode.dto.UserProgressResponse;
import com.project.zeevCode.entity.UserProblemProgress;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.enums.ProblemStatus;
import com.project.zeevCode.service.UserProblemProgressService;
import com.project.zeevCode.service.UserService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/dsa/progress")
@RequiredArgsConstructor
public class DsaProgressController {

    private final UserProblemProgressService progressService;
    private final UserService userService;

    private UUID getUserId(Authentication auth) {
        if (auth == null || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new RuntimeException("Unauthorized");
        }
        User user = userService.getUserByFirebaseUid(jwt.getSubject())
                .orElseThrow(() -> new RuntimeException("User not found"));
        return user.getId();
    }

    @GetMapping
    public ResponseEntity<List<UserProgressResponse>> getMyProgress(Authentication auth) {
        UUID userId = getUserId(auth);
        List<UserProgressResponse> resp = progressService.getUserProgress(userId).stream()
                .map(this::mapToDto)
                .collect(Collectors.toList());
        return ResponseEntity.ok(resp);
    }

    @GetMapping("/{problemId}")
    public ResponseEntity<UserProgressResponse> getProblemProgress(@PathVariable UUID problemId, Authentication auth) {
        UUID userId = getUserId(auth);
        UserProblemProgress p = progressService.getOrCreateProgress(userId, problemId);
        return ResponseEntity.ok(mapToDto(p));
    }

    @PostMapping("/{problemId}/status")
    public ResponseEntity<UserProgressResponse> updateStatus(@PathVariable UUID problemId, @RequestBody Map<String, String> body, Authentication auth) {
        UUID userId = getUserId(auth);
        ProblemStatus status = ProblemStatus.valueOf(body.get("status"));
        UserProblemProgress p = progressService.updateStatus(userId, problemId, status);
        return ResponseEntity.ok(mapToDto(p));
    }

    @PostMapping("/{problemId}/mastery")
    public ResponseEntity<UserProgressResponse> updateMastery(@PathVariable UUID problemId, @RequestBody Map<String, Integer> body, Authentication auth) {
        UUID userId = getUserId(auth);
        UserProblemProgress p = progressService.updateMastery(userId, problemId, body.get("masteryLevel"));
        return ResponseEntity.ok(mapToDto(p));
    }

    @PostMapping("/{problemId}/revision")
    public ResponseEntity<UserProgressResponse> markRevision(@PathVariable UUID problemId, @RequestBody Map<String, Integer> body, Authentication auth) {
        UUID userId = getUserId(auth);
        UserProblemProgress p = progressService.markRevision(userId, problemId, body.get("revision"));
        return ResponseEntity.ok(mapToDto(p));
    }

    private UserProgressResponse mapToDto(UserProblemProgress p) {
        return UserProgressResponse.builder()
                .problemId(p.getProblem().getId())
                .status(p.getStatus())
                .masteryLevel(p.getMasteryLevel())
                .completed(p.isCompleted())
                .completedAt(p.getCompletedAt())
                .revision1(p.isRevision1())
                .revision2(p.isRevision2())
                .revision3(p.isRevision3())
                .attemptCount(p.getAttemptCount())
                .successfulAttemptCount(p.getSuccessfulAttemptCount())
                .lastSolvedAt(p.getLastSolvedAt())
                .build();
    }
}
