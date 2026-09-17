package com.project.zeevCode.repository;

import com.project.zeevCode.entity.ProblemCollectionMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

public interface ProblemCollectionMembershipRepository extends JpaRepository<ProblemCollectionMembership, UUID> {
    List<ProblemCollectionMembership> findByCollectionId(UUID collectionId);
    boolean existsByProblemIdAndCollectionId(UUID problemId, UUID collectionId);
    List<ProblemCollectionMembership> findByCollectionIdOrderByOrderIndex(UUID collectionId);
    Optional<ProblemCollectionMembership> findByProblemIdAndCollectionId(UUID problemId, UUID collectionId);
}
