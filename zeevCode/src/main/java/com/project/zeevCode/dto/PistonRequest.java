package com.project.zeevCode.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class PistonRequest {
    private String language;
    private String version;
    private List<PistonFile> files;
    private String stdin;
    private Integer run_timeout;
    private Integer compile_timeout;
    private Integer run_memory_limit;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class PistonFile {
        private String name;
        private String content;
    }
}
