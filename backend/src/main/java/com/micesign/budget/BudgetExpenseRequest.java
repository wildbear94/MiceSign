package com.micesign.budget;

import java.time.LocalDateTime;
import java.util.Map;

public class BudgetExpenseRequest {

    // Common fields
    private String documentNumber;
    private String templateCode;
    private String drafterEmployeeNo;
    private String drafterName;
    private String departmentName;
    private LocalDateTime submittedAt;
    private Long totalAmount; // null for OVERTIME

    // Template-specific details
    private Map<String, Object> details;

    public BudgetExpenseRequest() {
    }

    public BudgetExpenseRequest(String documentNumber, String templateCode, String drafterEmployeeNo,
                                 String drafterName, String departmentName, LocalDateTime submittedAt,
                                 Long totalAmount, Map<String, Object> details) {
        this.documentNumber = documentNumber;
        this.templateCode = templateCode;
        this.drafterEmployeeNo = drafterEmployeeNo;
        this.drafterName = drafterName;
        this.departmentName = departmentName;
        this.submittedAt = submittedAt;
        this.totalAmount = totalAmount;
        this.details = details;
    }

    public String getDocumentNumber() {
        return documentNumber;
    }

    public void setDocumentNumber(String documentNumber) {
        this.documentNumber = documentNumber;
    }

    public String getTemplateCode() {
        return templateCode;
    }

    public void setTemplateCode(String templateCode) {
        this.templateCode = templateCode;
    }

    public String getDrafterEmployeeNo() {
        return drafterEmployeeNo;
    }

    public void setDrafterEmployeeNo(String drafterEmployeeNo) {
        this.drafterEmployeeNo = drafterEmployeeNo;
    }

    public String getDrafterName() {
        return drafterName;
    }

    public void setDrafterName(String drafterName) {
        this.drafterName = drafterName;
    }

    public String getDepartmentName() {
        return departmentName;
    }

    public void setDepartmentName(String departmentName) {
        this.departmentName = departmentName;
    }

    public LocalDateTime getSubmittedAt() {
        return submittedAt;
    }

    public void setSubmittedAt(LocalDateTime submittedAt) {
        this.submittedAt = submittedAt;
    }

    public Long getTotalAmount() {
        return totalAmount;
    }

    public void setTotalAmount(Long totalAmount) {
        this.totalAmount = totalAmount;
    }

    public Map<String, Object> getDetails() {
        return details;
    }

    public void setDetails(Map<String, Object> details) {
        this.details = details;
    }
}
