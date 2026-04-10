package com.micesign.repository;

import com.micesign.domain.DocSequence;
import jakarta.persistence.LockModeType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface DocSequenceRepository extends JpaRepository<DocSequence, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @Query("SELECT ds FROM DocSequence ds WHERE ds.templateCode = :templateCode AND ds.year = :year")
    Optional<DocSequence> findByTemplateCodeAndYearForUpdate(
            @Param("templateCode") String templateCode,
            @Param("year") int year);
}
