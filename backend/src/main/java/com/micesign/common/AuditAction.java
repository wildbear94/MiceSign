package com.micesign.common;

/**
 * Audit log action constants.
 * Immutable — all document state changes, auth events, and file operations.
 */
public final class AuditAction {

    private AuditAction() {
        // prevent instantiation
    }

    // Document lifecycle
    public static final String DOCUMENT_CREATE = "DOCUMENT_CREATE";
    public static final String DOCUMENT_SUBMIT = "DOCUMENT_SUBMIT";
    public static final String DOCUMENT_APPROVE = "DOCUMENT_APPROVE";
    public static final String DOCUMENT_REJECT = "DOCUMENT_REJECT";
    public static final String DOCUMENT_WITHDRAW = "DOCUMENT_WITHDRAW";

    // Authentication
    public static final String LOGIN_SUCCESS = "LOGIN_SUCCESS";
    public static final String LOGIN_FAILED = "LOGIN_FAILED";
    public static final String LOGOUT = "LOGOUT";

    // File operations
    public static final String FILE_UPLOAD = "FILE_UPLOAD";
    public static final String FILE_DOWNLOAD = "FILE_DOWNLOAD";
}
