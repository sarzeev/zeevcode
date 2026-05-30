package com.project.zeevCode.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ProblemResponse {
    private UUID id;
    private String title;
    private String slug;
    private String description;
    private String difficulty;
    private String templateCode;
}
