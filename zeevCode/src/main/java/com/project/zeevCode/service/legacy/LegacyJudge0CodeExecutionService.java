package com.project.zeevCode.service.legacy;

import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;
import com.project.zeevCode.service.SubmissionService;

/**
 * ════════════════════════════════════════════════════════════════
 * LEGACY IMPLEMENTATION — DO NOT DELETE WITHOUT ARCHITECTURAL REVIEW
 * ════════════════════════════════════════════════════════════════
 *
 * Originally used as ZeevCode's execution engine.
 *
 * Reason retained:
 *   • Learning and documentation
 *   • Interview discussion — demonstrates migration decision-making
 *
 * Reason disabled:
 *   • Stub implementation only, never fully integrated
 *   • Replaced by: PistonExecutionProvider (sandboxed Docker execution)
 */
@Service
@ConditionalOnProperty(name = "execution.provider", havingValue = "legacy-judge0-disabled")
@RequiredArgsConstructor
@Slf4j
public class LegacyJudge0CodeExecutionService implements LegacyCodeExecutionService {

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
