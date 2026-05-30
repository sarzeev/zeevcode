package com.project.zeevCode.controller;

import com.project.zeevCode.dto.UserResponse;
import com.project.zeevCode.entity.User;
import com.project.zeevCode.service.UserService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.UUID;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable UUID id) {
        User user = userService.getUserById(id);
        return ResponseEntity.ok(mapToUserResponse(user));
    }

    @GetMapping("/username/{username}")
    public ResponseEntity<UserResponse> getUserByUsername(@PathVariable String username) {
        try {
            User user = userService.getUserByUsername(username);
            return ResponseEntity.ok(mapToUserResponse(user));
        } catch (RuntimeException e) {
            return ResponseEntity.notFound().build();
        }
    }
    

    @PostMapping
    public ResponseEntity<UserResponse> createUser(@RequestBody @Valid CreateUserRequest request) {
        User user = userService.createUser(request.username(), request.email(), request.avatarUrl());
        return new ResponseEntity<>(mapToUserResponse(user), HttpStatus.CREATED);
    }

    private UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .avatarUrl(user.getAvatarUrl())
                .rating(user.getRating())
                .wins(user.getWins())
                .losses(user.getLosses())
                .build();
    }

    private record CreateUserRequest(
            @NotBlank @Size(min = 3, max = 50) String username,
            @NotBlank @Email @Size(max = 255) String email,
            String avatarUrl
    ) {}
}
