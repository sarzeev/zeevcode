package com.project.zeevCode.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Entity @Table(name = "fundamentals_repo_cache")
public class FundamentalsRepoCache {
    @Id @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(name = "subject_slug", nullable = false, length = 255)
    private String subjectSlug;

    @Column(name = "subject_name", nullable = false, length = 255)
    private String subjectName;

    @Column(name = "chapter_path", nullable = false, length = 500)
    private String chapterPath;

    @Column(name = "chapter_name", nullable = false, length = 500)
    private String chapterName;

    @Column(name = "chapter_order", nullable = false)
    private int chapterOrder;

    @Column(name = "blob_sha", nullable = false, length = 255)
    private String blobSha;

    @Column(name = "file_size")
    private Integer fileSize;

    @Column(name = "tree_sha", nullable = false, length = 255)
    private String treeSha;

    @Column(name = "cached_at", nullable = false)
    private LocalDateTime cachedAt;
}
