package com.project.zeevCode.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.zeevCode.entity.FundamentalsRepoCache;
import com.project.zeevCode.repository.FundamentalsRepoCacheRepository;
import com.project.zeevCode.repository.FundamentalsRenderCacheRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.LocalDateTime;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import java.util.stream.Collectors;

@Service
public class GitHubRepoSyncService {

    private static final Logger log = LoggerFactory.getLogger(GitHubRepoSyncService.class);
    private static final String REPO_OWNER = "23se02cs102";
    private static final String REPO_NAME = "CS-Fundamentals";
    private static final String GITHUB_API_BASE = "https://api.github.com";
    private static final Set<String> SKIP_PATHS = Set.of(
        ".github", "assets", "README.md", "LICENSE", "SECURITY.md", "CODE_OF_CONDUCT.md"
    );

    private final FundamentalsRepoCacheRepository repoCacheRepository;
    private final FundamentalsRenderCacheRepository renderCacheRepository;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    @Value("${github.pat:}")
    private String githubPat;

    @Autowired
    public GitHubRepoSyncService(
            FundamentalsRepoCacheRepository repoCacheRepository,
            FundamentalsRenderCacheRepository renderCacheRepository) {
        this.repoCacheRepository = repoCacheRepository;
        this.renderCacheRepository = renderCacheRepository;
        this.httpClient = HttpClient.newBuilder().build();
        this.objectMapper = new ObjectMapper();
    }

    @Transactional
    public void syncRepoTree() {
        try {
            log.info("Starting GitHub repo sync for {}/{}", REPO_OWNER, REPO_NAME);
            String defaultBranchSha = getDefaultBranchSha();
            if (defaultBranchSha == null) {
                log.error("Could not fetch default branch SHA, aborting sync");
                return;
            }
            String treeJson = fetchRepoTree(defaultBranchSha);
            if (treeJson == null) {
                log.error("Could not fetch repo tree, aborting sync");
                return;
            }
            processRepoTree(treeJson, defaultBranchSha);
            log.info("GitHub repo sync completed successfully");
        } catch (Exception e) {
            log.error("Error during GitHub repo sync: {}", e.getMessage(), e);
        }
    }

    private String getDefaultBranchSha() {
        try {
            String url = GITHUB_API_BASE + "/repos/" + REPO_OWNER + "/" + REPO_NAME + "/branches/main";
            HttpRequest request = buildAuthRequest(url);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("GitHub API returned {} for branch info", response.statusCode());
                return null;
            }
            JsonNode node = objectMapper.readTree(response.body());
            return node.at("/commit/sha").asText(null);
        } catch (Exception e) {
            log.error("Failed to get default branch SHA: {}", e.getMessage());
            return null;
        }
    }

    private String fetchRepoTree(String sha) {
        try {
            String url = GITHUB_API_BASE + "/repos/" + REPO_OWNER + "/" + REPO_NAME
                    + "/git/trees/" + sha + "?recursive=1";
            HttpRequest request = buildAuthRequest(url);
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() != 200) {
                log.warn("GitHub API returned {} for repo tree", response.statusCode());
                return null;
            }
            return response.body();
        } catch (Exception e) {
            log.error("Failed to fetch repo tree: {}", e.getMessage());
            return null;
        }
    }

    @Transactional
    protected void processRepoTree(String treeJson, String treeSha) throws Exception {
        JsonNode root = objectMapper.readTree(treeJson);
        JsonNode treeArray = root.get("tree");
        if (treeArray == null || !treeArray.isArray()) {
            log.warn("No tree array in response");
            return;
        }

        // Group .md blobs by their parent folder (subject)
        Map<String, List<JsonNode>> subjectChapterMap = new LinkedHashMap<>();

        for (JsonNode item : treeArray) {
            String path = item.get("path").asText();
            String type = item.get("type").asText();

            if (!"blob".equals(type)) continue;
            if (!path.endsWith(".md") && !path.endsWith(".MD")) continue;
            if (shouldSkip(path)) continue;

            // Only top-level folder markdown (exactly one slash in path)
            String[] parts = path.split("/", -1);
            if (parts.length != 2) continue; // skip nested or root-level files

            String folderName = parts[0];
            if (SKIP_PATHS.contains(folderName)) continue;

            subjectChapterMap.computeIfAbsent(folderName, k -> new ArrayList<>()).add(item);
        }

        LocalDateTime now = LocalDateTime.now();
        Set<String> seenPaths = new HashSet<>();

        for (Map.Entry<String, List<JsonNode>> entry : subjectChapterMap.entrySet()) {
            String folderName = entry.getKey();
            String subjectSlug = toSlug(folderName);
            List<JsonNode> chapters = entry.getValue();

            // Sort chapters by their filename
            chapters.sort(Comparator.comparing(n -> n.get("path").asText()));

            for (int i = 0; i < chapters.size(); i++) {
                JsonNode chapter = chapters.get(i);
                String chapterPath = chapter.get("path").asText();
                String blobSha = chapter.get("sha").asText();
                int fileSize = chapter.has("size") ? chapter.get("size").asInt() : 0;
                String[] pathParts = chapterPath.split("/", 2);
                String filename = pathParts[1];
                String chapterName = toChapterName(filename);
                int order = extractOrder(filename, i);

                seenPaths.add(chapterPath);

                // Check if already cached with same blobSha
                boolean exists = repoCacheRepository.existsBySubjectSlugAndChapterPathAndBlobSha(
                        subjectSlug, chapterPath, blobSha);

                if (!exists) {
                    // Upsert
                    Optional<FundamentalsRepoCache> existing = repoCacheRepository
                            .findBySubjectSlugAndChapterPath(subjectSlug, chapterPath);

                    FundamentalsRepoCache cache;
                    if (existing.isPresent()) {
                        cache = existing.get();
                        // blobSha changed — invalidate render cache
                        renderCacheRepository.deleteById(cache.getBlobSha());
                    } else {
                        cache = FundamentalsRepoCache.builder().build();
                    }

                    cache.setSubjectSlug(subjectSlug);
                    cache.setSubjectName(folderName);
                    cache.setChapterPath(chapterPath);
                    cache.setChapterName(chapterName);
                    cache.setChapterOrder(order);
                    cache.setBlobSha(blobSha);
                    cache.setFileSize(fileSize);
                    cache.setTreeSha(treeSha);
                    cache.setCachedAt(now);
                    repoCacheRepository.save(cache);
                }
            }
        }

        // Remove orphaned chapters (paths that no longer exist in the repo)
        // For each subject, delete any entry whose chapter_path is not in seenPaths
        Map<String, List<String>> pathsBySubject = seenPaths.stream()
                .collect(Collectors.groupingBy(p -> toSlug(p.split("/")[0])));

        for (Map.Entry<String, List<String>> entry : pathsBySubject.entrySet()) {
            repoCacheRepository.deleteOrphanedChapters(entry.getKey(), entry.getValue());
        }
    }

    private boolean shouldSkip(String path) {
        for (String skip : SKIP_PATHS) {
            if (path.startsWith(skip + "/") || path.equals(skip)) return true;
        }
        return false;
    }

    public static String toSlug(String folderName) {
        return folderName.toLowerCase()
                .replaceAll("[^a-z0-9]+", "-")
                .replaceAll("^-|-$", "");
    }

    private String toChapterName(String filename) {
        // Remove .md extension and leading order prefix like "Ch 01 - "
        String name = filename.replaceAll("\\.md$", "").replaceAll("\\.MD$", "");
        // Remove leading "Ch NN - " or "ChNN - " pattern
        name = name.replaceAll("^Ch\\s*\\d+\\s*[-:]\\s*", "");
        return name.trim();
    }

    private int extractOrder(String filename, int fallback) {
        Pattern p = Pattern.compile("^(?:Ch\\s*)(\\d+)", Pattern.CASE_INSENSITIVE);
        Matcher m = p.matcher(filename);
        if (m.find()) {
            return Integer.parseInt(m.group(1));
        }
        // Syllabus goes last
        if (filename.toLowerCase().contains("syllabus")) return 999;
        return fallback;
    }

    private HttpRequest buildAuthRequest(String url) {
        HttpRequest.Builder builder = HttpRequest.newBuilder()
                .uri(URI.create(url))
                .header("Accept", "application/vnd.github+json")
                .header("X-GitHub-Api-Version", "2022-11-28")
                .GET();
        if (githubPat != null && !githubPat.isBlank()) {
            builder.header("Authorization", "Bearer " + githubPat);
        }
        return builder.build();
    }

    String getConfiguredRepositoryFullName() {
        return REPO_OWNER + "/" + REPO_NAME;
    }
}
