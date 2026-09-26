package com.project.zeevCode.service;

import com.project.zeevCode.repository.FundamentalsRenderCacheRepository;
import com.project.zeevCode.repository.FundamentalsRepoCacheRepository;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;

class FundamentalsRepositoryConfigurationTest {

    @Test
    void githubSyncUsesCanonicalFundamentalsRepository() {
        GitHubRepoSyncService service = new GitHubRepoSyncService(
                mock(FundamentalsRepoCacheRepository.class),
                mock(FundamentalsRenderCacheRepository.class)
        );
        assertEquals("23se02cs102/CS-Fundamentals", service.getConfiguredRepositoryFullName());
    }

    @Test
    void markdownRenderingUsesCanonicalFundamentalsRepository() {
        MarkdownRenderService service = new MarkdownRenderService(mock(FundamentalsRenderCacheRepository.class));
        assertEquals("23se02cs102/CS-Fundamentals", service.getConfiguredRepositoryFullName());
    }
}
