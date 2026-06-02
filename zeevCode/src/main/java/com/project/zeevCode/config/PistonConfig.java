package com.project.zeevCode.config;

import lombok.Data;
import org.springframework.boot.context.properties.ConfigurationProperties;
import org.springframework.context.annotation.Configuration;

@Data
@Configuration
@ConfigurationProperties(prefix = "piston")
public class PistonConfig {
    private String apiUrl = "http://localhost:2000";
    private Timeout timeout = new Timeout();
    private Memory memory = new Memory();

    @Data
    public static class Timeout {
        private Integer run = 5000;
        private Integer compile = 10000;
    }

    @Data
    public static class Memory {
        private Integer run = 256000000;
    }
}
