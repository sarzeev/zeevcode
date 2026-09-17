package com.project.zeevCode.repository;

import com.project.zeevCode.entity.UserProblemProgress;
import com.project.zeevCode.enums.ProblemStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface UserProblemProgressRepository extends JpaRepository<UserProblemProgress, UUID> {
    Optional<UserProblemProgress> findByUserIdAndProblemId(UUID userId, UUID problemId);
    List<UserProblemProgress> findByUserId(UUID userId);
    List<UserProblemProgress> findByUserIdAndStatus(UUID userId, ProblemStatus status);
    long countByUserIdAndStatus(UUID userId, ProblemStatus status);
    long countByUserIdAndCompleted(UUID userId, boolean completed);

    @Query("SELECT upp FROM UserProblemProgress upp " +
           "JOIN ProblemCollectionMembership pcm ON upp.problem.id = pcm.problem.id " +
           "WHERE upp.user.id = :userId AND pcm.collection.id = :collectionId")
    List<UserProblemProgress> findByUserIdAndCollectionId(UUID userId, UUID collectionId);
}
