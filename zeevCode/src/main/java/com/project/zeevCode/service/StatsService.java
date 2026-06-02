package com.project.zeevCode.service;

import com.project.zeevCode.repository.MatchRepository;
import com.project.zeevCode.repository.SubmissionRepository;
import com.project.zeevCode.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class StatsService {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;
    private final com.project.zeevCode.repository.ProblemRepository problemRepository;

    public PlatformStats getPlatformStats() {
        return new PlatformStats(
                userRepository.count(),
                matchRepository.count(),
                submissionRepository.count(),
                problemRepository.count()
        );
    }

    public record PlatformStats(long totalUsers, long totalMatches, long totalSubmissions, long totalProblems) {}
}
