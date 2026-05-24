package org.jkh.com.dagalle.domain.ai.client;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.http.client.SimpleClientHttpRequestFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.Duration;
import java.util.List;
import java.util.Map;

/**
 * Claude API (Anthropic Messages API) 호출 전담 컴포넌트.
 * <p>
 * POST https://api.anthropic.com/v1/messages
 * Headers: x-api-key, anthropic-version: 2023-06-01
 */
@Component
public class ClaudeApiClient {

    private static final String CLAUDE_API_URL = "https://api.anthropic.com";
    private static final String ANTHROPIC_VERSION = "2023-06-01";
    private static final int MAX_TOKENS = 16000;

    private final RestClient restClient;
    private final String apiKey;
    private final String model;

    public ClaudeApiClient(
            @Value("${external-api.claude.key}") String apiKey,
            @Value("${external-api.claude.model}") String model
    ) {
        this.apiKey = apiKey;
        this.model = model;

        SimpleClientHttpRequestFactory factory = new SimpleClientHttpRequestFactory();
        factory.setConnectTimeout(Duration.ofSeconds(15));
        factory.setReadTimeout(Duration.ofSeconds(120));   // Claude 응답 최대 2분 대기

        this.restClient = RestClient.builder()
                .baseUrl(CLAUDE_API_URL)
                .defaultHeader("anthropic-version", ANTHROPIC_VERSION)
                .requestFactory(factory)
                .build();
    }

    /**
     * Claude에게 메시지를 보내고 텍스트 응답을 반환합니다.
     *
     * @param systemPrompt 시스템 프롬프트 (Claude의 역할/제약 설정)
     * @param userMessage  사용자 메시지
     * @return Claude의 텍스트 응답
     */
    @SuppressWarnings("unchecked")
    public String chat(String systemPrompt, String userMessage) {
        Map<String, Object> requestBody = Map.of(
                "model", model,
                "max_tokens", MAX_TOKENS,
                "system", systemPrompt,
                "messages", List.of(
                        Map.of("role", "user", "content", userMessage)
                )
        );

        Map<String, Object> response = restClient.post()
                .uri("/v1/messages")
                .header("x-api-key", apiKey)
                .contentType(MediaType.APPLICATION_JSON)
                .body(requestBody)
                .retrieve()
                .body(Map.class);

        if (response == null) {
            throw new IllegalStateException("Claude API 응답이 비어있습니다.");
        }

        List<Map<String, Object>> content = (List<Map<String, Object>>) response.get("content");
        if (content == null || content.isEmpty()) {
            throw new IllegalStateException("Claude API content 필드가 비어있습니다.");
        }

        return (String) content.get(0).get("text");
    }
}
