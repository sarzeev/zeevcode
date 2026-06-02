package com.project.zeevCode.repository;

import com.project.zeevCode.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.Optional;
import java.util.UUID;

public interface UserRepository extends JpaRepository<User, UUID> {
    Optional<User> findByUsername(String username);
    Optional<User> findByEmail(String email);
    Optional<User> findByFirebaseUid(String firebaseUid);
    boolean existsByUsername(String username);
    boolean existsByEmail(String email);
    
    java.util.List<User> findTop3ByOrderByRatingDesc();
    java.util.List<User> findByUsernameContainingIgnoreCase(String username);
    long countByRoleAndIsActiveTrue(com.project.zeevCode.entity.UserRole role);
}
