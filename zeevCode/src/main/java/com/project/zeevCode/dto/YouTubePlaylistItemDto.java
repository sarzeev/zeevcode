package com.project.zeevCode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class YouTubePlaylistItemDto {
    private String id;
    private Snippet snippet;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Snippet {
        private String title;
        private Integer position;
        private ResourceId resourceId;
        private Thumbnails thumbnails;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ResourceId {
        private String videoId;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Thumbnails {
        private Thumbnail medium;
        private Thumbnail high;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Thumbnail {
        private String url;
    }
}
