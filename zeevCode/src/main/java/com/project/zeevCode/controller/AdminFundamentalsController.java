package com.project.zeevCode.controller;

import com.project.zeevCode.entity.QuizQuestion;
import com.project.zeevCode.entity.Resource;
import com.project.zeevCode.entity.Subject;
import com.project.zeevCode.repository.QuizQuestionRepository;
import com.project.zeevCode.repository.ResourceRepository;
import com.project.zeevCode.repository.SubjectRepository;
import com.project.zeevCode.service.FundamentalsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/admin/fundamentals")
@PreAuthorize("hasRole('ADMIN')")
public class AdminFundamentalsController {

    private final FundamentalsService fundamentalsService;
    private final SubjectRepository subjectRepository;
    private final ResourceRepository resourceRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    @Autowired
    public AdminFundamentalsController(
            FundamentalsService fundamentalsService,
            SubjectRepository subjectRepository,
            ResourceRepository resourceRepository,
            QuizQuestionRepository quizQuestionRepository
    ) {
        this.fundamentalsService = fundamentalsService;
        this.subjectRepository = subjectRepository;
        this.resourceRepository = resourceRepository;
        this.quizQuestionRepository = quizQuestionRepository;
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(fundamentalsService.getAllSubjects());
    }

    @PostMapping("/subjects")
    public ResponseEntity<Subject> createSubject(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        String slug = request.get("slug");
        String description = request.get("description");
        return ResponseEntity.ok(fundamentalsService.createSubject(name, slug, description));
    }

    @PostMapping("/subjects/{subjectId}/playlist/import")
    public ResponseEntity<?> importPlaylist(
            @PathVariable UUID subjectId,
            @RequestBody Map<String, String> request) {
        try {
            String url = request.get("playlistUrl");
            fundamentalsService.importPlaylist(subjectId, url);
            return ResponseEntity.ok(Map.of("message", "Playlist imported successfully"));
        } catch (IllegalStateException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of("error", e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of("error", "An unexpected error occurred: " + e.getMessage()));
        }
    }

    @PostMapping("/subjects/{subjectId}/resources")
    public ResponseEntity<Resource> addResource(
            @PathVariable UUID subjectId,
            @RequestBody Resource resource) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        resource.setSubject(subject);
        return ResponseEntity.ok(resourceRepository.save(resource));
    }

    @PostMapping("/subjects/{subjectId}/quizzes")
    public ResponseEntity<QuizQuestion> addQuizQuestion(
            @PathVariable UUID subjectId,
            @RequestBody QuizQuestion quizQuestion) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));
        quizQuestion.setSubject(subject);
        return ResponseEntity.ok(quizQuestionRepository.save(quizQuestion));
    }
}
