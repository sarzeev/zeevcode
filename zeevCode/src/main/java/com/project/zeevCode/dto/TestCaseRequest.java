package com.project.zeevCode.dto;

import lombok.Data;

@Data
public class TestCaseRequest {
    private String input;
    private String expectedOutput;
    private boolean hidden;
}
