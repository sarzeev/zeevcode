package com.project.zeevCode.controller;

import com.project.zeevCode.entity.*;
import com.project.zeevCode.service.FundamentalsService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;

@RestController
@RequestMapping("/api/fundamentals")
public class FundamentalsController {

    private final FundamentalsService fundamentalsService;

    @Autowired
    public FundamentalsController(FundamentalsService fundamentalsService) {
        this.fundamentalsService = fundamentalsService;
    }

    @GetMapping("/dashboard")
    public ResponseEntity<List<Map<String, Object>>> getDashboard(@RequestParam(required = false) UUID userId) {
        List<Subject> subjects = fundamentalsService.getAllSubjects();
        List<Map<String, Object>> responseList = new ArrayList<>();
        
        for (Subject subject : subjects) {
            Map<String, Object> map = new HashMap<>();
            map.put("subject", subject);
            
            List<Playlist> playlists = fundamentalsService.getPlaylistsBySubject(subject.getId());
            int totalVideos = 0;
            if (!playlists.isEmpty()) {
                totalVideos = fundamentalsService.getVideosByPlaylist(playlists.get(0).getId()).size();
            }
            map.put("totalVideos", totalVideos);
            
            if (userId != null && !playlists.isEmpty()) {
                List<UserVideoProgress> progress = fundamentalsService.getUserProgressForSubject(userId, subject.getId());
                long completed = progress.stream().filter(UserVideoProgress::isCompleted).count();
                map.put("completedVideos", completed);
            } else {
                map.put("completedVideos", 0);
            }
            
            responseList.add(map);
        }
        
        return ResponseEntity.ok(responseList);
    }

    @GetMapping("/subjects")
    public ResponseEntity<List<Subject>> getAllSubjects() {
        return ResponseEntity.ok(fundamentalsService.getAllSubjects());
    }

    @GetMapping("/subjects/{slug}")
    public ResponseEntity<Map<String, Object>> getSubjectDetails(@PathVariable String slug, @RequestParam(required = false) UUID userId) {
        Subject subject = fundamentalsService.getSubjectBySlug(slug);
        List<Playlist> playlists = fundamentalsService.getPlaylistsBySubject(subject.getId());
        
        List<Video> videos = List.of();
        if (!playlists.isEmpty()) {
            videos = fundamentalsService.getVideosByPlaylist(playlists.get(0).getId());
        }

        List<Resource> resources = fundamentalsService.getResourcesBySubject(subject.getId());
        List<QuizQuestion> quizzes = fundamentalsService.getQuizBySubject(subject.getId());
        
        Map<String, Object> response = new HashMap<>();
        response.put("subject", subject);
        response.put("playlists", playlists);
        response.put("videos", videos);
        response.put("resources", resources);
        response.put("quizzes", quizzes);
        
        if (userId != null && !playlists.isEmpty()) {
            List<UserVideoProgress> progress = fundamentalsService.getUserProgressForSubject(userId, subject.getId());
            response.put("progress", progress);
        }

        return ResponseEntity.ok(response);
    }

    @PostMapping("/videos/{videoId}/complete")
    public ResponseEntity<?> markVideoComplete(
            @PathVariable UUID videoId,
            @RequestBody Map<String, String> request) {
        UUID userId = UUID.fromString(request.get("userId"));
        fundamentalsService.markVideoCompleted(userId, videoId);
        return ResponseEntity.ok(Map.of("message", "Video marked as completed"));
    }
    
    @GetMapping("/progress/{userId}")
    public ResponseEntity<List<UserVideoProgress>> getUserProgress(@PathVariable UUID userId) {
        return ResponseEntity.ok(fundamentalsService.getAllUserProgress(userId));
    }
}
