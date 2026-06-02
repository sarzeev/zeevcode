package com.project.zeevCode.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchmakingMessage {
    private String type; // e.g., "MATCH_FOUND", "TIMEOUT"
    private UUID matchId;
}
