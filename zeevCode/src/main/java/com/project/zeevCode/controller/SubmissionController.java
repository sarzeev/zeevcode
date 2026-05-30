package com.project.zeevCode.controller;

import com.project.zeevCode.dto.SubmissionResponse;
import com.project.zeevCode.dto.SubmitCodeRequest;
import com.project.zeevCode.entity.Submission;
import com.project.zeevCode.enums.Language;
import com.project.zeevCode.service.CodeExecutionService;
import com.project.zeevCode.service.SubmissionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/submissions")
@RequiredArgsConstructor
public class SubmissionController {

    private final SubmissionService submissionService;
    private final CodeExecutionService codeExecutionService;

    @PostMapping
    public ResponseEntity<SubmissionResponse> createSubmission(@RequestBody @Valid SubmitCodeRequest request) {
        Submission savedSubmission = submissionService.createSubmission(
                request.getMatchId(),
                request.getUserId(),
                request.getProblemId(),
                request.getCode(),
                Language.valueOf(request.getLanguage().toUpperCase())
        );

        codeExecutionService.executeSubmission(
                savedSubmission.getId(),
                savedSubmission.getCode(),
                savedSubmission.getLanguage(),
                savedSubmission.getMatch().getId(),
                savedSubmission.getUser().getId(),
                savedSubmission.getProblem().getId()
        );

        return new ResponseEntity<>(mapToSubmissionResponse(savedSubmission), HttpStatus.CREATED);
    }

    @GetMapping("/match/{matchId}")
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForMatch(@PathVariable UUID matchId) {
        List<Submission> submissions = submissionService.getSubmissionsForMatch(matchId);
        return ResponseEntity.ok(submissions.stream().map(this::mapToSubmissionResponse).collect(Collectors.toList()));
    }

    @GetMapping("/match/{matchId}/user/{userId}")
    public ResponseEntity<List<SubmissionResponse>> getSubmissionsForUserInMatch(@PathVariable UUID matchId, @PathVariable UUID userId) {
        List<Submission> submissions = submissionService.getSubmissionsForUserInMatch(userId, matchId);
        return ResponseEntity.ok(submissions.stream().map(this::mapToSubmissionResponse).collect(Collectors.toList()));
    }

    private SubmissionResponse mapToSubmissionResponse(Submission submission) {
        return SubmissionResponse.builder()
                .id(submission.getId())
                .matchId(submission.getMatch().getId())
                .userId(submission.getUser().getId())
                .problemId(submission.getProblem().getId())
                .language(submission.getLanguage().name())
                .code(submission.getCode())
                .status(submission.getStatus().name())
                .runtimeMs(submission.getRuntimeMs())
                .submittedAt(submission.getCreatedAt())
                .build();
    }
}
