package com.project.zeevCode.service.legacy;

import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import com.project.zeevCode.service.ExecutionProvider;
import com.project.zeevCode.service.SubmissionService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.util.UUID;

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
 *
 * To re-enable: set execution.provider=judge0 in application.properties
 */
@Service
@ConditionalOnProperty(name = "execution.provider", havingValue = "judge0")
@RequiredArgsConstructor
@Slf4j
public class LegacyJudge0Provider implements ExecutionProvider {

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
