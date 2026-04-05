package com.micesign.service;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import com.micesign.common.exception.BusinessException;
import com.micesign.domain.ApprovalTemplate;
import com.micesign.domain.OptionItem;
import com.micesign.domain.TemplateSchemaVersion;
import com.micesign.dto.template.SchemaDefinition;
import com.micesign.repository.OptionItemRepository;
import com.micesign.repository.TemplateSchemaVersionRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@Transactional
public class TemplateSchemaService {

    private final TemplateSchemaVersionRepository schemaVersionRepository;
    private final OptionItemRepository optionItemRepository;
    private final ObjectMapper objectMapper;

    public TemplateSchemaService(TemplateSchemaVersionRepository schemaVersionRepository,
                                 OptionItemRepository optionItemRepository,
                                 ObjectMapper objectMapper) {
        this.schemaVersionRepository = schemaVersionRepository;
        this.optionItemRepository = optionItemRepository;
        this.objectMapper = objectMapper;
    }

    /**
     * 스키마 변경 시 새 버전을 template_schema_version에 추가하고 template의 현재 버전을 갱신 (D-09, D-11)
     */
    public void updateSchema(ApprovalTemplate template, SchemaDefinition schema) {
        try {
            String schemaJson = objectMapper.writeValueAsString(schema);
            int newVersion = template.getSchemaVersion() + 1;

            TemplateSchemaVersion version = new TemplateSchemaVersion();
            version.setTemplate(template);
            version.setVersion(newVersion);
            version.setSchemaDefinition(schemaJson);
            schemaVersionRepository.save(version);

            template.setSchemaDefinition(schemaJson);
            template.setSchemaVersion(newVersion);
        } catch (JsonProcessingException e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR", "스키마 직렬화에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * 스키마에서 select 필드의 optionSetId를 실제 옵션 목록으로 resolve (D-08)
     * 문서 생성 시 스냅샷 저장에 사용
     */
    @Transactional(readOnly = true)
    public String resolveSchemaWithOptions(String schemaJson) {
        try {
            JsonNode root = objectMapper.readTree(schemaJson);
            ArrayNode fields = (ArrayNode) root.get("fields");
            if (fields != null) {
                for (JsonNode field : fields) {
                    resolveFieldOptions(field);
                }
            }
            return objectMapper.writeValueAsString(root);
        } catch (JsonProcessingException e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR", "스키마 파싱에 실패했습니다: " + e.getMessage());
        }
    }

    private void resolveFieldOptions(JsonNode field) {
        String type = field.get("type").asText();
        ObjectNode config = (ObjectNode) field.get("config");
        if (config == null) return;

        if ("select".equals(type) && config.has("optionSetId")) {
            Long optionSetId = config.get("optionSetId").asLong();
            List<OptionItem> items = optionItemRepository
                .findByOptionSetIdAndIsActiveTrueOrderBySortOrder(optionSetId);
            ArrayNode optionsArray = objectMapper.createArrayNode();
            for (OptionItem item : items) {
                ObjectNode opt = objectMapper.createObjectNode();
                opt.put("value", item.getValue());
                opt.put("label", item.getLabel());
                optionsArray.add(opt);
            }
            config.set("options", optionsArray);
        }

        if ("table".equals(type) && config.has("columns")) {
            for (JsonNode col : config.get("columns")) {
                resolveFieldOptions(col);
            }
        }
    }

    /**
     * 특정 템플릿의 스키마 버전 이력을 조회
     */
    @Transactional(readOnly = true)
    public List<TemplateSchemaVersion> getVersionHistory(Long templateId) {
        return schemaVersionRepository.findByTemplateIdOrderByVersionDesc(templateId);
    }
}
