package com.micesign.repository;

import com.micesign.domain.Department;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

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

    /**
     * Phase 31 D-A6 / D-A9 Option 1 — 부서 계층 descendant ID 수집 (MariaDB WITH RECURSIVE CTE).
     * 주어진 deptId 를 앵커로 하여 self + 모든 하위 부서 id 반환 (is_active 불문).
     * 소비자: DashboardService (Phase 31 ADMIN 스코프, Plan 02), DocumentService.searchDocuments (Phase 30 predicate 재귀 upgrade, Plan 06).
     *
     * MariaDB 10.11+ WITH RECURSIVE 지원. JPQL WITH 대신 nativeQuery 사용 —
     * Spring Data JPA HQL parser 의 CTE 지원 버전 의존성 회피.
     * 일반 MiceSign 부서 트리 깊이 ≤ 5, MariaDB cte_max_recursion_depth default 1000 여유.
     */
    @Query(value = """
        WITH RECURSIVE dept_tree(id) AS (
          SELECT id FROM department WHERE id = :deptId
          UNION ALL
          SELECT d.id
          FROM department d
          INNER JOIN dept_tree t ON d.parent_id = t.id
        )
        SELECT id FROM dept_tree
        """, nativeQuery = true)
    List<Long> findDescendantIds(@Param("deptId") Long deptId);
}
