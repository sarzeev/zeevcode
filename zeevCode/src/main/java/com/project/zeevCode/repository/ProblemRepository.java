package com.project.zeevCode.repository;

import com.project.zeevCode.enums.Difficulty;
import com.project.zeevCode.entity.Problem;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProblemRepository extends JpaRepository<Problem, UUID> {
    Optional<Problem> findBySlug(String slug);
    List<Problem> findByDifficulty(Difficulty difficulty);
    List<Problem> findByIsActiveTrue();
    Optional<Problem> findBySlugAndIsActiveTrue(String slug);
    List<Problem> findByDifficultyAndIsActiveTrue(Difficulty difficulty);
    boolean existsBySlug(String slug);
}
