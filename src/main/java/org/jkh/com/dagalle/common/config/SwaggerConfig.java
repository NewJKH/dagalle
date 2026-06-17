package org.jkh.com.dagalle.common.config;

import io.swagger.v3.oas.models.Components;
import io.swagger.v3.oas.models.OpenAPI;
import io.swagger.v3.oas.models.info.Contact;
import io.swagger.v3.oas.models.info.Info;
import io.swagger.v3.oas.models.security.SecurityRequirement;
import io.swagger.v3.oas.models.security.SecurityScheme;
import io.swagger.v3.oas.models.servers.Server;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.util.List;

@Configuration
public class SwaggerConfig {

    private static final String BEARER_SCHEME = "bearerAuth";

    @Bean
    public OpenAPI openAPI() {
        return new OpenAPI()
                .info(new Info()
                        .title("다갈래 API")
                        .description("""
                                AI 기반 여행 일정 플래너 **다갈래**의 REST API 명세서입니다.

                                ## 인증
                                - 로그인 후 발급된 `accessToken`을 `Authorization: Bearer {token}` 헤더에 포함해 주세요.
                                - 우측 상단 **Authorize 🔒** 버튼에 토큰을 입력하면 모든 요청에 자동 적용됩니다.

                                ## 공개 엔드포인트 (토큰 불필요)
                                - `POST /api/v1/auth/register`
                                - `POST /api/v1/auth/login`
                                - `POST /api/v1/auth/refresh`
                                """)
                        .version("v1.0.0")
                        .contact(new Contact()
                                .name("다갈래 팀")
                                .email("dagalle@example.com")))
                .servers(List.of(
                        new Server().url("http://localhost:8080").description("로컬 개발 서버")))
                .addSecurityItem(new SecurityRequirement().addList(BEARER_SCHEME))
                .components(new Components()
                        .addSecuritySchemes(BEARER_SCHEME, new SecurityScheme()
                                .name(BEARER_SCHEME)
                                .type(SecurityScheme.Type.HTTP)
                                .scheme("bearer")
                                .bearerFormat("JWT")
                                .description("JWT 액세스 토큰. 로그인 후 발급된 accessToken을 입력하세요.")));
    }
}
