package com.project.zeevCode.service;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.project.zeevCode.dto.SeedResult;
import com.project.zeevCode.entity.Problem;
import com.project.zeevCode.entity.ProblemCollection;
import com.project.zeevCode.entity.ProblemCollectionMembership;
import com.project.zeevCode.enums.Difficulty;
import com.project.zeevCode.repository.ProblemCollectionMembershipRepository;
import com.project.zeevCode.repository.ProblemCollectionRepository;
import com.project.zeevCode.repository.ProblemRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.core.io.ClassPathResource;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

@Slf4j
@Service
@RequiredArgsConstructor
public class NeetCodeSeederService {

    private final ProblemRepository problemRepository;
    private final ProblemCollectionRepository collectionRepository;
    private final ProblemCollectionMembershipRepository membershipRepository;
    private final ObjectMapper objectMapper;

    @Transactional
    public SeedResult seedNeetCode150(boolean dryRun) {
        int total = 0, created = 0, skipped = 0, failed = 0;
        List<String> details = new ArrayList<>();

        try {
            ProblemCollection neetcodeCollection = null;
            if (!dryRun) {
                neetcodeCollection = collectionRepository.findBySlug("neetcode-150")
                        .orElseGet(() -> collectionRepository.save(
                                ProblemCollection.builder()
                                        .name("NeetCode 150")
                                        .slug("neetcode-150")
                                        .description("The classic NeetCode 150 problem list.")
                                        .build()
                        ));
            }

            ClassPathResource resource = new ClassPathResource("neetcode150.json");
            try (InputStream is = resource.getInputStream()) {
                List<JsonNode> problems = objectMapper.readValue(is, new TypeReference<>() {});
                total = problems.size();
                
                int orderIndex = 1;
                for (JsonNode node : problems) {
                    try {
                        String title = node.get("problem").asText();
                        String code = node.get("code").asText(); // e.g. "0001-two-sum"
                        String rawDifficulty = node.get("difficulty").asText();
                        String pattern = node.has("pattern") ? node.get("pattern").asText() : null;
                        String link = node.has("link") ? node.get("link").asText() : null;

                        String slug = code;
                        int leetcodeNumber = 0;
                        if (code.contains("-")) {
                            String prefix = code.substring(0, code.indexOf("-"));
                            try {
                                leetcodeNumber = Integer.parseInt(prefix);
                                slug = code.substring(code.indexOf("-") + 1);
                            } catch (NumberFormatException ignored) {}
                        }

                        Difficulty difficulty = mapDifficulty(rawDifficulty);
                        String sourceUrl = link != null ? "https://neetcode.io/problems/" + link : null;
                        
                        if (problemRepository.existsBySlug(slug)) {
                            skipped++;
                            details.add("SKIP: " + slug + " already exists");
                            
                            // Make sure it's in the collection
                            if (!dryRun) {
                                Optional<Problem> p = problemRepository.findBySlug(slug);
                                if (p.isPresent() && !membershipRepository.existsByProblemIdAndCollectionId(p.get().getId(), neetcodeCollection.getId())) {
                                    membershipRepository.save(ProblemCollectionMembership.builder()
                                            .problem(p.get())
                                            .collection(neetcodeCollection)
                                            .orderIndex(orderIndex)
                                            .build());
                                }
                            }
                        } else {
                            if (!dryRun) {
                                Problem problem = Problem.builder()
                                        .title(title)
                                        .slug(slug)
                                        .difficulty(difficulty)
                                        .category(pattern)
                                        .sourceUrl(sourceUrl)
                                        .leetcodeNumber(leetcodeNumber > 0 ? leetcodeNumber : null)
                                        .description("[NeetCode 150 - " + (pattern != null ? pattern : "General") + "]\\n\\nView this problem at: " + (sourceUrl != null ? sourceUrl : "NeetCode") + "\\n\\n(Please add a proper description via the admin panel)")
                                        .templateCode("// TODO: Add template code\\nclass Solution {\\n\\n}")
                                        .timeLimit(2000)
                                        .memoryLimit(256)
                                        .isActive(true)
                                        .isSeeded(true)
                                        .build();
                                
                                Problem saved = problemRepository.save(problem);
                                
                                membershipRepository.save(ProblemCollectionMembership.builder()
                                        .problem(saved)
                                        .collection(neetcodeCollection)
                                        .orderIndex(orderIndex)
                                        .build());
                            }
                            created++;
                            details.add("CREATE: " + slug);
                        }
                    } catch (Exception e) {
                        failed++;
                        details.add("FAIL: Error processing node: " + e.getMessage());
                    }
                    orderIndex++;
                }
            }
        } catch (Exception e) {
            log.error("Failed to seed NeetCode150", e);
            details.add("FATAL: " + e.getMessage());
        }

        return new SeedResult(dryRun, total, created, skipped, failed, details);
    }

    private Difficulty mapDifficulty(String raw) {
        if (raw == null) return Difficulty.MEDIUM;
        String upper = raw.toUpperCase();
        if (upper.contains("EASY")) return Difficulty.EASY;
        if (upper.contains("HARD")) return Difficulty.HARD;
        return Difficulty.MEDIUM;
    }
}
