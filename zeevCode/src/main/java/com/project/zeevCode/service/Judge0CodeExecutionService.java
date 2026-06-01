package com.project.zeevCode.service;

import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

@Service
@ConditionalOnProperty(name = "execution.engine", havingValue = "judge0")
@RequiredArgsConstructor
@Slf4j
public class Judge0CodeExecutionService implements CodeExecutionService {

    @Lazy
    private final SubmissionService submissionService;

    @Async
    @Override
    public void executeSubmission(UUID submissionId, String code, Language language,
                                  UUID matchId, UUID userId, UUID problemId) {
        log.warn("Judge0 execution not yet implemented for submission {}", submissionId);
        submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.RUNTIME_ERROR, null);
    }

    @Async
    @Override
    public void executePracticeSubmission(UUID submissionId, String code, Language language,
                                          UUID userId, UUID problemId) {
        log.warn("Judge0 practice execution not yet implemented for submission {}", submissionId);
        submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.RUNTIME_ERROR, null);
    }
}
