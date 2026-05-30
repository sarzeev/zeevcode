package com.project.zeevCode.websocket;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchMessage {
    private String type;
    private String matchId;
    private String userId;
    private String status;
    private String message;
    private LocalDateTime timestamp;
}
