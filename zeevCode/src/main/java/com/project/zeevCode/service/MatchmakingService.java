package com.project.zeevCode.service;

import com.project.zeevCode.dto.MatchmakingMessage;
import com.project.zeevCode.entity.Match;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.UUID;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.Map;

@Service
@RequiredArgsConstructor
@Slf4j
public class MatchmakingService {

    private final MatchService matchService;
    private final SimpMessagingTemplate messagingTemplate;

    // Queue to maintain FIFO order
    private final ConcurrentLinkedQueue<UUID> waitingQueue = new ConcurrentLinkedQueue<>();
    // Map to track queued users and their entry time (for duplicates and timeouts)
    private final Map<UUID, Long> queuedUsers = new ConcurrentHashMap<>();

    private static final long QUEUE_TIMEOUT_MS = 10000; // 10 seconds

    public synchronized void joinQueue(UUID userId) {
        if (queuedUsers.containsKey(userId)) {
            log.warn("User {} is already in the queue. Ignoring.", userId);
            return;
        }

        log.info("User {} joined matchmaking queue.", userId);
        waitingQueue.offer(userId);
        queuedUsers.put(userId, System.currentTimeMillis());

        tryMatch();
    }

    public synchronized void leaveQueue(UUID userId) {
        if (queuedUsers.remove(userId) != null) {
            waitingQueue.remove(userId);
            log.info("User {} left matchmaking queue.", userId);
        }
    }

    private synchronized void tryMatch() {
        if (waitingQueue.size() >= 2) {
            UUID player1 = waitingQueue.poll();
            UUID player2 = waitingQueue.poll();

            if (player1 != null && player2 != null) {
                queuedUsers.remove(player1);
                queuedUsers.remove(player2);

                try {
                    log.info("Match found for {} and {}", player1, player2);
                    Match match = matchService.createMatch(player1, player2);
                    matchService.startMatch(match.getId());

                    MatchmakingMessage msg = MatchmakingMessage.builder()
                            .type("MATCH_FOUND")
                            .matchId(match.getId())
                            .build();

                    messagingTemplate.convertAndSend("/topic/matchmaking/" + player1, msg);
                    messagingTemplate.convertAndSend("/topic/matchmaking/" + player2, msg);
                } catch (Exception e) {
                    log.error("Error creating match, re-queueing players", e);
                    // On error, re-queue them safely
                    joinQueue(player1);
                    joinQueue(player2);
                }
            }
        }
    }

    @Scheduled(fixedRate = 2000)
    public synchronized void evictStaleUsers() {
        long now = System.currentTimeMillis();
        for (Map.Entry<UUID, Long> entry : queuedUsers.entrySet()) {
            if (now - entry.getValue() > QUEUE_TIMEOUT_MS) {
                UUID userId = entry.getKey();
                log.info("User {} timed out in matchmaking queue.", userId);
                leaveQueue(userId);

                MatchmakingMessage timeoutMsg = MatchmakingMessage.builder()
                        .type("TIMEOUT")
                        .build();
                messagingTemplate.convertAndSend("/topic/matchmaking/" + userId, timeoutMsg);
            }
        }
    }
}
