package com.micesign.domain;

import jakarta.persistence.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "template_schema_version",
    uniqueConstraints = @UniqueConstraint(columnNames = {"template_id", "version"}))
public class TemplateSchemaVersion {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "template_id", nullable = false)
    private ApprovalTemplate template;

    @Column(name = "version", nullable = false)
    private int version;

    @Column(name = "schema_definition", columnDefinition = "LONGTEXT", nullable = false)
    private String schemaDefinition;

    @Column(name = "change_description", length = 500)
    private String changeDescription;

    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
    }

    // Getters and Setters

    public Long getId() {
        return id;
    }

    public void setId(Long id) {
        this.id = id;
    }

    public ApprovalTemplate getTemplate() {
        return template;
    }

    public void setTemplate(ApprovalTemplate template) {
        this.template = template;
    }

    public int getVersion() {
        return version;
    }

    public void setVersion(int version) {
        this.version = version;
    }

    public String getSchemaDefinition() {
        return schemaDefinition;
    }

    public void setSchemaDefinition(String schemaDefinition) {
        this.schemaDefinition = schemaDefinition;
    }

    public String getChangeDescription() {
        return changeDescription;
    }

    public void setChangeDescription(String changeDescription) {
        this.changeDescription = changeDescription;
    }

    public LocalDateTime getCreatedAt() {
        return createdAt;
    }
}
