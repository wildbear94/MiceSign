package com.micesign.repository;

import com.micesign.domain.OptionItem;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface OptionItemRepository extends JpaRepository<OptionItem, Long> {

    List<OptionItem> findByOptionSetIdAndIsActiveTrueOrderBySortOrder(Long optionSetId);
}
