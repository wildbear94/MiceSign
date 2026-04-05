package com.micesign.dto.template;

import com.fasterxml.jackson.annotation.JsonInclude;
import com.micesign.dto.option.OptionItemResponse;

import java.util.List;

@JsonInclude(JsonInclude.Include.NON_NULL)
public record FieldConfig(
    // text/textarea
    String placeholder,
    Integer maxLength,

    // number
    Long min,
    Long max,
    String unit,

    // select
    Long optionSetId,
    List<OptionItemResponse> options,  // used in schema snapshots (D-08)

    // table
    Integer minRows,
    Integer maxRows,
    List<FieldDefinition> columns,    // nested reuse (D-05)

    // staticText
    String content,

    // hidden
    String defaultValue
) {}
