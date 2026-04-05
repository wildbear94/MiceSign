package com.micesign.repository;

import com.micesign.domain.OptionSet;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OptionSetRepository extends JpaRepository<OptionSet, Long> {

    List<OptionSet> findByIsActiveTrueOrderByNameAsc();

    boolean existsByName(String name);
}
