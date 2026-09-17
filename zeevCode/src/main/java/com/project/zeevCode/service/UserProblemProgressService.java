package com.project.zeevCode.service;

import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.entity.UserProblemProgress;
import com.project.zeevCode.enums.ProblemStatus;
import com.project.zeevCode.repository.ProblemRepository;
import com.project.zeevCode.repository.UserProblemProgressRepository;
import com.project.zeevCode.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserProblemProgressService {

    private final UserProblemProgressRepository progressRepository;
    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;

    @Transactional
    public UserProblemProgress getOrCreateProgress(UUID userId, UUID problemId) {
        return progressRepository.findByUserIdAndProblemId(userId, problemId)
                .orElseGet(() -> {
                    User user = userRepository.findById(userId)
                            .orElseThrow(() -> new RuntimeException("User not found: " + userId));
                    Problem problem = problemRepository.findById(problemId)
                            .orElseThrow(() -> new RuntimeException("Problem not found: " + problemId));
                    UserProblemProgress newProgress = UserProblemProgress.builder()
                            .user(user)
                            .problem(problem)
                            .status(ProblemStatus.NOT_STARTED)
                            .build();
                    return progressRepository.save(newProgress);
                });
    }

    public List<UserProblemProgress> getUserProgress(UUID userId) {
        return progressRepository.findByUserId(userId);
    }

    @Transactional
    public UserProblemProgress updateStatus(UUID userId, UUID problemId, ProblemStatus newStatus) {
        UserProblemProgress progress = getOrCreateProgress(userId, problemId);
        // Do not downgrade status implicitly, unless forced, but let user manage it.
        progress.setStatus(newStatus);
        
        if (newStatus == ProblemStatus.SOLVED || newStatus == ProblemStatus.MASTERED) {
            if (!progress.isCompleted()) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }
        }
        
        return progressRepository.save(progress);
    }

    @Transactional
    public UserProblemProgress updateMastery(UUID userId, UUID problemId, Integer masteryLevel) {
        UserProblemProgress progress = getOrCreateProgress(userId, problemId);
        progress.setMasteryLevel(masteryLevel);
        return progressRepository.save(progress);
    }

    @Transactional
    public UserProblemProgress markRevision(UUID userId, UUID problemId, int revisionNumber) {
        UserProblemProgress progress = getOrCreateProgress(userId, problemId);
        LocalDateTime now = LocalDateTime.now();
        switch (revisionNumber) {
            case 1 -> { progress.setRevision1(true); progress.setRevision1At(now); }
            case 2 -> { progress.setRevision2(true); progress.setRevision2At(now); }
            case 3 -> { progress.setRevision3(true); progress.setRevision3At(now); }
            default -> throw new IllegalArgumentException("Invalid revision number: " + revisionNumber);
        }
        return progressRepository.save(progress);
    }

    @Transactional
    public void recordSubmissionAttempt(UUID userId, UUID problemId, boolean isAccepted) {
        UserProblemProgress progress = getOrCreateProgress(userId, problemId);
        
        progress.setAttemptCount(progress.getAttemptCount() + 1);
        
        if (progress.getStatus() == ProblemStatus.NOT_STARTED) {
            progress.setStatus(ProblemStatus.ATTEMPTED);
        }

        if (isAccepted) {
            progress.setSuccessfulAttemptCount(progress.getSuccessfulAttemptCount() + 1);
            progress.setLastSolvedAt(LocalDateTime.now());
            
            if (!progress.isCompleted()) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
            }
            
            if (progress.getStatus() == ProblemStatus.NOT_STARTED || progress.getStatus() == ProblemStatus.ATTEMPTED) {
                progress.setStatus(ProblemStatus.SOLVED);
            }
        }
        
        progressRepository.save(progress);
    }
}
