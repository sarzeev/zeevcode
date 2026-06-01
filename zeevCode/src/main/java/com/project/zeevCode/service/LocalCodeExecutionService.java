package com.project.zeevCode.service;

import com.project.zeevCode.entity.TestCase;
import com.project.zeevCode.enums.Language;
import com.project.zeevCode.enums.SubmissionStatus;
import com.project.zeevCode.websocket.MatchMessage;
import com.project.zeevCode.websocket.MatchWebSocketController;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Lazy;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.io.BufferedReader;
import java.io.BufferedWriter;
import java.io.File;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStreamWriter;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.LocalDateTime;
import java.util.Comparator;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.TimeUnit;

@Service
@ConditionalOnProperty(name = "execution.engine", havingValue = "local")
@RequiredArgsConstructor
@Slf4j
public class LocalCodeExecutionService implements CodeExecutionService {

    @Lazy
    private final SubmissionService submissionService;
    private final MatchService matchService;
    private final ProblemService problemService;
    private final MatchWebSocketController webSocketController;
    private final SimpMessagingTemplate messagingTemplate;

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
                ExecutionResult result = runCode(code, language, testCase.getInput(), testCase.getExpectedOutput());
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
            log.error("Error during code execution for submission {}", submissionId, e);
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
                ExecutionResult result = runCode(code, language, testCase.getInput(), testCase.getExpectedOutput());
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
            log.error("Error during practice execution for submission {}", submissionId, e);
            submissionService.updateSubmissionStatus(submissionId, SubmissionStatus.RUNTIME_ERROR, null);
            sendPracticeUpdate(userId.toString(), "RUNTIME_ERROR", "An unexpected error occurred.", null);
        }
    }

    private ExecutionResult runCode(String code, Language language, String input, String expectedOutput) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("code-execution-");
            String[] compileCommand = null;
            String[] runCommand = null;
            String sourceFileName = "";

            switch (language) {
                case JAVA:
                    sourceFileName = "Main.java";
                    compileCommand = new String[]{"javac", sourceFileName};
                    runCommand = new String[]{"java", "Main"};
                    break;
                case PYTHON:
                    sourceFileName = "main.py";
                    runCommand = new String[]{"python", sourceFileName};
                    break;
                case CPP:
                    sourceFileName = "main.cpp";
                    compileCommand = new String[]{"g++", "-o", "main", sourceFileName};
                    runCommand = new String[]{"./main"};
                    break;
            }

            Files.write(tempDir.resolve(sourceFileName), code.getBytes());

            if (compileCommand != null) {
                ProcessResult compileResult = executeProcess(compileCommand, tempDir, null);
                if (!compileResult.getSuccess()) {
                    log.error("Compilation failed for submission");
                    return ExecutionResult.COMPILE_ERROR;
                }
            }

            ProcessResult processResult = executeProcess(runCommand, tempDir, input);

            if (!processResult.getSuccess()) {
                return processResult.getTimedOut()
                        ? ExecutionResult.TIME_LIMIT_EXCEEDED
                        : ExecutionResult.RUNTIME_ERROR;
            }

            if (processResult.getOutput().trim().equals(expectedOutput.trim())) {
                return ExecutionResult.ACCEPTED;
            } else {
                log.debug("Wrong answer. Expected: [{}] Got: [{}]",
                        expectedOutput.trim(), processResult.getOutput().trim());
                return ExecutionResult.WRONG_ANSWER;
            }

        } catch (IOException | InterruptedException e) {
            log.error("Error in runCode", e);
            return ExecutionResult.RUNTIME_ERROR;
        } finally {
            if (tempDir != null) {
                try {
                    Files.walk(tempDir)
                            .sorted(Comparator.reverseOrder())
                            .map(Path::toFile)
                            .forEach(File::delete);
                } catch (IOException e) {
                    log.error("Failed to delete temp directory {}", tempDir, e);
                }
            }
        }
    }

    private ProcessResult executeProcess(String[] command, Path directory, String input)
            throws IOException, InterruptedException {

        ProcessBuilder processBuilder = new ProcessBuilder(command)
                .directory(directory.toFile())
                .redirectErrorStream(true);

        Process process = processBuilder.start();

        if (input != null) {
            try (BufferedWriter writer = new BufferedWriter(
                    new OutputStreamWriter(process.getOutputStream()))) {
                writer.write(input);
            }
        }

        StringBuilder output = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
                new InputStreamReader(process.getInputStream()))) {
            String line;
            while ((line = reader.readLine()) != null) {
                output.append(line).append("\n");
            }
        }

        boolean finishedInTime = process.waitFor(5, TimeUnit.SECONDS);
        if (!finishedInTime) {
            process.destroyForcibly();
            return new ProcessResult(false, "", true);
        }

        if (process.exitValue() != 0) {
            log.error("Process exited with code {}. Output: {}", process.exitValue(), output);
            return new ProcessResult(false, output.toString(), false);
        }

        return new ProcessResult(true, output.toString(), false);
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

    private static class ProcessResult {
        private final boolean success;
        private final String output;
        private final boolean timedOut;

        public ProcessResult(boolean success, String output, boolean timedOut) {
            this.success = success;
            this.output = output;
            this.timedOut = timedOut;
        }

        public boolean getSuccess() { return success; }
        public String getOutput() { return output; }
        public boolean getTimedOut() { return timedOut; }
    }
}
