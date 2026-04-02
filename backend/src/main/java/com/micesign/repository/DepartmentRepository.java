package com.micesign.repository;

import com.micesign.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface DepartmentRepository extends JpaRepository<Department, Long> {

    List<Department> findAllByOrderBySortOrderAsc();

    List<Department> findByIsActiveTrueOrderBySortOrderAsc();

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    List<Department> findByParentIdAndIsActiveTrue(Long parentId);

    boolean existsByParentIdAndIsActiveTrue(Long parentId);

    @Query("SELECT d.id, COUNT(u) FROM Department d LEFT JOIN User u ON u.departmentId = d.id AND u.status = com.micesign.domain.enums.UserStatus.ACTIVE GROUP BY d.id")
    List<Object[]> countActiveUsersByDepartment();
}
