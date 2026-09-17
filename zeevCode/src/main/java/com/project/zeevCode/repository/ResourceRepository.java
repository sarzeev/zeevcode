package com.project.zeevCode.repository;

import com.project.zeevCode.entity.Resource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.UUID;

@Repository
public interface ResourceRepository extends JpaRepository<Resource, UUID> {
    List<Resource> findBySubjectId(UUID subjectId);
}
