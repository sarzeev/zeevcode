package com.project.zeevCode.service;

import com.project.zeevCode.dto.YouTubePlaylistItemDto;
import com.project.zeevCode.dto.YouTubePlaylistResponseDto;
import com.project.zeevCode.dto.YouTubeVideoDto;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

import java.time.Duration;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class YouTubeService {

    @Value("${youtube.api.key:}")
    private String apiKey;

    private final RestTemplate restTemplate;

    @Autowired
    public YouTubeService(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    public List<YouTubePlaylistItemDto> getPlaylistItems(String playlistId) {
        if (apiKey == null || apiKey.isEmpty()) {
            throw new IllegalStateException("YouTube API fetch failed. Make sure your youtube.api.key is valid in application.properties.");
        }

        List<YouTubePlaylistItemDto> allItems = new ArrayList<>();
        String nextPageToken = null;

        try {
            do {
                String url = String.format(
                    "https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&maxResults=50&playlistId=%s&key=%s",
                    playlistId, apiKey
                );
                if (nextPageToken != null && !nextPageToken.isEmpty()) {
                    url += "&pageToken=" + nextPageToken;
                }

                YouTubePlaylistResponseDto response = restTemplate.getForObject(url, YouTubePlaylistResponseDto.class);
                if (response != null && response.getItems() != null) {
                    allItems.addAll(response.getItems());
                    nextPageToken = response.getNextPageToken();
                } else {
                    nextPageToken = null;
                }
            } while (nextPageToken != null && !nextPageToken.isEmpty());
        } catch (Exception e) {
            throw new IllegalStateException("YouTube API fetch failed: " + e.getMessage());
        }

        return allItems;
    }

    public Map<String, String> getVideoDurations(List<String> videoIds) {
        Map<String, String> durations = new HashMap<>();
        if (apiKey == null || apiKey.isEmpty() || videoIds == null || videoIds.isEmpty()) {
            return durations;
        }

        try {
            for (int i = 0; i < videoIds.size(); i += 50) {
                int end = Math.min(videoIds.size(), i + 50);
                List<String> batch = videoIds.subList(i, end);
                String idsParam = String.join(",", batch);

                String url = String.format(
                    "https://www.googleapis.com/youtube/v3/videos?part=contentDetails&id=%s&key=%s",
                    idsParam, apiKey
                );

                YouTubeVideoDto response = restTemplate.getForObject(url, YouTubeVideoDto.class);
                if (response != null && response.getItems() != null) {
                    for (YouTubeVideoDto.Item item : response.getItems()) {
                        String formatted = formatDuration(item.getContentDetails().getDuration());
                        durations.put(item.getId(), formatted);
                    }
                }
            }
        } catch (Exception e) {
            System.err.println("Failed to fetch durations: " + e.getMessage());
        }
        return durations;
    }

    private String formatDuration(String isoDuration) {
        if (isoDuration == null || isoDuration.isEmpty()) return "00:00";
        try {
            Duration d = Duration.parse(isoDuration);
            long hours = d.toHours();
            long minutes = d.toMinutesPart();
            long seconds = d.toSecondsPart();

            if (hours > 0) {
                return String.format("%d:%02d:%02d", hours, minutes, seconds);
            } else {
                return String.format("%d:%02d", minutes, seconds);
            }
        } catch (Exception e) {
            return "00:00";
        }
    }
}
