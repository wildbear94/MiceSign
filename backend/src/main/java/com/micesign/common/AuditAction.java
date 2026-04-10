package com.micesign.common;

/**
 * Constants for audit log action types.
 */
public final class AuditAction {

    private AuditAction() {}

    public static final String DOC_CREATE = "DOC_CREATE";
    public static final String DOC_UPDATE = "DOC_UPDATE";
    public static final String DOC_DELETE = "DOC_DELETE";
    public static final String DOC_SUBMIT = "DOC_SUBMIT";
    public static final String DOC_APPROVE = "DOC_APPROVE";
    public static final String DOC_REJECT = "DOC_REJECT";
    public static final String DOC_WITHDRAW = "DOC_WITHDRAW";
    public static final String DOC_REWRITE = "DOC_REWRITE";

    public static final String DOC_VIEW = "DOC_VIEW";

    public static final String FILE_UPLOAD = "FILE_UPLOAD";
    public static final String FILE_DOWNLOAD = "FILE_DOWNLOAD";

    public static final String USER_LOGIN = "USER_LOGIN";
    public static final String USER_LOGOUT = "USER_LOGOUT";
    public static final String ACCOUNT_LOCKED = "ACCOUNT_LOCKED";

    public static final String ADMIN_ORG_EDIT = "ADMIN_ORG_EDIT";
    public static final String ADMIN_USER_EDIT = "ADMIN_USER_EDIT";
}
