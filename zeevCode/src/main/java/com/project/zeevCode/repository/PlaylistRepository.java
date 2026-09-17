package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Playlist;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, UUID> {
    List<Playlist> findBySubjectId(UUID subjectId);
    Optional<Playlist> findBySubjectIdAndYoutubePlaylistId(UUID subjectId, String youtubePlaylistId);
    Optional<Playlist> findByYoutubePlaylistId(String youtubePlaylistId);
}
