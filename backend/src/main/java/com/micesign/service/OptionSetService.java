package com.micesign.service;

import com.micesign.common.exception.BusinessException;
import com.micesign.domain.OptionItem;
import com.micesign.domain.OptionSet;
import com.micesign.dto.option.CreateOptionSetRequest;
import com.micesign.dto.option.OptionSetResponse;
import com.micesign.mapper.OptionSetMapper;
import com.micesign.repository.OptionSetRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class OptionSetService {

    private final OptionSetRepository optionSetRepository;
    private final OptionSetMapper optionSetMapper;

    public OptionSetService(OptionSetRepository optionSetRepository,
                            OptionSetMapper optionSetMapper) {
        this.optionSetRepository = optionSetRepository;
        this.optionSetMapper = optionSetMapper;
    }

    public OptionSetResponse create(CreateOptionSetRequest req) {
        if (optionSetRepository.existsByName(req.name())) {
            throw new BusinessException("OPT_NAME_DUPLICATE", "이미 존재하는 옵션 세트명입니다: " + req.name());
        }

        OptionSet optionSet = new OptionSet();
        optionSet.setName(req.name());
        optionSet.setDescription(req.description());

        int sortOrder = 0;
        for (var itemReq : req.items()) {
            OptionItem item = new OptionItem();
            item.setOptionSet(optionSet);
            item.setValue(itemReq.value());
            item.setLabel(itemReq.label());
            item.setSortOrder(sortOrder++);
            optionSet.getItems().add(item);
        }

        return optionSetMapper.toResponse(optionSetRepository.save(optionSet));
    }

    @Transactional(readOnly = true)
    public List<OptionSetResponse> getActiveOptionSets() {
        return optionSetRepository.findByIsActiveTrueOrderByNameAsc().stream()
            .map(optionSetMapper::toResponse)
            .collect(Collectors.toList());
    }

    @Transactional(readOnly = true)
    public OptionSetResponse getById(Long id) {
        OptionSet set = optionSetRepository.findById(id)
            .orElseThrow(() -> new BusinessException("OPT_NOT_FOUND", "옵션 세트를 찾을 수 없습니다."));
        return optionSetMapper.toResponse(set);
    }
}
