package com.project.zeevCode.service;

import com.project.zeevCode.dto.YouTubePlaylistItemDto;
import com.project.zeevCode.entity.*;
import com.project.zeevCode.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FundamentalsService {

    private final SubjectRepository subjectRepository;
    private final PlaylistRepository playlistRepository;
    private final VideoRepository videoRepository;
    private final UserVideoProgressRepository userVideoProgressRepository;
    private final UserRepository userRepository;
    private final YouTubeService youtubeService;
    private final ResourceRepository resourceRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    @Autowired
    public FundamentalsService(
        SubjectRepository subjectRepository,
        PlaylistRepository playlistRepository,
        VideoRepository videoRepository,
        UserVideoProgressRepository userVideoProgressRepository,
        UserRepository userRepository,
        YouTubeService youtubeService,
        ResourceRepository resourceRepository,
        QuizQuestionRepository quizQuestionRepository
    ) {
        this.subjectRepository = subjectRepository;
        this.playlistRepository = playlistRepository;
        this.videoRepository = videoRepository;
        this.userVideoProgressRepository = userVideoProgressRepository;
        this.userRepository = userRepository;
        this.youtubeService = youtubeService;
        this.resourceRepository = resourceRepository;
        this.quizQuestionRepository = quizQuestionRepository;
    }

    public List<Subject> getAllSubjects() {
        return subjectRepository.findAll();
    }
    
    public Subject getSubjectBySlug(String slug) {
        return subjectRepository.findBySlug(slug)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found: " + slug));
    }
    
    public List<Playlist> getPlaylistsBySubject(UUID subjectId) {
        return playlistRepository.findBySubjectId(subjectId);
    }
    
    public List<Video> getVideosByPlaylist(UUID playlistId) {
        return videoRepository.findByPlaylistIdOrderByOrderNumberAsc(playlistId);
    }
    
    public List<Resource> getResourcesBySubject(UUID subjectId) {
        return resourceRepository.findBySubjectId(subjectId);
    }
    
    public List<QuizQuestion> getQuizBySubject(UUID subjectId) {
        return quizQuestionRepository.findBySubjectId(subjectId);
    }

    public Subject createSubject(String name, String slug, String description) {
        Subject subject = Subject.builder()
                .name(name)
                .slug(slug)
                .description(description)
                .build();
        return subjectRepository.save(subject);
    }

    @Transactional
    public void importPlaylist(UUID subjectId, String playlistUrl) {
        Subject subject = subjectRepository.findById(subjectId)
                .orElseThrow(() -> new IllegalArgumentException("Subject not found"));

        String playlistId = extractPlaylistId(playlistUrl);
        if (playlistId == null) {
            throw new IllegalArgumentException("Invalid YouTube playlist URL");
        }

        Optional<Playlist> existingPlaylist = playlistRepository.findBySubjectIdAndYoutubePlaylistId(subjectId, playlistId);
        Playlist playlist = existingPlaylist.orElseGet(() -> {
            Playlist newPlaylist = Playlist.builder()
                    .subject(subject)
                    .youtubePlaylistId(playlistId)
                    .playlistUrl(playlistUrl)
                    .build();
            return playlistRepository.save(newPlaylist);
        });

        List<YouTubePlaylistItemDto> items = youtubeService.getPlaylistItems(playlistId);
        
        // Filter out private and deleted videos
        List<YouTubePlaylistItemDto> validItems = new ArrayList<>();
        for (YouTubePlaylistItemDto item : items) {
            String title = item.getSnippet().getTitle();
            if (title != null && !title.equals("Private video") && !title.equals("Deleted video")) {
                validItems.add(item);
            }
        }

        // Get durations in batches of 50
        List<String> videoIds = validItems.stream()
                .map(item -> item.getSnippet().getResourceId().getVideoId())
                .collect(Collectors.toList());
        Map<String, String> durations = youtubeService.getVideoDurations(videoIds);

        for (int i = 0; i < validItems.size(); i++) {
            YouTubePlaylistItemDto item = validItems.get(i);
            String videoId = item.getSnippet().getResourceId().getVideoId();

            Optional<Video> existingVideo = videoRepository.findByYoutubeVideoId(videoId);
            if (existingVideo.isEmpty()) {
                String duration = durations.getOrDefault(videoId, "00:00");
                String thumbnailUrl = null;
                if (item.getSnippet().getThumbnails() != null) {
                    if (item.getSnippet().getThumbnails().getHigh() != null) {
                        thumbnailUrl = item.getSnippet().getThumbnails().getHigh().getUrl();
                    } else if (item.getSnippet().getThumbnails().getMedium() != null) {
                        thumbnailUrl = item.getSnippet().getThumbnails().getMedium().getUrl();
                    }
                }

                Video video = Video.builder()
                        .playlist(playlist)
                        .youtubeVideoId(videoId)
                        .title(item.getSnippet().getTitle())
                        .thumbnail(thumbnailUrl)
                        .duration(duration)
                        .orderNumber(i)
                        .build();
                videoRepository.save(video);
            }
        }
    }

    private String extractPlaylistId(String url) {
        String pattern = "(?:list=)([a-zA-Z0-9_-]+)";
        Pattern compiledPattern = Pattern.compile(pattern);
        Matcher matcher = compiledPattern.matcher(url);
        if (matcher.find()) {
            return matcher.group(1);
        }
        return null;
    }

    @Transactional
    public void markVideoCompleted(UUID userId, UUID videoId) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found"));
        Video video = videoRepository.findById(videoId)
                .orElseThrow(() -> new IllegalArgumentException("Video not found"));

        Optional<UserVideoProgress> progressOpt = userVideoProgressRepository.findByUserIdAndVideoId(userId, videoId);
        
        if (progressOpt.isPresent()) {
            UserVideoProgress progress = progressOpt.get();
            if (!progress.isCompleted()) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
                userVideoProgressRepository.save(progress);
            }
        } else {
            UserVideoProgress progress = UserVideoProgress.builder()
                    .user(user)
                    .video(video)
                    .completed(true)
                    .completedAt(LocalDateTime.now())
                    .build();
            userVideoProgressRepository.save(progress);
        }
    }
    
    public List<UserVideoProgress> getUserProgressForSubject(UUID userId, UUID subjectId) {
        return userVideoProgressRepository.findByUserIdAndVideoPlaylistSubjectId(userId, subjectId);
    }
    
    public List<UserVideoProgress> getAllUserProgress(UUID userId) {
        return userVideoProgressRepository.findByUserId(userId);
    }
}
