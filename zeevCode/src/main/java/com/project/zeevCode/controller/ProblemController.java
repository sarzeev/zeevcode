package com.project.zeevCode.controller;

import com.project.zeevCode.dto.ProblemResponse;
import com.project.zeevCode.dto.TestCaseResponse;
import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.entity.TestCase;
import com.project.zeevCode.service.ProblemService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/problems")
@RequiredArgsConstructor
public class ProblemController {

    private final ProblemService problemService;

    @GetMapping
    public ResponseEntity<List<ProblemResponse>> getAllProblems() {
        List<Problem> problems = problemService.getAllProblems();
        return ResponseEntity.ok(problems.stream().map(this::mapToProblemResponse).collect(Collectors.toList()));
    }

    @GetMapping("/{slug}")
    public ResponseEntity<ProblemResponse> getProblemBySlug(@PathVariable String slug) {
        Problem problem = problemService.getProblemBySlug(slug);
        return ResponseEntity.ok(mapToProblemResponse(problem));
    }

    @GetMapping("/{id}/testcases")
    public ResponseEntity<List<TestCaseResponse>> getVisibleTestCases(@PathVariable UUID id) {
        List<TestCase> testCases = problemService.getVisibleTestCases(id);
        return ResponseEntity.ok(testCases.stream().map(this::mapToTestCaseResponse).collect(Collectors.toList()));
    }

    private ProblemResponse mapToProblemResponse(Problem problem) {
        return ProblemResponse.builder()
                .id(problem.getId())
                .title(problem.getTitle())
                .slug(problem.getSlug())
                .description(problem.getDescription())
                .difficulty(problem.getDifficulty().name())
                .templateCode(problem.getTemplateCode())
                .build();
    }

    private TestCaseResponse mapToTestCaseResponse(TestCase testCase) {
        return TestCaseResponse.builder()
                .id(testCase.getId())
                .input(testCase.getInput())
                .expected(testCase.getExpectedOutput())
                .build();
    }
}
