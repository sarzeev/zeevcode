package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Match;
import com.project.zeevCode.enums.MatchStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface MatchRepository extends JpaRepository<Match, UUID> {
    List<Match> findByPlayer1IdOrPlayer2Id(UUID player1Id, UUID player2Id);
    List<Match> findByStatus(MatchStatus status);
}
