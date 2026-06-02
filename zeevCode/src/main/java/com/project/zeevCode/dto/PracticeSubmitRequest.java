package com.project.zeevCode.dto;

import jakarta.validation.constraints.NotBlank;
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
public class PracticeSubmitRequest {
    @NotNull
    private UUID userId;
    @NotNull
    private UUID problemId;
    @NotBlank
    private String code;
    @NotNull
    private String language;
}
