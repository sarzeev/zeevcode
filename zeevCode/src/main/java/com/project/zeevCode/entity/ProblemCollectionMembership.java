package com.project.zeevCode.entity;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.UUID;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
@Entity
@Table(name = "problem_collection_memberships", uniqueConstraints = {
    @UniqueConstraint(columnNames = {"problem_id", "collection_id"})
})
public class ProblemCollectionMembership {
    @Id
    @GeneratedValue(strategy = GenerationType.UUID)
    private UUID id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "problem_id", nullable = false)
    private Problem problem;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "collection_id", nullable = false)
    private ProblemCollection collection;

    @Column(name = "order_index")
    private Integer orderIndex;
}
