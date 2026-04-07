package com.micesign.service;

import com.aventrix.jnanoid.jnanoid.NanoIdUtils;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.TemplateSchemaVersion;
import com.micesign.domain.User;
import com.micesign.dto.template.AdminTemplateDetailResponse;
import com.micesign.dto.template.AdminTemplateResponse;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.SchemaDefinition;
import com.micesign.dto.template.TemplateDetailResponse;
import com.micesign.dto.template.TemplateResponse;
import com.micesign.dto.template.UpdateTemplateRequest;
import com.micesign.mapper.TemplateMapper;
import com.micesign.repository.ApprovalTemplateRepository;
import com.micesign.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional(readOnly = true)
public class TemplateService {

    private final ApprovalTemplateRepository templateRepository;
    private final TemplateMapper templateMapper;
    private final TemplateSchemaService schemaService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;

    public TemplateService(ApprovalTemplateRepository templateRepository,
                           TemplateMapper templateMapper,
                           TemplateSchemaService schemaService,
                           UserRepository userRepository,
                           ObjectMapper objectMapper) {
        this.templateRepository = templateRepository;
        this.templateMapper = templateMapper;
        this.schemaService = schemaService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
    }

    // ──────────────────────────────────────────────
    // listActiveTemplates
    // ──────────────────────────────────────────────

    public List<TemplateResponse> listActiveTemplates() {
        return templateRepository.findByIsActiveTrueOrderBySortOrder()
                .stream()
                .map(templateMapper::toResponse)
                .collect(Collectors.toList());
    }

    /**
     * Backward-compat alias for listActiveTemplates.
     */
    public List<TemplateResponse> getActiveTemplates() {
        return listActiveTemplates();
    }

    // ──────────────────────────────────────────────
    // getTemplateByCode
    // ──────────────────────────────────────────────

    /**
     * Returns TemplateResponse (used by public controller).
     */
    public TemplateResponse getTemplateByCode(String code) {
        ApprovalTemplate template = templateRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));
        return templateMapper.toResponse(template);
    }

    /**
     * Returns TemplateDetailResponse (full detail by code).
     */
    public TemplateDetailResponse getTemplateDetailByCode(String code) {
        ApprovalTemplate template = templateRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));
        return toDetailResponse(template);
    }

    // ──────────────────────────────────────────────
    // getTemplateById (Admin -- with version history)
    // ──────────────────────────────────────────────

    public AdminTemplateDetailResponse getTemplateById(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));

        List<TemplateSchemaVersion> versions = schemaService.getVersionHistory(id);
        List<AdminTemplateDetailResponse.SchemaVersionResponse> versionHistory = versions.stream()
                .map(v -> new AdminTemplateDetailResponse.SchemaVersionResponse(
                        v.getVersion(), v.getChangeDescription(), v.getCreatedAt()))
                .toList();

        return new AdminTemplateDetailResponse(
                template.getId(), template.getCode(), template.getName(),
                template.getDescription(), template.getPrefix(),
                template.isActive(), template.getSortOrder(),
                template.getSchemaDefinition(), template.getSchemaVersion(),
                template.isCustom(), template.getCategory(), template.getIcon(),
                template.getCreatedBy() != null ? template.getCreatedBy().getId() : null,
                template.isBudgetEnabled(),
                versionHistory,
                template.getCreatedAt(), template.getUpdatedAt()
        );
    }

    /**
     * Backward-compat alias used by existing controllers.
     */
    public TemplateDetailResponse getTemplateDetail(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));
        return toDetailResponse(template);
    }

    // ──────────────────────────────────────────────
    // listAllTemplates (Admin)
    // ──────────────────────────────────────────────

    public List<AdminTemplateResponse> listAllTemplates() {
        return templateRepository.findAll().stream()
                .map(t -> new AdminTemplateResponse(
                        t.getId(), t.getCode(), t.getName(), t.getDescription(),
                        t.getPrefix(), t.isActive(), t.getSortOrder(),
                        t.getSchemaVersion(), t.isCustom(), t.getCategory(), t.getIcon(),
                        t.getCreatedBy() != null ? t.getCreatedBy().getId() : null,
                        t.isBudgetEnabled(),
                        t.getCreatedAt(), t.getUpdatedAt()))
                .collect(Collectors.toList());
    }

    /**
     * Backward-compat alias returning TemplateResponse list.
     */
    public List<TemplateResponse> getAllTemplates() {
        return templateRepository.findAll().stream()
                .map(templateMapper::toResponse)
                .collect(Collectors.toList());
    }

    // ──────────────────────────────────────────────
    // createTemplate (Admin)
    // ──────────────────────────────────────────────

    /**
     * Backward-compat overload: (userId, request) order used by existing controllers.
     */
    @Transactional
    public TemplateDetailResponse createTemplate(Long userId, CreateTemplateRequest request) {
        AdminTemplateDetailResponse admin = createTemplate(request, userId);
        return toDetailResponse(templateRepository.findById(admin.id()).orElseThrow());
    }

    @Transactional
    public AdminTemplateDetailResponse createTemplate(CreateTemplateRequest request, Long userId) {
        // Prefix duplicate check
        if (templateRepository.existsByPrefix(request.prefix().toUpperCase())) {
            throw new BusinessException("TPL_PREFIX_DUPLICATE",
                    "이미 사용 중인 접두사입니다: " + request.prefix());
        }

        User creator = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException("USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));

        // Generate unique code
        String code = "CUSTOM_" + NanoIdUtils.randomNanoId(
                NanoIdUtils.DEFAULT_NUMBER_GENERATOR, NanoIdUtils.DEFAULT_ALPHABET, 12);

        ApprovalTemplate template = new ApprovalTemplate();
        template.setCode(code);
        template.setName(request.name());
        template.setDescription(request.description());
        template.setPrefix(request.prefix().toUpperCase());
        template.setCustom(true);
        template.setCategory(request.category());
        template.setIcon(request.icon());
        template.setCreatedBy(creator);

        // Persist first so schema version FK is valid
        templateRepository.save(template);

        // Save schema + version 1
        if (request.schemaDefinition() != null) {
            SchemaDefinition schema = objectMapper.convertValue(
                    request.schemaDefinition(), SchemaDefinition.class);
            schemaService.updateSchema(template, schema);
        }

        return getTemplateById(template.getId());
    }

    // ──────────────────────────────────────────────
    // updateTemplate (Admin)
    // ──────────────────────────────────────────────

    /**
     * Backward-compat overload: 2-param version used by existing controllers.
     */
    @Transactional
    public TemplateDetailResponse updateTemplate(Long id, UpdateTemplateRequest request) {
        AdminTemplateDetailResponse admin = updateTemplate(id, request, null);
        return toDetailResponse(templateRepository.findById(admin.id()).orElseThrow());
    }

    @Transactional
    public AdminTemplateDetailResponse updateTemplate(Long id, UpdateTemplateRequest request, Long userId) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND",
                        "양식을 찾을 수 없습니다.", 404));

        if (request.name() != null) template.setName(request.name());
        if (request.description() != null) template.setDescription(request.description());
        if (request.category() != null) template.setCategory(request.category());
        if (request.icon() != null) template.setIcon(request.icon());
        if (request.isActive() != null) template.setActive(request.isActive());
        if (request.sortOrder() != null) template.setSortOrder(request.sortOrder());
        if (request.budgetEnabled() != null) template.setBudgetEnabled(request.budgetEnabled());

        // Schema change: increment version and save history
        if (request.schemaDefinition() != null) {
            String schemaJson = request.schemaDefinition();
            int newVersion = template.getSchemaVersion() + 1;

            template.setSchemaDefinition(schemaJson);
            template.setSchemaVersion(newVersion);

            TemplateSchemaVersion version = new TemplateSchemaVersion();
            version.setTemplate(template);
            version.setVersion(newVersion);
            version.setSchemaDefinition(schemaJson);
            version.setChangeDescription("스키마 업데이트 v" + newVersion);
            schemaService.saveVersion(version);
        }

        templateRepository.save(template);
        return getTemplateById(template.getId());
    }

    // ──────────────────────────────────────────────
    // deactivateTemplate (Admin)
    // ──────────────────────────────────────────────

    @Transactional
    public void deactivateTemplate(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND",
                        "양식을 찾을 수 없습니다.", 404));
        template.setActive(false);
        templateRepository.save(template);
    }

    // ──────────────────────────────────────────────
    // getTemplateSchemaByCode (public schema query)
    // ──────────────────────────────────────────────

    public SchemaDefinition getTemplateSchemaByCode(String code) {
        ApprovalTemplate template = templateRepository.findByCode(code)
                .orElseThrow(() -> new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404));

        if (!template.isActive()) {
            throw new BusinessException("TPL_NOT_FOUND", "양식을 찾을 수 없습니다.", 404);
        }

        if (template.getSchemaDefinition() == null) {
            throw new BusinessException("TPL_NO_SCHEMA",
                    "해당 양식에는 스키마가 정의되어 있지 않습니다.", 404);
        }

        String resolvedJson = schemaService.resolveSchemaWithOptions(template.getSchemaDefinition());
        try {
            return objectMapper.readValue(resolvedJson, SchemaDefinition.class);
        } catch (JsonProcessingException e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 역직렬화에 실패했습니다: " + e.getMessage());
        }
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private TemplateDetailResponse toDetailResponse(ApprovalTemplate t) {
        return new TemplateDetailResponse(
                t.getId(), t.getCode(), t.getName(), t.getDescription(),
                t.getPrefix(), t.isActive(), t.getSortOrder(),
                t.getSchemaDefinition(), t.getSchemaVersion(),
                t.isCustom(), t.getCategory(), t.getIcon(),
                t.getCreatedBy() != null ? t.getCreatedBy().getId() : null,
                t.isBudgetEnabled(),
                t.getCreatedAt(), t.getUpdatedAt()
        );
    }
}
