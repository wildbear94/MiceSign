package com.micesign.aspect;

import com.micesign.common.AuditAction;
import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.auth.LoginRequest;
import com.micesign.dto.auth.LoginResponse;
import com.micesign.security.CustomUserDetails;
import com.micesign.service.AuditLogService;
import org.aspectj.lang.JoinPoint;
import org.aspectj.lang.annotation.AfterReturning;
import org.aspectj.lang.annotation.Aspect;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Component;

@Aspect
@Component
public class AuditAspect {

    private static final Logger log = LoggerFactory.getLogger(AuditAspect.class);

    private final AuditLogService auditLogService;

    public AuditAspect(AuditLogService auditLogService) {
        this.auditLogService = auditLogService;
    }

    @AfterReturning(
            pointcut = "execution(* com.micesign.controller.AuthController.login(..))",
            returning = "result")
    public void afterLogin(JoinPoint joinPoint, Object result) {
        try {
            if (!(result instanceof ResponseEntity<?> response)) {
                return;
            }

            Object body = response.getBody();
            if (!(body instanceof ApiResponse<?> apiResponse)) {
                return;
            }

            if (apiResponse.success() && apiResponse.data() instanceof LoginResponse loginResponse) {
                Long userId = loginResponse.user().id();
                auditLogService.log(userId, AuditAction.USER_LOGIN, "USER", userId,
                        "Email: " + loginResponse.user().email());
            } else {
                String email = extractEmailFromArgs(joinPoint);
                auditLogService.log(null, AuditAction.USER_LOGIN, "USER", null,
                        "Email: " + email);
            }
        } catch (Exception e) {
            log.warn("Failed to audit login event: {}", e.getMessage());
        }
    }

    @AfterReturning(
            pointcut = "execution(* com.micesign.controller.AuthController.logout(..))",
            returning = "result")
    public void afterLogout(JoinPoint joinPoint, Object result) {
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            Long userId = null;
            if (auth != null && auth.getPrincipal() instanceof CustomUserDetails userDetails) {
                userId = userDetails.getUserId();
            }
            auditLogService.log(userId, AuditAction.USER_LOGOUT, "USER", userId, null);
        } catch (Exception e) {
            log.warn("Failed to audit logout event: {}", e.getMessage());
        }
    }

    private String extractEmailFromArgs(JoinPoint joinPoint) {
        for (Object arg : joinPoint.getArgs()) {
            if (arg instanceof LoginRequest loginRequest) {
                return loginRequest.email();
            }
        }
        return "unknown";
    }
}
