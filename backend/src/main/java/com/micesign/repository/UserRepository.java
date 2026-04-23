package com.micesign.repository;

import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface UserRepository extends JpaRepository<User, Long>, JpaSpecificationExecutor<User> {

    Optional<User> findByEmail(String email);

    long countByRoleAndStatus(UserRole role, UserStatus status);

    long countByDepartmentIdAndStatusNot(Long departmentId, UserStatus status);

    long countByDepartmentIdAndStatus(Long departmentId, UserStatus status);

    long countByPositionIdAndStatus(Long positionId, UserStatus status);

    boolean existsByEmployeeNo(String employeeNo);

    boolean existsByEmployeeNoAndIdNot(String employeeNo, Long id);

    boolean existsByEmailAndIdNot(String email, Long id);

    List<User> findByDepartmentIdAndStatus(Long departmentId, UserStatus status);

    List<User> findByRoleAndStatus(UserRole role, UserStatus status);

    // Phase 31 D-A4 — 부서 계층 descendant 에서 user id scalar 수집.
    // D-A7 locked: UserStatus 필터 없음 (ACTIVE/INACTIVE/RETIRED 모두 포함 — 과거 퇴직자 기안 문서도 ADMIN 스코프 카운트 반영)
    // NOTIF-04 의 "RETIRED 수신자 skip" 은 발송 대상 필터이고 본 메서드와 정책 다름.
    @Query("SELECT u.id FROM User u WHERE u.departmentId IN :deptIds")
    List<Long> findIdsByDepartmentIdIn(@Param("deptIds") List<Long> deptIds);
}
