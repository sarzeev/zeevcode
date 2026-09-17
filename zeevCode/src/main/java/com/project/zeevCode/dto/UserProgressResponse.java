package com.project.zeevCode.dto;

import com.project.zeevCode.enums.ProblemStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@Builder
public class UserProgressResponse {
    private UUID problemId;
    private ProblemStatus status;
    private Integer masteryLevel;
    private boolean completed;
    private LocalDateTime completedAt;
    private boolean revision1;
    private boolean revision2;
    private boolean revision3;
    private int attemptCount;
    private int successfulAttemptCount;
    private LocalDateTime lastSolvedAt;
}
