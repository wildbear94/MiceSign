package com.micesign.repository;

import com.micesign.domain.User;
import com.micesign.domain.enums.UserRole;
import com.micesign.domain.enums.UserStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.JpaSpecificationExecutor;

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
}
