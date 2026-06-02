package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Submission;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface SubmissionRepository extends JpaRepository<Submission, UUID> {
    List<Submission> findByMatchId(UUID matchId);
    List<Submission> findByUserIdAndMatchId(UUID userId, UUID matchId);
    List<Submission> findByMatchIdOrderByCreatedAtAsc(UUID matchId);
    long countByProblemId(UUID problemId);
}
