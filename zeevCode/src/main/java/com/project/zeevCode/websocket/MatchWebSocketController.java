package com.project.zeevCode.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.handler.annotation.Payload;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Controller;

import java.time.LocalDateTime;

@Controller
@RequiredArgsConstructor
public class MatchWebSocketController {

    private final SimpMessagingTemplate messagingTemplate;

    @MessageMapping("/match/{matchId}/join")
    public void joinMatch(@DestinationVariable String matchId, @Payload MatchMessage message) {
        MatchMessage responseMessage = MatchMessage.builder()
                .type("PLAYER_JOINED")
                .matchId(matchId)
                .userId(message.getUserId())
                .timestamp(LocalDateTime.now())
                .build();
        messagingTemplate.convertAndSend("/topic/match/" + matchId, responseMessage);
    }

    public void sendMatchUpdate(String matchId, MatchMessage message) {
        messagingTemplate.convertAndSend("/topic/match/" + matchId, message);
    }
}
