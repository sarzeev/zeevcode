package com.project.zeevCode.service;

import com.project.zeevCode.config.PistonConfig;
import com.project.zeevCode.dto.PistonRequest;
import com.project.zeevCode.dto.PistonResponse;
import com.project.zeevCode.entity.TestCase;
import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import com.project.zeevCode.websocket.MatchMessage;
import com.project.zeevCode.websocket.MatchWebSocketController;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.http.MediaType;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@Service
@ConditionalOnProperty(name = "execution.provider", havingValue = "piston", matchIfMissing = true)
@Slf4j
public class PistonExecutionProvider implements ExecutionProvider {

    private final SubmissionService submissionService;
    private final MatchService matchService;
    private final ProblemService problemService;
    private final MatchWebSocketController webSocketController;
    private final SimpMessagingTemplate messagingTemplate;
    private final PistonConfig pistonConfig;
    private final RestClient restClient;

    private static final Map<Language, String> LANGUAGE_MAP = Map.of(
            Language.JAVA, "java",
            Language.PYTHON, "python3",
            Language.CPP, "c++"
    );

    private static final Map<Language, String> FILENAME_MAP = Map.of(
            Language.JAVA, "Main.java",
            Language.PYTHON, "main.py",
            Language.CPP, "main.cpp"
    );

    public PistonExecutionProvider(@Lazy SubmissionService submissionService,
                                   MatchService matchService,
                                   ProblemService problemService,
                                   MatchWebSocketController webSocketController,
                                   SimpMessagingTemplate messagingTemplate,
                                   PistonConfig pistonConfig) {
        this.submissionService = submissionService;
        this.matchService = matchService;
        this.problemService = problemService;
        this.webSocketController = webSocketController;
        this.messagingTemplate = messagingTemplate;
        this.pistonConfig = pistonConfig;
        this.restClient = RestClient.builder().baseUrl(pistonConfig.getApiUrl()).build();
    }

    private enum ExecutionResult {
        ACCEPTED, WRONG_ANSWER, RUNTIME_ERROR, TIME_LIMIT_EXCEEDED, COMPILE_ERROR
    }

    @Async
    @Override
    public void executeSubmission(UUID submissionId, String code, Language language,
                                  UUID matchId, UUID userId, UUID problemId) {
        List<TestCase> testCases = problemService.getAllTestCases(problemId);

        try {
            for (TestCase testCase : testCases) {
                long startTime = System.nanoTime();
                ExecutionResult result = runCodeOnPiston(code, language, testCase.getInput(), testCase.getExpectedOutput());
                long endTime = System.nanoTime();
                int runtimeMs = (int) ((endTime - startTime) / 1_000_000);

                if (result != ExecutionResult.ACCEPTED) {
                    SubmissionStatus status = SubmissionStatus.valueOf(result.name());
                    submissionService.updateSubmissionStatus(submissionId, status, runtimeMs);
                    sendMatchWebSocketUpdate(matchId.toString(), userId.toString(), status.name(), "Test case failed.");
                    return;
                }
            }

            submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.ACCEPTED, 0);
            sendMatchWebSocketUpdate(matchId.toString(), userId.toString(), "ACCEPTED", "All test cases passed!");

            matchService.finishMatch(matchId, userId);
            sendMatchWebSocketUpdate(matchId.toString(), userId.toString(), "MATCH_FINISHED", "Match has finished.");

        } catch (Exception e) {
            log.error("Error during Piston code execution for submission {}", submissionId, e);
            submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.RUNTIME_ERROR, null);
            sendMatchWebSocketUpdate(matchId.toString(), userId.toString(), "RUNTIME_ERROR", "An unexpected error occurred.");
        }
    }

    @Async
    @Override
    public void executePracticeSubmission(UUID submissionId, String code, Language language,
                                          UUID userId, UUID problemId) {
        List<TestCase> testCases = problemService.getAllTestCases(problemId);

        try {
            for (TestCase testCase : testCases) {
                long startTime = System.nanoTime();
                ExecutionResult result = runCodeOnPiston(code, language, testCase.getInput(), testCase.getExpectedOutput());
                long endTime = System.nanoTime();
                int runtimeMs = (int) ((endTime - startTime) / 1_000_000);

                if (result != ExecutionResult.ACCEPTED) {
                    SubmissionStatus status = SubmissionStatus.valueOf(result.name());
                    submissionService.updateSubmissionStatus(submissionId, status, runtimeMs);
                    sendPracticeUpdate(userId.toString(), status.name(), "Test case failed.", runtimeMs);
                    return;
                }
            }

            submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.ACCEPTED, 0);
            sendPracticeUpdate(userId.toString(), "ACCEPTED", "All test cases passed!", 0);

        } catch (Exception e) {
            log.error("Error during Piston practice execution for submission {}", submissionId, e);
            submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.RUNTIME_ERROR, null);
            sendPracticeUpdate(userId.toString(), "RUNTIME_ERROR", "An unexpected error occurred.", null);
        }
    }

    private ExecutionResult runCodeOnPiston(String code, Language language, String input, String expectedOutput) {
        String pistonLanguage = LANGUAGE_MAP.get(language);
        String filename = FILENAME_MAP.get(language);

        PistonRequest request = PistonRequest.builder()
                .language(pistonLanguage)
                .version("*")
                .files(List.of(new PistonRequest.PistonFile(filename, code)))
                .stdin(input != null ? input : "")
                .run_timeout(pistonConfig.getTimeout().getRun())
                .compile_timeout(pistonConfig.getTimeout().getCompile())
                .run_memory_limit(pistonConfig.getMemory().getRun())
                .build();

        PistonResponse response = restClient.post()
                .uri("/api/v2/execute")
                .contentType(MediaType.APPLICATION_JSON)
                .body(request)
                .retrieve()
                .body(PistonResponse.class);

        if (response == null || response.getRun() == null) {
            log.error("Invalid response from Piston API");
            return ExecutionResult.RUNTIME_ERROR;
        }

        // Check for compile errors
        if (response.getCompile() != null && response.getCompile().getCode() != null && response.getCompile().getCode() != 0) {
            log.error("Compilation failed in Piston: {}", response.getCompile().getStderr());
            return ExecutionResult.COMPILE_ERROR;
        }

        // Check for timeouts (Piston uses SIGKILL on timeout)
        if ("SIGKILL".equals(response.getRun().getSignal())) {
            return ExecutionResult.TIME_LIMIT_EXCEEDED;
        }

        // Check for runtime errors
        if (response.getRun().getCode() != null && response.getRun().getCode() != 0) {
            log.error("Runtime error in Piston: {}", response.getRun().getStderr());
            return ExecutionResult.RUNTIME_ERROR;
        }

        String actualOutput = response.getRun().getStdout();
        if (actualOutput != null && actualOutput.trim().equals(expectedOutput.trim())) {
            return ExecutionResult.ACCEPTED;
        } else {
            log.debug("Wrong answer from Piston. Expected: [{}] Got: [{}]",
                    expectedOutput.trim(), actualOutput != null ? actualOutput.trim() : "");
            return ExecutionResult.WRONG_ANSWER;
        }
    }

    private void sendMatchWebSocketUpdate(String matchId, String userId, String status, String message) {
        MatchMessage msg = MatchMessage.builder()
                .type("SUBMISSION_RESULT")
                .matchId(matchId)
                .userId(userId)
                .status(status)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        webSocketController.sendMatchUpdate(matchId, msg);
    }

    private void sendPracticeUpdate(String userId, String status, String message, Integer runtimeMs) {
        MatchMessage msg = MatchMessage.builder()
                .type("PRACTICE_RESULT")
                .userId(userId)
                .status(status)
                .message(message)
                .timestamp(LocalDateTime.now())
                .build();
        messagingTemplate.convertAndSend("/topic/practice/" + userId, msg);
    }
}
