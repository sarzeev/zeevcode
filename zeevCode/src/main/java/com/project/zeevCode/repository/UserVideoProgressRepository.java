package com.project.zeevCode.repository;

import com.project.zeevCode.entity.UserVideoProgress;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface UserVideoProgressRepository extends JpaRepository<UserVideoProgress, UUID> {
    Optional<UserVideoProgress> findByUserIdAndVideoId(UUID userId, UUID videoId);
    List<UserVideoProgress> findByUserIdAndVideoPlaylistSubjectId(UUID userId, UUID subjectId);
    List<UserVideoProgress> findByUserId(UUID userId);
    
    long countByUserIdAndVideoPlaylistIdAndCompletedTrue(UUID userId, UUID playlistId);
    long countByUserIdAndVideoPlaylistSubjectIdAndCompletedTrue(UUID userId, UUID subjectId);
}
