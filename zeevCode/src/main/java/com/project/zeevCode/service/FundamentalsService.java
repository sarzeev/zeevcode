package com.project.zeevCode.service;

import com.project.zeevCode.dto.YouTubePlaylistItemDto;
import com.project.zeevCode.entity.*;
import com.project.zeevCode.repository.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class FundamentalsService {

    // ─── New GitHub-based dependencies ──────────────────────────────────────────
    private final FundamentalsRepoCacheRepository repoCacheRepository;
    private final FundamentalsChapterProgressRepository chapterProgressRepository;
    private final MarkdownRenderService markdownRenderService;

    // ─── Legacy video-based dependencies (kept for AdminFundamentalsController) ─
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
            FundamentalsRepoCacheRepository repoCacheRepository,
            FundamentalsChapterProgressRepository chapterProgressRepository,
            MarkdownRenderService markdownRenderService,
            SubjectRepository subjectRepository,
            PlaylistRepository playlistRepository,
            VideoRepository videoRepository,
            UserVideoProgressRepository userVideoProgressRepository,
            UserRepository userRepository,
            YouTubeService youtubeService,
            ResourceRepository resourceRepository,
            QuizQuestionRepository quizQuestionRepository
    ) {
        this.repoCacheRepository = repoCacheRepository;
        this.chapterProgressRepository = chapterProgressRepository;
        this.markdownRenderService = markdownRenderService;
        this.subjectRepository = subjectRepository;
        this.playlistRepository = playlistRepository;
        this.videoRepository = videoRepository;
        this.userVideoProgressRepository = userVideoProgressRepository;
        this.userRepository = userRepository;
        this.youtubeService = youtubeService;
        this.resourceRepository = resourceRepository;
        this.quizQuestionRepository = quizQuestionRepository;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // New GitHub-backed methods
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Dashboard: list of subjects with chapter count and user progress.
     * All data read from the repo cache — never fetches GitHub live.
     */
    public List<Map<String, Object>> getDashboard(UUID userId) {
        List<Object[]> distinctSubjects = repoCacheRepository.findDistinctSubjects();
        List<Map<String, Object>> result = new ArrayList<>();

        for (Object[] row : distinctSubjects) {
            String subjectSlug = (String) row[0];
            String subjectName = (String) row[1];

            long totalChapters = repoCacheRepository.countBySubjectSlug(subjectSlug);
            long completedChapters = 0;

            if (userId != null) {
                completedChapters = chapterProgressRepository
                        .countByUserIdAndSubjectSlugAndCompleted(userId, subjectSlug, true);
            }

            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("subjectSlug", subjectSlug);
            entry.put("subjectName", subjectName);
            entry.put("totalChapters", totalChapters);
            entry.put("completedChapters", completedChapters);
            result.add(entry);
        }

        return result;
    }

    /**
     * Subject detail: chapter list with per-chapter completion status.
     */
    public Map<String, Object> getSubjectDetails(String subjectSlug, UUID userId) {
        List<FundamentalsRepoCache> chapters = repoCacheRepository
                .findBySubjectSlugOrderByChapterOrderAsc(subjectSlug);

        if (chapters.isEmpty()) {
            throw new NoSuchElementException("Subject not found or no chapters cached: " + subjectSlug);
        }

        String subjectName = chapters.get(0).getSubjectName();

        List<String> completedPaths = new ArrayList<>();
        if (userId != null) {
            completedPaths = chapterProgressRepository.findByUserIdAndSubjectSlug(userId, subjectSlug)
                    .stream()
                    .filter(FundamentalsChapterProgress::isCompleted)
                    .map(FundamentalsChapterProgress::getChapterPath)
                    .collect(Collectors.toList());
        }
        final Set<String> completedSet = new HashSet<>(completedPaths);

        List<Map<String, Object>> chapterList = new ArrayList<>();
        for (FundamentalsRepoCache chapter : chapters) {
            Map<String, Object> c = new LinkedHashMap<>();
            c.put("path", chapter.getChapterPath());
            c.put("name", chapter.getChapterName());
            c.put("order", chapter.getChapterOrder());
            c.put("blobSha", chapter.getBlobSha());
            c.put("completed", completedSet.contains(chapter.getChapterPath()));
            chapterList.add(c);
        }

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("subjectSlug", subjectSlug);
        result.put("subjectName", subjectName);
        result.put("chapters", chapterList);
        result.put("totalChapters", chapters.size());
        result.put("completedChapters", completedSet.size());
        return result;
    }

    /**
     * Chapter content: returns rendered HTML. Renders and caches on cache miss.
     */
    public String getChapterContent(String subjectSlug, String chapterPath) {
        Optional<FundamentalsRepoCache> cacheEntry = repoCacheRepository
                .findBySubjectSlugAndChapterPath(subjectSlug, chapterPath);
        if (cacheEntry.isEmpty()) {
            throw new NoSuchElementException("Chapter not found in cache: " + chapterPath);
        }
        return markdownRenderService.getRenderedHtml(cacheEntry.get());
    }

    /**
     * Mark a chapter as completed for a user.
     */
    @Transactional
    public void markChapterCompleted(UUID userId, String subjectSlug, String chapterPath) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("User not found: " + userId));

        Optional<FundamentalsChapterProgress> existing = chapterProgressRepository
                .findByUserIdAndChapterPath(userId, chapterPath);

        if (existing.isPresent()) {
            FundamentalsChapterProgress progress = existing.get();
            if (!progress.isCompleted()) {
                progress.setCompleted(true);
                progress.setCompletedAt(LocalDateTime.now());
                chapterProgressRepository.save(progress);
            }
        } else {
            FundamentalsChapterProgress progress = FundamentalsChapterProgress.builder()
                    .user(user)
                    .subjectSlug(subjectSlug)
                    .chapterPath(chapterPath)
                    .completed(true)
                    .completedAt(LocalDateTime.now())
                    .build();
            chapterProgressRepository.save(progress);
        }
    }

    /**
     * Overall progress: per-subject percentages and average across all subjects.
     * Overall % = average of individual subject percentages (not weighted by chapter count).
     */
    public Map<String, Object> getOverallProgress(UUID userId) {
        List<Object[]> distinctSubjects = repoCacheRepository.findDistinctSubjects();
        List<Map<String, Object>> subjects = new ArrayList<>();
        int totalPercent = 0;

        for (Object[] row : distinctSubjects) {
            String slug = (String) row[0];
            String name = (String) row[1];
            long total = repoCacheRepository.countBySubjectSlug(slug);
            long completed = userId != null
                    ? chapterProgressRepository.countByUserIdAndSubjectSlugAndCompleted(userId, slug, true)
                    : 0;

            int percent = total > 0 ? (int) Math.round((completed * 100.0) / total) : 0;
            totalPercent += percent;

            Map<String, Object> s = new LinkedHashMap<>();
            s.put("subjectSlug", slug);
            s.put("subjectName", name);
            s.put("totalChapters", total);
            s.put("completedChapters", completed);
            s.put("progressPercent", percent);
            subjects.add(s);
        }

        int overallPercent = distinctSubjects.isEmpty() ? 0
                : (int) Math.round((double) totalPercent / distinctSubjects.size());

        Map<String, Object> result = new LinkedHashMap<>();
        result.put("subjects", subjects);
        result.put("overallPercent", overallPercent);
        return result;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // Legacy methods — kept for AdminFundamentalsController compatibility
    // ═══════════════════════════════════════════════════════════════════════════

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

        List<YouTubePlaylistItemDto> validItems = new ArrayList<>();
        for (YouTubePlaylistItemDto item : items) {
            String title = item.getSnippet().getTitle();
            if (title != null && !title.equals("Private video") && !title.equals("Deleted video")) {
                validItems.add(item);
            }
        }

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
