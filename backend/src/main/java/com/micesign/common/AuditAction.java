package com.micesign.common;

/**
 * Audit log action constants.
 * Immutable — all document state changes, auth events, and admin operations.
 */
public final class AuditAction {

    private AuditAction() {
        // prevent instantiation
    }

    // Document lifecycle
    public static final String DOC_CREATE = "DOC_CREATE";
    public static final String DOC_SUBMIT = "DOC_SUBMIT";
    public static final String DOC_APPROVE = "DOC_APPROVE";
    public static final String DOC_REJECT = "DOC_REJECT";
    public static final String DOC_WITHDRAW = "DOC_WITHDRAW";
    public static final String DOC_UPDATE = "DOC_UPDATE";
    public static final String DOC_VIEW = "DOC_VIEW";

    // File operations
    public static final String FILE_UPLOAD = "FILE_UPLOAD";
    public static final String FILE_DOWNLOAD = "FILE_DOWNLOAD";

    // Authentication
    public static final String USER_LOGIN = "USER_LOGIN";
    public static final String USER_LOGOUT = "USER_LOGOUT";

    // Admin operations
    public static final String ADMIN_USER_EDIT = "ADMIN_USER_EDIT";
    public static final String ADMIN_ORG_EDIT = "ADMIN_ORG_EDIT";
}
