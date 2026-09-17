package com.project.zeevCode.dto;

import lombok.Builder;
import lombok.Data;
import java.util.List;
import java.util.UUID;

@Data
@Builder
public class CollectionResponse {
    private UUID id;
    private String name;
    private String slug;
    private String description;
    private List<ProblemResponse> problems;
}
