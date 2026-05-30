package com.project.zeevCode.repository;

import com.project.zeevCode.entity.TestCase;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.UUID;

public interface TestCaseRepository extends JpaRepository<TestCase, UUID> {
    List<TestCase> findByProblemId(UUID problemId);
    List<TestCase> findByProblemIdAndHiddenFalse(UUID problemId);
}
