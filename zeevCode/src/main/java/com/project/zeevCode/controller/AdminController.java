package com.project.zeevCode.controller;

import com.project.zeevCode.dto.ProblemRequest;
import com.project.zeevCode.dto.TestCaseRequest;
import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.entity.TestCase;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.repository.MatchRepository;
import com.project.zeevCode.repository.ProblemRepository;
import com.project.zeevCode.repository.SubmissionRepository;
import com.project.zeevCode.repository.TestCaseRepository;
import com.project.zeevCode.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin")
@RequiredArgsConstructor
public class AdminController {

    private final ProblemRepository problemRepository;
    private final TestCaseRepository testCaseRepository;
    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final SubmissionRepository submissionRepository;
    private final com.project.zeevCode.service.UserService userService;

    // --- PROBLEM MANAGEMENT ---
    @GetMapping("/problems")
    public ResponseEntity<List<Problem>> getAllProblems() {
        // Admin needs to see all problems, including archived ones
        return ResponseEntity.ok(problemRepository.findAll());
    }

    @PostMapping("/problems")
    public ResponseEntity<?> createProblem(@RequestBody ProblemRequest request) {
        if (problemRepository.existsBySlug(request.getSlug())) {
            return ResponseEntity.badRequest().body("Slug already in use.");
        }
        
        Problem problem = Problem.builder()
                .title(request.getTitle())
                .slug(request.getSlug())
                .difficulty(request.getDifficulty())
                .description(request.getDescription())
                .templateCode(request.getTemplateCode())
                .timeLimit(request.getTimeLimit() > 0 ? request.getTimeLimit() : 2000)
                .memoryLimit(request.getMemoryLimit() > 0 ? request.getMemoryLimit() : 256)
                .isActive(true)
                .build();
        return ResponseEntity.ok(problemRepository.save(problem));
    }

    @PutMapping("/problems/{id}")
    public ResponseEntity<?> updateProblem(@PathVariable UUID id, @RequestBody ProblemRequest request) {
        Problem problem = problemRepository.findById(id).orElseThrow(() -> new RuntimeException("Problem not found"));
        
        Optional<Problem> existingSlug = problemRepository.findBySlug(request.getSlug());
        if (existingSlug.isPresent() && !existingSlug.get().getId().equals(id)) {
            return ResponseEntity.badRequest().body("Slug already in use by another problem.");
        }

        problem.setTitle(request.getTitle());
        problem.setSlug(request.getSlug());
        problem.setDifficulty(request.getDifficulty());
        problem.setDescription(request.getDescription());
        problem.setTemplateCode(request.getTemplateCode());
        problem.setTimeLimit(request.getTimeLimit() > 0 ? request.getTimeLimit() : 2000);
        problem.setMemoryLimit(request.getMemoryLimit() > 0 ? request.getMemoryLimit() : 256);
        return ResponseEntity.ok(problemRepository.save(problem));
    }

    @DeleteMapping("/problems/{id}")
    public ResponseEntity<?> deleteProblem(@PathVariable UUID id) {
        long matchCount = matchRepository.countByProblemId(id);
        long subCount = submissionRepository.countByProblemId(id);

        if (matchCount == 0 && subCount == 0) {
            // Hard Delete
            List<TestCase> testCases = testCaseRepository.findByProblemId(id);
            testCaseRepository.deleteAll(testCases);
            problemRepository.deleteById(id);
            return ResponseEntity.ok().body("{\"message\": \"Problem permanently deleted.\"}");
        } else {
            // Soft Delete (Archive)
            Problem problem = problemRepository.findById(id).orElseThrow();
            problem.setActive(false);
            problemRepository.save(problem);
            return ResponseEntity.ok().body("{\"message\": \"Problem archived due to existing matches.\"}");
        }
    }

    @PutMapping("/problems/{id}/restore")
    public ResponseEntity<?> restoreProblem(@PathVariable UUID id) {
        Problem problem = problemRepository.findById(id).orElseThrow(() -> new RuntimeException("Problem not found"));
        problem.setActive(true);
        return ResponseEntity.ok(problemRepository.save(problem));
    }

    // --- TEST CASE MANAGEMENT ---
    @GetMapping("/problems/{problemId}/testcases")
    public ResponseEntity<List<TestCase>> getTestCasesForAdmin(@PathVariable UUID problemId) {
        // Admin views all test cases including hidden ones
        return ResponseEntity.ok(testCaseRepository.findByProblemId(problemId));
    }

    @PostMapping("/problems/{problemId}/testcases")
    public ResponseEntity<TestCase> createTestCase(@PathVariable UUID problemId, @RequestBody TestCaseRequest request) {
        Problem problem = problemRepository.findById(problemId).orElseThrow(() -> new RuntimeException("Problem not found"));
        TestCase testCase = TestCase.builder()
                .problem(problem)
                .input(request.getInput())
                .expectedOutput(request.getExpectedOutput())
                .hidden(request.isHidden())
                .build();
        return ResponseEntity.ok(testCaseRepository.save(testCase));
    }

    @PutMapping("/testcases/{id}")
    public ResponseEntity<TestCase> updateTestCase(@PathVariable UUID id, @RequestBody TestCaseRequest request) {
        TestCase testCase = testCaseRepository.findById(id).orElseThrow(() -> new RuntimeException("Test case not found"));
        testCase.setInput(request.getInput());
        testCase.setExpectedOutput(request.getExpectedOutput());
        testCase.setHidden(request.isHidden());
        return ResponseEntity.ok(testCaseRepository.save(testCase));
    }

    @DeleteMapping("/testcases/{id}")
    public ResponseEntity<Void> deleteTestCase(@PathVariable UUID id) {
        testCaseRepository.deleteById(id);
        return ResponseEntity.ok().build();
    }

    // --- USER MANAGEMENT ---
    private UUID getAuthenticatedUserId() {
        org.springframework.security.core.Authentication auth = org.springframework.security.core.context.SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof org.springframework.security.oauth2.jwt.Jwt jwt) {
            String firebaseUid = jwt.getSubject();
            return userService.getUserByFirebaseUid(firebaseUid).map(User::getId).orElse(null);
        }
        return null;
    }

    @GetMapping("/users")
    public ResponseEntity<List<User>> searchUsers(@RequestParam(required = false) String search) {
        if (search != null && !search.trim().isEmpty()) {
            return ResponseEntity.ok(userRepository.findByUsernameContainingIgnoreCase(search.trim()));
        }
        return ResponseEntity.ok(userRepository.findAll());
    }

    @PutMapping("/users/{id}/role")
    public ResponseEntity<?> updateUserRole(@PathVariable UUID id, @RequestParam com.project.zeevCode.entity.UserRole role) {
        try {
            if (id.equals(getAuthenticatedUserId())) {
                return ResponseEntity.badRequest().body("Cannot change your own role");
            }
            userService.updateUserRole(id, role);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage() != null ? e.getMessage() : "Failed to update role");
        }
    }

    @PutMapping("/users/{id}/disable")
    public ResponseEntity<?> disableUser(@PathVariable UUID id) {
        try {
            if (id.equals(getAuthenticatedUserId())) {
                return ResponseEntity.badRequest().body("Cannot disable your own account");
            }
            userService.updateUserStatus(id, false);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(e.getMessage() != null ? e.getMessage() : "Failed to disable user");
        }
    }

    @PutMapping("/users/{id}/enable")
    public ResponseEntity<?> enableUser(@PathVariable UUID id) {
        try {
            userService.updateUserStatus(id, true);
            return ResponseEntity.ok().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Failed to enable user");
        }
    }
}
