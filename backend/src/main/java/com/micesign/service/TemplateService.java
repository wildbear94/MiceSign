package com.micesign.service;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.SchemaDefinition;
import com.micesign.dto.template.TemplateDetailResponse;
import com.micesign.dto.template.TemplateResponse;
import com.micesign.dto.template.UpdateTemplateRequest;
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
    private final TemplateSchemaService schemaService;
    private final ObjectMapper objectMapper;

    public TemplateService(ApprovalTemplateRepository approvalTemplateRepository,
                           TemplateMapper templateMapper,
                           TemplateSchemaService schemaService,
                           ObjectMapper objectMapper) {
        this.approvalTemplateRepository = approvalTemplateRepository;
        this.templateMapper = templateMapper;
        this.schemaService = schemaService;
        this.objectMapper = objectMapper;
    }

    /**
     * 활성 템플릿 목록 조회 (기존 API - 하위 호환)
     */
    public List<TemplateResponse> getActiveTemplates() {
        return approvalTemplateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .map(templateMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 전체 템플릿 목록 조회 (Admin용)
     */
    public List<TemplateResponse> getAllTemplates() {
        return approvalTemplateRepository.findAll().stream()
                .map(templateMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * 템플릿 상세 조회
     */
    public TemplateDetailResponse getTemplateDetail(Long id) {
        ApprovalTemplate template = approvalTemplateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다."));
        return toDetailResponse(template);
    }

    /**
     * 커스텀 템플릿 생성 (Admin)
     */
    @Transactional
    public TemplateDetailResponse createTemplate(Long userId, CreateTemplateRequest req) {
        // prefix 중복 검증
        if (approvalTemplateRepository.existsByPrefix(req.prefix().toUpperCase())) {
            throw new BusinessException("TPL_PREFIX_DUPLICATE", "이미 사용 중인 접두사입니다: " + req.prefix());
        }

        // code 자동 생성: CUSTOM_ + nanoid 12자
        String code = "CUSTOM_" + NanoIdUtils.randomNanoId(
                NanoIdUtils.DEFAULT_NUMBER_GENERATOR, NanoIdUtils.DEFAULT_ALPHABET, 12);

        ApprovalTemplate template = new ApprovalTemplate();
        template.setCode(code);
        template.setName(req.name());
        template.setDescription(req.description());
        template.setPrefix(req.prefix().toUpperCase());
        template.setCustom(true);
        template.setCategory(req.category());
        template.setIcon(req.icon());

        // 먼저 template을 persist해야 schema version FK가 유효함
        approvalTemplateRepository.save(template);

        // 스키마 저장 + 버전 1 생성 (D-09, D-11)
        schemaService.updateSchema(template, req.schemaDefinition());

        return toDetailResponse(template);
    }

    /**
     * 커스텀 템플릿 수정 (Admin)
     */
    @Transactional
    public TemplateDetailResponse updateTemplate(Long id, UpdateTemplateRequest req) {
        ApprovalTemplate template = approvalTemplateRepository.findByIdAndIsCustomTrue(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "커스텀 양식을 찾을 수 없습니다."));

        if (req.name() != null) template.setName(req.name());
        if (req.description() != null) template.setDescription(req.description());
        if (req.category() != null) template.setCategory(req.category());
        if (req.icon() != null) template.setIcon(req.icon());

        // 스키마 변경 시 자동 버전 증가 (D-11)
        if (req.schemaDefinition() != null) {
            schemaService.updateSchema(template, req.schemaDefinition());
        }

        approvalTemplateRepository.save(template);
        return toDetailResponse(template);
    }

    /**
     * 커스텀 템플릿 비활성화 (Admin)
     */
    @Transactional
    public void deactivateTemplate(Long id) {
        ApprovalTemplate template = approvalTemplateRepository.findByIdAndIsCustomTrue(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "커스텀 양식을 찾을 수 없습니다."));
        template.setActive(false);
        approvalTemplateRepository.save(template);
    }

    /**
     * 공개 스키마 조회 — 템플릿 코드로 활성 커스텀 템플릿의 스키마를 반환
     * 하드코딩 양식(schemaDefinition == null)이나 비활성/존재하지 않는 템플릿은 404
     */
    public SchemaDefinition getTemplateSchemaByCode(String code) {
        ApprovalTemplate template = approvalTemplateRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));

        if (!template.isActive()) {
            throw new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404);
        }

        if (template.getSchemaDefinition() == null) {
            throw new BusinessException("TPL_NOT_FOUND", "해당 양식에는 스키마가 정의되어 있지 않습니다.", 404);
        }

        // 옵션 세트 resolve 후 SchemaDefinition으로 역직렬화
        String resolvedJson = schemaService.resolveSchemaWithOptions(template.getSchemaDefinition());
        try {
            return objectMapper.readValue(resolvedJson, SchemaDefinition.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 역직렬화에 실패했습니다: " + e.getMessage());
        }
    }

    private TemplateDetailResponse toDetailResponse(ApprovalTemplate t) {
        SchemaDefinition schema = null;
        if (t.getSchemaDefinition() != null) {
            try {
                schema = objectMapper.readValue(t.getSchemaDefinition(), SchemaDefinition.class);
            } catch (JsonProcessingException e) {
                throw new BusinessException("SCHEMA_PARSE_ERROR",
                        "스키마 역직렬화에 실패했습니다: " + e.getMessage());
            }
        }
        return new TemplateDetailResponse(
                t.getId(), t.getCode(), t.getName(), t.getDescription(),
                t.getPrefix(), t.isActive(), t.isCustom(), t.getSchemaVersion(),
                t.getCategory(), t.getIcon(), schema, t.getCreatedAt(), t.getUpdatedAt());
    }
}
