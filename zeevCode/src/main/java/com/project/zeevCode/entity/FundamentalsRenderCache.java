package com.project.zeevCode.entity;

import lombok.*;
import jakarta.persistence.*;
import java.time.LocalDateTime;

@Data @NoArgsConstructor @AllArgsConstructor @Builder
@Entity @Table(name = "fundamentals_render_cache")
public class FundamentalsRenderCache {
    @Id
    @Column(name = "blob_sha", length = 255)
    private String blobSha;

    @Column(name = "rendered_html", nullable = false, columnDefinition = "TEXT")
    private String renderedHtml;

    @Column(name = "chapter_path", nullable = false, length = 500)
    private String chapterPath;

    @Column(name = "cached_at", nullable = false)
    private LocalDateTime cachedAt;
}
