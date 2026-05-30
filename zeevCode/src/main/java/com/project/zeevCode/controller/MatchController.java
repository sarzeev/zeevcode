package com.project.zeevCode.controller;

import com.project.zeevCode.dto.CreateMatchRequest;
import com.project.zeevCode.dto.MatchResponse;
import com.project.zeevCode.dto.UserResponse;
import com.project.zeevCode.entity.Match;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.service.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping
    public ResponseEntity<MatchResponse> createMatch(@RequestBody @Valid CreateMatchRequest request) {
        Match match = matchService.createMatch(request.getPlayer1Id(), request.getPlayer2Id());
        return new ResponseEntity<>(mapToMatchResponse(match), HttpStatus.CREATED);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable UUID id) {
        Match match = matchService.getMatch(id);
        return ResponseEntity.ok(mapToMatchResponse(match));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<MatchResponse>> getMatchesForUser(@PathVariable UUID userId) {
        List<Match> matches = matchService.getMatchesForUser(userId);
        return ResponseEntity.ok(matches.stream().map(this::mapToMatchResponse).collect(Collectors.toList()));
    }

    @PostMapping("/{id}/start")
    public ResponseEntity<MatchResponse> startMatch(@PathVariable UUID id) {
        Match match = matchService.startMatch(id);
        return ResponseEntity.ok(mapToMatchResponse(match));
    }

    @PostMapping("/{id}/finish")
    public ResponseEntity<MatchResponse> finishMatch(@PathVariable UUID id, @RequestParam UUID winnerId) {
        Match match = matchService.finishMatch(id, winnerId);
        return ResponseEntity.ok(mapToMatchResponse(match));
    }

    private MatchResponse mapToMatchResponse(Match match) {
        return MatchResponse.builder()
                .id(match.getId())
                .player1(mapToUserResponse(match.getPlayer1()))
                .player2(mapToUserResponse(match.getPlayer2()))
                .winner(match.getWinner() != null ? mapToUserResponse(match.getWinner()) : null)
                .status(match.getStatus().name())
                .problemSlug(match.getProblem().getSlug())
                .problemTitle(match.getProblem().getTitle())
                .startedAt(match.getStartedAt())
                .finishedAt(match.getFinishedAt())
                .createdAt(match.getCreatedAt())
                .build();
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .rating(user.getRating())
                .wins(user.getWins())
                .losses(user.getLosses())
                .build();
    }
}
