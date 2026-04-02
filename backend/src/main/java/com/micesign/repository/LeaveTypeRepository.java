package com.micesign.repository;

import com.micesign.domain.LeaveType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface LeaveTypeRepository extends JpaRepository<LeaveType, Long> {

    List<LeaveType> findByIsActiveTrueOrderBySortOrder();
}
