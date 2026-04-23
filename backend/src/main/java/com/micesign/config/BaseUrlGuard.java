package com.micesign.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.annotation.Profile;
import org.springframework.context.event.EventListener;
import org.springframework.stereotype.Component;

/**
 * Prod profile에서만 활성화되는 startup guard (D-D2, RESEARCH Pitfall 5).
 *
 * <p>app.base-url이 localhost/127.0.0.1/빈 값이면 IllegalStateException으로 startup 중단.
 * 배포 실수(app.base-url 누락, prod yml override 오류)를 부트 타임에 fail-fast 차단하여
 * 결재 알림 이메일에 dev URL이 박히는 사고를 예방.
 *
 * <p>설계 노트:
 * <ul>
 *   <li>{@code @Profile("prod")} — test/dev profile 에서는 빈 등록 skip (테스트 회귀 없음)</li>
 *   <li>{@code @Value("${app.base-url:}")} — guard 는 미설정도 실패로 잡아야 하므로 default 주지 않음</li>
 *   <li>{@code ApplicationReadyEvent} — 모든 빈 생성 후 발생하므로 @Value 주입 후 실행 보장</li>
 * </ul>
 */
@Component
@Profile("prod")
public class BaseUrlGuard {
    private static final Logger log = LoggerFactory.getLogger(BaseUrlGuard.class);

    @Value("${app.base-url:}")
    private String baseUrl;

    @EventListener(ApplicationReadyEvent.class)
    public void verifyBaseUrl() {
        if (baseUrl == null || baseUrl.isBlank()
                || baseUrl.contains("localhost") || baseUrl.contains("127.0.0.1")) {
            throw new IllegalStateException(
                    "[BaseUrlGuard] app.base-url must be a public prod URL for the 'prod' profile. Got: '"
                            + baseUrl + "'. Set APP_BASE_URL env var.");
        }
        log.info("[BaseUrlGuard] Verified app.base-url = {}", baseUrl);
    }
}
