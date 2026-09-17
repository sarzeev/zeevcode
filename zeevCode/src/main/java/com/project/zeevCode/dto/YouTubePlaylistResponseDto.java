package com.project.zeevCode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class YouTubePlaylistResponseDto {
    private String nextPageToken;
    private List<YouTubePlaylistItemDto> items;
}
