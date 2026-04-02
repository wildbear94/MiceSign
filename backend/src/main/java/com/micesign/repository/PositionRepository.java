package com.micesign.repository;

import com.micesign.domain.Position;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface PositionRepository extends JpaRepository<Position, Long> {

    List<Position> findAllByOrderBySortOrderAsc();

    boolean existsByName(String name);

    boolean existsByNameAndIdNot(String name, Long id);

    long countByIdAndIsActiveTrue(Long id);

    @Query("SELECT COUNT(u) FROM User u WHERE u.positionId = :positionId AND u.status = com.micesign.domain.enums.UserStatus.ACTIVE")
    long countActiveUsersByPosition(@Param("positionId") Long positionId);
}
