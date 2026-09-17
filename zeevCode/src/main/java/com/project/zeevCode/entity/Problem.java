package com.project.zeevCode.entity;

import com.project.zeevCode.enums.Difficulty;
import jakarta.persistence.Entity;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import jakarta.persistence.*;
import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "problems")
public class Problem {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @Column(nullable = false, length = 255)
    private String title;

    @Column(nullable = false, unique = true, length = 255)
    private String slug;

    @Column(columnDefinition = "TEXT", nullable = false)
    private String description;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false)
    private Difficulty difficulty;

    @Column(name = "template_code", columnDefinition = "TEXT", nullable = false)
    private String templateCode;

    @Column(name = "time_limit", nullable = false, columnDefinition = "int default 2000")
    private int timeLimit;

    @Column(name = "memory_limit", nullable = false, columnDefinition = "int default 256")
    private int memoryLimit;

    @Column(name = "is_active", nullable = false, columnDefinition = "boolean default true")
    private boolean isActive = true;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @Column(length = 100)
    private String category;

    @Column(name = "source_url", length = 500)
    private String sourceUrl;

    @Column(name = "leetcode_number")
    private Integer leetcodeNumber;

    @Column(columnDefinition = "SMALLINT")
    private Integer importance; // 1-5

    @Column(name = "is_seeded", nullable = false)
    @Builder.Default
    private boolean isSeeded = false;
}
