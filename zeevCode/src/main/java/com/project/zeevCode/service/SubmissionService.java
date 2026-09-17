package com.project.zeevCode.service;

import com.project.zeevCode.entity.Submission;
import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import com.project.zeevCode.repository.ProblemRepository;
import com.project.zeevCode.repository.SubmissionRepository;
import com.project.zeevCode.repository.MatchRepository;
import com.project.zeevCode.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class SubmissionService {

    private final UserRepository userRepository;
    private final ProblemRepository problemRepository;
    private final SubmissionRepository submissionRepository;
    private final MatchRepository matchRepository;
    private final UserProblemProgressService userProblemProgressService;

    @Transactional
    public Submission createSubmission(UUID matchId, UUID userId, UUID problemId, String code, Language language) {
        Submission submission = Submission.builder()
                .match(matchRepository.findById(matchId)
                        .orElseThrow(() -> new RuntimeException("Match not found")))
                .user(userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found")))
                .problem(problemRepository.findById(problemId)
                        .orElseThrow(() -> new RuntimeException("Problem not found")))
                .code(code)
                .language(language)
                .status(SubmissionStatus.PENDING)
                .build();
        return submissionRepository.save(submission);
    }

    @Transactional
    public Submission createPracticeSubmission(UUID userId, UUID problemId, String code, Language language) {
        Submission submission = Submission.builder()
                .match(null)
                .user(userRepository.findById(userId)
                        .orElseThrow(() -> new RuntimeException("User not found")))
                .problem(problemRepository.findById(problemId)
                        .orElseThrow(() -> new RuntimeException("Problem not found")))
                .code(code)
                .language(language)
                .status(SubmissionStatus.PENDING)
                .build();
        return submissionRepository.save(submission);
    }

    @Transactional
    public Submission updateSubmissionStatus(UUID submissionId, SubmissionStatus status, Integer runtimeMs) {
        Submission submission = submissionRepository.findById(submissionId)
                .orElseThrow(() -> new RuntimeException("Submission not found with id: " + submissionId));
        submission.setStatus(status);
        submission.setRuntimeMs(runtimeMs);
        Submission saved = submissionRepository.save(submission);
        
        // Update user progress
        userProblemProgressService.recordSubmissionAttempt(
                saved.getUser().getId(), 
                saved.getProblem().getId(), 
                status == SubmissionStatus.ACCEPTED
        );
        
        return saved;
    }

    public List<Submission> getSubmissionsForMatch(UUID matchId) {
        return submissionRepository.findByMatchId(matchId);
    }

    public List<Submission> getSubmissionsForUserInMatch(UUID userId, UUID matchId) {
        return submissionRepository.findByUserIdAndMatchId(userId, matchId);
    }
}
