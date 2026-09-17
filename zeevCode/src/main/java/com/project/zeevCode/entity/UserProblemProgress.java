package com.project.zeevCode.entity;

import com.project.zeevCode.enums.ProblemStatus;
import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDateTime;
import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "user_problem_progress", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"user_id", "problem_id"})
})
public class UserProblemProgress {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    @Builder.Default
    private ProblemStatus status = ProblemStatus.NOT_STARTED;

    @Column(name = "mastery_level")
    private Integer masteryLevel;

    @Column(nullable = false)
    @Builder.Default
    private boolean completed = false;

    @Column(name = "completed_at")
    private LocalDateTime completedAt;

    @Column(name = "revision_1", nullable = false)
    @Builder.Default
    private boolean revision1 = false;

    @Column(name = "revision_1_at")
    private LocalDateTime revision1At;

    @Column(name = "revision_2", nullable = false)
    @Builder.Default
    private boolean revision2 = false;

    @Column(name = "revision_2_at")
    private LocalDateTime revision2At;

    @Column(name = "revision_3", nullable = false)
    @Builder.Default
    private boolean revision3 = false;

    @Column(name = "revision_3_at")
    private LocalDateTime revision3At;

    @Column(name = "attempt_count", nullable = false)
    @Builder.Default
    private int attemptCount = 0;

    @Column(name = "successful_attempt_count", nullable = false)
    @Builder.Default
    private int successfulAttemptCount = 0;

    @Column(name = "last_solved_at")
    private LocalDateTime lastSolvedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
