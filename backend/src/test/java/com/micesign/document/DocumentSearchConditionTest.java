package com.micesign.document;

import com.micesign.domain.enums.DocumentStatus;
import com.micesign.dto.document.DocumentSearchCondition;
import org.junit.jupiter.api.Test;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class DocumentSearchConditionTest {

    @Test
    void statuses_null_defaults_to_empty_list() {
        var c = new DocumentSearchCondition(null, null, null, null, null, "my", null);
        assertThat(c.statuses()).isEmpty();
        assertThat(c.statuses()).isNotNull();
    }

    @Test
    void statuses_list_preserved_as_is() {
        var statuses = List.of(DocumentStatus.SUBMITTED, DocumentStatus.APPROVED);
        var c = new DocumentSearchCondition(null, statuses, null, null, null, "search", 42L);
        assertThat(c.statuses()).hasSize(2)
            .containsExactly(DocumentStatus.SUBMITTED, DocumentStatus.APPROVED);
        assertThat(c.drafterId()).isEqualTo(42L);
    }

    @Test
    void drafterId_nullable() {
        var c = new DocumentSearchCondition(null, List.of(DocumentStatus.SUBMITTED),
            null, null, null, "my", null);
        assertThat(c.drafterId()).isNull();
    }

    @Test
    void tab_preserves_literal_case() {
        var c = new DocumentSearchCondition(null, null, null, null, null, "Department", null);
        assertThat(c.tab()).isEqualTo("Department");
    }
}
