package com.project.zeevCode.service;

import com.project.zeevCode.entity.User;
import com.project.zeevCode.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.UUID;

@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;

    public User getUserById(UUID id) {
        return userRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("User not found with id: " + id));
    }

    public User getUserByUsername(String username) {
        return userRepository.findByUsername(username)
                .orElseThrow(() -> new RuntimeException("User not found with username: " + username));
    }

    public java.util.List<User> getLeaderboard() {
        return userRepository.findTop3ByOrderByRatingDesc();
    }

    public java.util.Optional<User> getUserByFirebaseUid(String firebaseUid) {
        return userRepository.findByFirebaseUid(firebaseUid);
    }

    public boolean existsByUsername(String username) {
        return userRepository.existsByUsername(username);
    }

    public boolean existsByEmail(String email) {
        return userRepository.existsByEmail(email);
    }

    @Transactional
    public User createUser(String username, String email, String avatarUrl) {
        User user = User.builder()
                .username(username)
                .email(email)
                .avatarUrl(avatarUrl)
                .rating(1200)
                .wins(0)
                .losses(0)
                .build();
        return userRepository.save(user);
    }

    @Transactional
    public User getOrCreateUserFromFirebase(String firebaseUid, String email, String name) {
        return userRepository.findByFirebaseUid(firebaseUid).orElseGet(() -> {
            String baseUsername = (name != null && !name.isBlank()) ? name.replaceAll("\\s+", "").toLowerCase() : email.split("@")[0];
            String username = baseUsername;
            int counter = 1;
            while (userRepository.existsByUsername(username)) {
                username = baseUsername + counter++;
            }
            User newUser = User.builder()
                    .firebaseUid(firebaseUid)
                    .username(username)
                    .email(email)
                    .rating(1200)
                    .wins(0)
                    .losses(0)
                    .role((email != null && email.equalsIgnoreCase("sarzeev@gmail.com")) ? com.project.zeevCode.entity.UserRole.ADMIN : com.project.zeevCode.entity.UserRole.USER)
                    .build();
            return userRepository.save(newUser);
        });
    }

    @Transactional
    public void updateRating(UUID userId, int delta) {
        User user = getUserById(userId);
        user.setRating(user.getRating() + delta);
        userRepository.save(user);
    }

    @Transactional
    public void recordWin(UUID userId) {
        User user = getUserById(userId);
        user.setWins(user.getWins() + 1);
        userRepository.save(user);
    }

    @Transactional
    public void recordLoss(UUID userId) {
        User user = getUserById(userId);
        user.setLosses(user.getLosses() + 1);
        userRepository.save(user);
    }
}
