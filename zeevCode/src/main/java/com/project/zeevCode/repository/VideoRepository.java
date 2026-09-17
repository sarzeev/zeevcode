package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Video;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

@Repository
public interface VideoRepository extends JpaRepository<Video, UUID> {
    List<Video> findByPlaylistIdOrderByOrderNumberAsc(UUID playlistId);
    Optional<Video> findByYoutubeVideoId(String youtubeVideoId);
}
