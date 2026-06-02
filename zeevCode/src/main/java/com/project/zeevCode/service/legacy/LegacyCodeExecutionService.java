package com.project.zeevCode.service.legacy;

import com.project.zeevCode.enums.Language;

import java.util.UUID;

public interface LegacyCodeExecutionService {
    void executeSubmission(UUID submissionId, String code, Language language,
                           UUID matchId, UUID userId, UUID problemId);

    void executePracticeSubmission(UUID submissionId, String code, Language language,
                                   UUID userId, UUID problemId);
}