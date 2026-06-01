package com.project.zeevCode.service;

import com.project.zeevCode.entity.Match;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.enums.MatchStatus;
import com.project.zeevCode.repository.MatchRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Slf4j
@Service
@RequiredArgsConstructor
public class MatchService {

    private final MatchRepository matchRepository;
    private final UserService userService;
    private final ProblemService problemService;

    @Transactional
    public Match createMatch(UUID player1Id, UUID player2Id) {
        User player1 = userService.getUserById(player1Id);
        User player2 = userService.getUserById(player2Id);
        Problem problem = problemService.getRandomProblem();
        Match match = Match.builder()
                .player1(player1)
                .player2(player2)
                .problem(problem)
                .status(MatchStatus.WAITING)
                .build();
        return matchRepository.save(match);
    }

    @Transactional
    public Match startMatch(UUID matchId) {
        Match match = getMatch(matchId);
        match.setStatus(MatchStatus.IN_PROGRESS);
        match.setStartedAt(LocalDateTime.now());
        return matchRepository.save(match);
    }


    @Transactional
    public Match finishMatch(UUID matchId, UUID winnerId) {
        Match match = getMatch(matchId);

        log.info("Finishing match: {} with winner: {}", matchId, winnerId);
        log.info("Current match status: {}", match.getStatus());

        if (match.getStatus() == MatchStatus.FINISHED) {
            log.info("Match already finished, skipping");
            return match;
        }

        User winner = userService.getUserById(winnerId);
        User loser = match.getPlayer1().getId().equals(winnerId)
                ? match.getPlayer2()
                : match.getPlayer1();

        match.setStatus(MatchStatus.FINISHED);
        match.setWinner(winner);
        match.setFinishedAt(LocalDateTime.now());

        matchRepository.save(match);

        userService.recordWin(winner.getId());
        userService.updateRating(winner.getId(), 25);

        userService.recordLoss(loser.getId());
        userService.updateRating(loser.getId(), -15);

        return match;
    }

    public Match getMatch(UUID matchId) {
        return matchRepository.findById(matchId)
                .orElseThrow(() -> new RuntimeException("Match not found with id: " + matchId));
    }

    public List<Match> getMatchesForUser(UUID userId) {
        return matchRepository.findByPlayer1IdOrPlayer2Id(userId, userId);
    }
}
