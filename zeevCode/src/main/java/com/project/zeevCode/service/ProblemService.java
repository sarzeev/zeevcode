package com.project.zeevCode.service;

import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.entity.TestCase;
import com.project.zeevCode.enums.Difficulty;
import com.project.zeevCode.repository.ProblemRepository;
import com.project.zeevCode.repository.TestCaseRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Random;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class ProblemService {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;

    public List<Problem> getAllProblems() {
        return problemRepository.findAll();
    }

    public Problem getProblemById(UUID id) {
        return problemRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Problem not found with id: " + id));
    }

    public Problem getProblemBySlug(String slug) {
        return problemRepository.findBySlug(slug)
                .orElseThrow(() -> new RuntimeException("Problem not found with slug: " + slug));
    }

    public List<Problem> getProblemsByDifficulty(Difficulty difficulty) {
        return problemRepository.findByDifficulty(difficulty);
    }

    public List<TestCase> getVisibleTestCases(UUID problemId) {
        return testCaseRepository.findByProblemIdAndHiddenFalse(problemId);
    }
    public List<TestCase> getAllTestCases(UUID problemId) {
        return testCaseRepository.findByProblemId(problemId);
    }

    public Problem getRandomProblem() {
        List<Problem> allProblems = getAllProblems();
        if (allProblems.isEmpty()) {
            throw new RuntimeException("No problems found");
        }
        return allProblems.get(new Random().nextInt(allProblems.size()));
    }
}
