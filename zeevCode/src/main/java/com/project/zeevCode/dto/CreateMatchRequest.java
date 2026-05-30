package com.project.zeevCode.dto;

import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class CreateMatchRequest {
    @NotNull
    private UUID player1Id;
    @NotNull
    private UUID player2Id;
}
