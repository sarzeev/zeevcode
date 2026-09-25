package com.project.zeevCode.service;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
public class FundamentalsRefreshScheduler {

    private static final Logger log = LoggerFactory.getLogger(FundamentalsRefreshScheduler.class);

    private final GitHubRepoSyncService gitHubRepoSyncService;

    @Autowired
    public FundamentalsRefreshScheduler(GitHubRepoSyncService gitHubRepoSyncService) {
        this.gitHubRepoSyncService = gitHubRepoSyncService;
    }

    // Sync every 4 hours as TTL-based fallback
    @Scheduled(fixedDelay = 4 * 60 * 60 * 1000)
    public void scheduledSync() {
        log.info("Running scheduled fundamentals repo sync");
        try {
            gitHubRepoSyncService.syncRepoTree();
        } catch (Exception e) {
            log.error("Scheduled sync failed: {}", e.getMessage(), e);
        }
    }

    // Also sync on startup after 30 seconds delay
    @Scheduled(initialDelay = 30_000, fixedDelay = Long.MAX_VALUE)
    public void syncOnStartup() {
        log.info("Running initial fundamentals repo sync on startup");
        try {
            gitHubRepoSyncService.syncRepoTree();
        } catch (Exception e) {
            log.error("Startup sync failed: {}", e.getMessage(), e);
        }
    }
}
