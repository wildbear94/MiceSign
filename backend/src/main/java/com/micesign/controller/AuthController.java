package com.micesign.controller;

import com.micesign.common.dto.ApiResponse;
import com.micesign.dto.auth.LoginRequest;
import com.micesign.service.AuthService;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.validation.Valid;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseCookie;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.Duration;

@RestController
@RequestMapping("/api/v1/auth")
public class AuthController {

    private static final String REFRESH_TOKEN_COOKIE = "refreshToken";
    private static final String COOKIE_PATH = "/api/v1/auth";
    private static final Duration REMEMBER_ME_DURATION = Duration.ofDays(14);

    private final AuthService authService;

    public AuthController(AuthService authService) {
        this.authService = authService;
    }

    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request,
                                   HttpServletRequest httpRequest) {
        String deviceInfo = httpRequest.getHeader("User-Agent");
        AuthService.LoginResult result = authService.login(request, deviceInfo);

        if (!result.success()) {
            int status = "AUTH_ACCOUNT_LOCKED".equals(result.error().code()) ? 401 : 401;
            return ResponseEntity.status(status)
                    .body(new ApiResponse<>(false, result.error(), null));
        }

        // Build refresh token cookie
        ResponseCookie.ResponseCookieBuilder cookieBuilder = ResponseCookie
                .from(REFRESH_TOKEN_COOKIE, result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(COOKIE_PATH);

        if (request.rememberMe()) {
            cookieBuilder.maxAge(REMEMBER_ME_DURATION);
        }
        // If rememberMe is false, omit maxAge => session cookie

        ResponseCookie cookie = cookieBuilder.build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok(result.response()));
    }

    @PostMapping("/refresh")
    public ResponseEntity<?> refresh(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        AuthService.RefreshResult result = authService.refresh(refreshToken);

        if (!result.success()) {
            return ResponseEntity.status(401)
                    .body(new ApiResponse<>(false, result.error(), null));
        }

        // Always set new cookie with 14-day maxAge (remember-me state persists)
        ResponseCookie cookie = ResponseCookie
                .from(REFRESH_TOKEN_COOKIE, result.rawRefreshToken())
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(REMEMBER_ME_DURATION)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok(result.response()));
    }

    @PostMapping("/logout")
    public ResponseEntity<?> logout(
            @CookieValue(name = REFRESH_TOKEN_COOKIE, required = false) String refreshToken) {
        authService.logout(refreshToken);

        // Clear cookie by setting maxAge to 0
        ResponseCookie cookie = ResponseCookie
                .from(REFRESH_TOKEN_COOKIE, "")
                .httpOnly(true)
                .secure(true)
                .sameSite("Strict")
                .path(COOKIE_PATH)
                .maxAge(0)
                .build();

        return ResponseEntity.ok()
                .header(HttpHeaders.SET_COOKIE, cookie.toString())
                .body(ApiResponse.ok("로그아웃 되었습니다."));
    }
}
