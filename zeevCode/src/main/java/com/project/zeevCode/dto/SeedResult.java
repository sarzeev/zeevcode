package com.project.zeevCode.dto;

import java.util.List;

public record SeedResult(
    boolean dryRun,
    int total,
    int created,
    int skipped,
    int failed,
    List<String> details
) {}
