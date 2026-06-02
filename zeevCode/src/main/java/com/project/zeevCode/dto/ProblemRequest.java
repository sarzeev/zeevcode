package com.project.zeevCode.dto;

import com.project.zeevCode.enums.Difficulty;
import lombok.Data;

@Data
public class ProblemRequest {
    private String title;
    private String slug;
    private Difficulty difficulty;
    private String description;
    private String templateCode;
    private int timeLimit;
    private int memoryLimit;
}
