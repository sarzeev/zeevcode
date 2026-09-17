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
    public ResponseEntity<List<ProblemResponse>> getAllProblems(
            @RequestParam(required = false) String collection,
            @RequestParam(required = false) String category,
            @RequestParam(required = false) String difficulty,
            @RequestParam(required = false) Integer importance) {
        
        List<Problem> problems;
        if (collection != null && !collection.isBlank()) {
            problems = problemService.getProblemsByCollectionSlug(collection);
        } else {
            problems = problemService.getAllProblems();
        }

        // Apply filters
        problems = problems.stream()
                .filter(p -> category == null || category.equalsIgnoreCase(p.getCategory()))
                .filter(p -> difficulty == null || difficulty.equalsIgnoreCase(p.getDifficulty().name()))
                .filter(p -> importance == null || importance.equals(p.getImportance()))
                .collect(Collectors.toList());

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
                .timeLimit(problem.getTimeLimit())
                .memoryLimit(problem.getMemoryLimit())
                .isActive(problem.isActive())
                .category(problem.getCategory())
                .sourceUrl(problem.getSourceUrl())
                .leetcodeNumber(problem.getLeetcodeNumber())
                .importance(problem.getImportance())
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
