package com.project.zeevCode.repository;

import com.project.zeevCode.entity.ProblemCollection;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface ProblemCollectionRepository extends JpaRepository<ProblemCollection, UUID> {
    Optional<ProblemCollection> findBySlug(String slug);
    boolean existsBySlug(String slug);
}
