package com.project.zeevCode.repository;

import com.project.zeevCode.entity.FundamentalsChapterProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundamentalsChapterProgressRepository extends JpaRepository<FundamentalsChapterProgress, UUID> {
    List<FundamentalsChapterProgress> findByUserIdAndSubjectSlug(UUID userId, String subjectSlug);
    List<FundamentalsChapterProgress> findByUserId(UUID userId);
    Optional<FundamentalsChapterProgress> findByUserIdAndChapterPath(UUID userId, String chapterPath);
    long countByUserIdAndSubjectSlugAndCompleted(UUID userId, String subjectSlug, boolean completed);
}
