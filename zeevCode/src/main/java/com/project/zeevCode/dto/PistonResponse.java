package com.project.zeevCode.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PistonResponse {
    private String language;
    private String version;
    private PistonStage run;
    private PistonStage compile;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PistonStage {
        private String stdout;
        private String stderr;
        private String output;
        private Integer code;
        private String signal;
    }
}
