package com.project.zeevCode.dto;

import com.fasterxml.jackson.annotation.JsonIgnoreProperties;
import lombok.Data;
import java.util.List;

@Data
@JsonIgnoreProperties(ignoreUnknown = true)
public class YouTubeVideoDto {
    private List<Item> items;

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class Item {
        private String id;
        private ContentDetails contentDetails;
    }

    @Data
    @JsonIgnoreProperties(ignoreUnknown = true)
    public static class ContentDetails {
        private String duration;
    }
}
