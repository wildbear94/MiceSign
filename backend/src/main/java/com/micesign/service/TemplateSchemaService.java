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

    // ──────────────────────────────────────────────
    // getSchemaForDocument
    // ──────────────────────────────────────────────

    /**
     * Get schema definition for a document.
     * If schemaVersion is specified, return that version from TemplateSchemaVersion.
     * Otherwise return the current schema from ApprovalTemplate (looked up externally).
     */
    @Transactional(readOnly = true)
    public String getSchemaForDocument(String templateCode, Integer schemaVersion) {
        if (schemaVersion != null) {
            // Find specific version -- need template ID lookup
            // This requires template lookup externally; for now find by version directly
            // The caller should provide the template ID context
            return null;
        }
        return null;
    }

    /**
     * Get schema for a specific template and version.
     */
    @Transactional(readOnly = true)
    public String getSchemaByTemplateAndVersion(Long templateId, int version) {
        return schemaVersionRepository.findByTemplateIdAndVersion(templateId, version)
                .map(TemplateSchemaVersion::getSchemaDefinition)
                .orElseThrow(() -> new BusinessException("SCHEMA_VERSION_NOT_FOUND",
                        "스키마 버전을 찾을 수 없습니다: v" + version, 404));
    }

    // ──────────────────────────────────────────────
    // validateSchemaDefinition
    // ──────────────────────────────────────────────

    /**
     * Validate that a schema JSON string has the required structure.
     */
    public void validateSchemaDefinition(String schemaJson) {
        if (schemaJson == null || schemaJson.isBlank()) {
            throw new BusinessException("SCHEMA_EMPTY", "스키마 정의가 비어있습니다.");
        }

        try {
            JsonNode root = objectMapper.readTree(schemaJson);

            // Must have "fields" array
            JsonNode fields = root.get("fields");
            if (fields == null || !fields.isArray()) {
                throw new BusinessException("SCHEMA_INVALID",
                        "스키마에 fields 배열이 필요합니다.");
            }

            // Each field must have id and type
            for (JsonNode field : fields) {
                if (!field.has("id") || !field.get("id").isTextual()) {
                    throw new BusinessException("SCHEMA_INVALID",
                            "모든 필드에 id(문자열)가 필요합니다.");
                }
                if (!field.has("type") || !field.get("type").isTextual()) {
                    throw new BusinessException("SCHEMA_INVALID",
                            "모든 필드에 type(문자열)이 필요합니다.");
                }
            }
        } catch (BusinessException e) {
            throw e;
        } catch (JsonProcessingException e) {
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 JSON 파싱에 실패했습니다: " + e.getMessage());
        }
    }

    // ──────────────────────────────────────────────
    // updateSchema (called by TemplateService)
    // ──────────────────────────────────────────────

    /**
     * Save a new schema version to template_schema_version and update the template's current version.
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
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 직렬화에 실패했습니다: " + e.getMessage());
        }
    }

    /**
     * Save a schema version entity directly.
     */
    public void saveVersion(TemplateSchemaVersion version) {
        schemaVersionRepository.save(version);
    }

    // ──────────────────────────────────────────────
    // resolveSchemaWithOptions
    // ──────────────────────────────────────────────

    /**
     * Resolve select field optionSetIds to actual option lists.
     * Used when snapshotting schema into DocumentContent.
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
            throw new BusinessException("SCHEMA_PARSE_ERROR",
                    "스키마 파싱에 실패했습니다: " + e.getMessage());
        }
    }

    // ──────────────────────────────────────────────
    // getVersionHistory
    // ──────────────────────────────────────────────

    @Transactional(readOnly = true)
    public List<TemplateSchemaVersion> getVersionHistory(Long templateId) {
        return schemaVersionRepository.findByTemplateIdOrderByVersionDesc(templateId);
    }

    // ──────────────────────────────────────────────
    // Private helpers
    // ──────────────────────────────────────────────

    private void resolveFieldOptions(JsonNode field) {
        String type = field.get("type").asText();
        ObjectNode config = (ObjectNode) field.get("config");
        if (config == null) return;

        if ("select".equals(type) && config.has("optionSetId")) {
            Long optionSetId = config.get("optionSetId").asLong();
            List<OptionItem> items = optionItemRepository
                    .findByOptionSetIdAndIsActiveTrueOrderBySortOrderAsc(optionSetId);
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
}
