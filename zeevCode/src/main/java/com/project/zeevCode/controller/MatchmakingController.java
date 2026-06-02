package com.project.zeevCode.controller;

import com.project.zeevCode.service.MatchmakingService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/matchmaking")
@RequiredArgsConstructor
public class MatchmakingController {

    private final MatchmakingService matchmakingService;

    @PostMapping("/join")
    public ResponseEntity<Void> joinQueue(@RequestParam UUID userId) {
        matchmakingService.joinQueue(userId);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/leave")
    public ResponseEntity<Void> leaveQueue(@RequestParam UUID userId) {
        matchmakingService.leaveQueue(userId);
        return ResponseEntity.ok().build();
    }
}
