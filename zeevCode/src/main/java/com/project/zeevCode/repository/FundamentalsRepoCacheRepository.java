package com.project.zeevCode.repository;

import com.project.zeevCode.entity.FundamentalsRepoCache;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface FundamentalsRepoCacheRepository extends JpaRepository<FundamentalsRepoCache, UUID> {
    List<FundamentalsRepoCache> findBySubjectSlugOrderByChapterOrderAsc(String subjectSlug);
    Optional<FundamentalsRepoCache> findBySubjectSlugAndChapterPath(String subjectSlug, String chapterPath);
    List<FundamentalsRepoCache> findDistinctSubjectSlugBy();

    @Query("SELECT DISTINCT f.subjectSlug, f.subjectName FROM FundamentalsRepoCache f")
    List<Object[]> findDistinctSubjects();

    @Query("SELECT COUNT(f) FROM FundamentalsRepoCache f WHERE f.subjectSlug = :subjectSlug")
    long countBySubjectSlug(String subjectSlug);

    @Modifying
    @Query("DELETE FROM FundamentalsRepoCache f WHERE f.subjectSlug = :subjectSlug AND f.chapterPath NOT IN :paths")
    void deleteOrphanedChapters(String subjectSlug, List<String> paths);

    boolean existsBySubjectSlugAndChapterPathAndBlobSha(String subjectSlug, String chapterPath, String blobSha);
}
