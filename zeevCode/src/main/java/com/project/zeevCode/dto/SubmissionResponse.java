package com.project.zeevCode.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubmissionResponse {
    private UUID id;
    private UUID matchId;
    private UUID userId;
    private UUID problemId;
    private String language;
    private String code;
    private String status;
    private Integer runtimeMs;
    private LocalDateTime submittedAt;
}
