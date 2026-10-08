package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Entitlement;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;
import java.util.UUID;

public interface EntitlementRepository extends JpaRepository<Entitlement, UUID> {

    Optional<Entitlement> findByUserIdAndProductKey(UUID userId, String productKey);

    boolean existsByUserIdAndProductKeyAndStatus(
            UUID userId, String productKey, Entitlement.Status status);
}
