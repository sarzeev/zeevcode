package com.project.zeevCode.entity;

import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Entity @Table(name = "fundamentals_chapter_progress")
public class FundamentalsChapterProgress {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Column(name = "subject_slug", nullable = false, length = 255)
    private String subjectSlug;

    @Column(name = "chapter_path", nullable = false, length = 500)
    private String chapterPath;

    @Column(name = "completed", nullable = false)
    private boolean completed;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;
}
