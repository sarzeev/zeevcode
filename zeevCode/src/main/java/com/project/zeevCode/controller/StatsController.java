package com.project.zeevCode.controller;

import com.project.zeevCode.service.StatsService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/stats")
@RequiredArgsConstructor
public class StatsController {

    private final StatsService statsService;

    @GetMapping("/platform")
    public ResponseEntity<StatsService.PlatformStats> getPlatformStats() {
        return ResponseEntity.ok(statsService.getPlatformStats());
    }
}
