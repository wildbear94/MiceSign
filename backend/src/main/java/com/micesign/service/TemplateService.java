package com.micesign.service;

import com.micesign.dto.template.TemplateResponse;
import com.micesign.mapper.TemplateMapper;
import com.micesign.repository.ApprovalTemplateRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TemplateService {

    private final ApprovalTemplateRepository approvalTemplateRepository;
    private final TemplateMapper templateMapper;

    public TemplateService(ApprovalTemplateRepository approvalTemplateRepository,
                           TemplateMapper templateMapper) {
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.templateMapper = templateMapper;
    }

    public List<TemplateResponse> getActiveTemplates() {
        return approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .map(templateMapper::toResponse)
                .collect(Collectors.toList());
    }
}
