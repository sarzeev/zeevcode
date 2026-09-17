package com.project.zeevCode.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class DashboardResponse {
    private int totalProblems;
    private int totalSolved;
    private int totalMastered;
    private int pendingRevision1;
    private int pendingRevision2;
    private int pendingRevision3;
}
