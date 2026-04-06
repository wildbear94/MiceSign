package com.micesign.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.dto.template.AdminTemplateDetailResponse;
import com.micesign.dto.template.AdminTemplateResponse;
import com.micesign.dto.template.CreateTemplateRequest;
import com.micesign.dto.template.UpdateTemplateRequest;
import com.micesign.repository.ApprovalTemplateRepository;
import jakarta.persistence.EntityNotFoundException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.Optional;

@Service
@Transactional(readOnly = true)
public class AdminTemplateService {

    private final ApprovalTemplateRepository templateRepository;
    private final ObjectMapper objectMapper;
    private final CircularDependencyValidator circularDependencyValidator;

    public AdminTemplateService(ApprovalTemplateRepository templateRepository,
                                ObjectMapper objectMapper,
                                CircularDependencyValidator circularDependencyValidator) {
        this.templateRepository = templateRepository;
        this.objectMapper = objectMapper;
        this.circularDependencyValidator = circularDependencyValidator;
    }

    public List<AdminTemplateResponse> getAllTemplates() {
        return templateRepository.findAll().stream()
                .map(this::toAdminResponse)
                .toList();
    }

    public AdminTemplateDetailResponse getTemplate(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("템플릿을 찾을 수 없습니다: " + id));
        return toAdminDetailResponse(template);
    }

    @Transactional
    public AdminTemplateDetailResponse createTemplate(CreateTemplateRequest request) {
        validateNoCycle(request.schemaDefinition());
        ApprovalTemplate template = new ApprovalTemplate();
        template.setCode(request.prefix().toUpperCase());
        template.setName(request.name());
        template.setPrefix(request.prefix());
        template.setDescription(request.description());
        template.setCategory(request.category());
        template.setIcon(request.icon());
        template.setCustom(true);
        template.setActive(true);
        template.setSortOrder(0);

        if (request.schemaDefinition() != null) {
            template.setSchemaDefinition(toJson(request.schemaDefinition()));
        }

        ApprovalTemplate saved = templateRepository.save(template);
        return toAdminDetailResponse(saved);
    }

    @Transactional
    public AdminTemplateDetailResponse updateTemplate(Long id, UpdateTemplateRequest request) {
        validateNoCycle(request.schemaDefinition());
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("템플릿을 찾을 수 없습니다: " + id));

        if (request.name() != null) {
            template.setName(request.name());
        }
        if (request.description() != null) {
            template.setDescription(request.description());
        }
        if (request.category() != null) {
            template.setCategory(request.category());
        }
        if (request.icon() != null) {
            template.setIcon(request.icon());
        }
        if (request.schemaDefinition() != null) {
            template.setSchemaDefinition(toJson(request.schemaDefinition()));
            template.setSchemaVersion(template.getSchemaVersion() + 1);
        }

        ApprovalTemplate saved = templateRepository.save(template);
        return toAdminDetailResponse(saved);
    }

    @Transactional
    public void deactivateTemplate(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("템플릿을 찾을 수 없습니다: " + id));
        template.setActive(false);
        templateRepository.save(template);
    }

    @Transactional
    public void activateTemplate(Long id) {
        ApprovalTemplate template = templateRepository.findById(id)
                .orElseThrow(() -> new EntityNotFoundException("템플릿을 찾을 수 없습니다: " + id));
        template.setActive(true);
        templateRepository.save(template);
    }

    private AdminTemplateResponse toAdminResponse(ApprovalTemplate t) {
        int fieldCount = countFields(t.getSchemaDefinition());
        return new AdminTemplateResponse(
                t.getId(),
                t.getName(),
                t.getPrefix(),
                t.getDescription(),
                t.getCategory(),
                t.getIcon(),
                t.isActive(),
                !t.isCustom(),
                t.getSchemaVersion(),
                fieldCount,
                t.getCreatedAt(),
                t.getUpdatedAt()
        );
    }

    private AdminTemplateDetailResponse toAdminDetailResponse(ApprovalTemplate t) {
        Object schema = parseJson(t.getSchemaDefinition());
        int fieldCount = countFields(t.getSchemaDefinition());
        return new AdminTemplateDetailResponse(
                t.getId(),
                t.getName(),
                t.getPrefix(),
                t.getDescription(),
                t.getCategory(),
                t.getIcon(),
                t.isActive(),
                !t.isCustom(),
                t.getSchemaVersion(),
                fieldCount,
                t.getCreatedAt(),
                t.getUpdatedAt(),
                schema
        );
    }

    private void validateNoCycle(Object schemaDefinition) {
        if (schemaDefinition == null) return;
        String json = toJson(schemaDefinition);
        Optional<List<String>> cycle = circularDependencyValidator.detectCycle(json, objectMapper);
        if (cycle.isPresent()) {
            String path = String.join(" → ", cycle.get());
            throw new IllegalArgumentException(
                "템플릿에 순환 의존성이 있어 저장할 수 없습니다. 순환 경로: " + path
            );
        }
    }

    private String toJson(Object obj) {
        try {
            return objectMapper.writeValueAsString(obj);
        } catch (JsonProcessingException e) {
            throw new IllegalArgumentException("JSON 직렬화 실패", e);
        }
    }

    private Object parseJson(String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (JsonProcessingException e) {
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private int countFields(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) return 0;
        try {
            Map<String, Object> schema = objectMapper.readValue(schemaJson, Map.class);
            Object fields = schema.get("fields");
            if (fields instanceof List<?> list) {
                return list.size();
            }
            return 0;
        } catch (JsonProcessingException e) {
            return 0;
        }
    }
}
