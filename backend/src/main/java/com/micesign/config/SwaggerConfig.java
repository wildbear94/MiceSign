package com.micesign.config;

import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Info;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class SwaggerConfig {
    @Bean
    public OpenAPI miceSignOpenAPI() {
        return new OpenAPI()
            .info(new Info()
                .title("MiceSign API")
                .description("MiceSign 전자 결재 시스템 API")
                .version("v1"));
    }
}
