package com.project.zeevCode.repository;

import com.project.zeevCode.entity.FundamentalsRenderCache;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;

public interface FundamentalsRenderCacheRepository extends JpaRepository<FundamentalsRenderCache, String> {
    Optional<FundamentalsRenderCache> findByBlobSha(String blobSha);
    void deleteByChapterPath(String chapterPath);
}
