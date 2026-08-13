package org.jkh.com.dagalle;

import org.jkh.com.dagalle.common.token.InMemoryTokenStore;
import org.jkh.com.dagalle.common.token.TokenStore;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.core.env.Environment;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 테스트가 외부 인프라(MySQL·Redis) 없이 도는지 지킨다.
 *
 * <p>이 테스트가 생긴 이유: {@code spring.autoconfigure.exclude}에 Spring Boot 3 경로를 적어
 * 제외가 <b>에러 없이 무시</b>됐다. 설정은 있는데 동작하지 않는 상태였고, 컨텍스트는 그냥
 * 로딩돼서 아무도 눈치채지 못했다. 설정 파일만 읽어서는 알 수 없으므로 실제 빈을 검사한다.
 */
@SpringBootTest
class TestEnvironmentIsolationTest {

    @Autowired Environment env;
    @Autowired ApplicationContext ctx;
    @Autowired TokenStore tokenStore;

    @Test
    @DisplayName("test 프로파일이 활성화된다")
    void testProfileIsActive() {
        assertThat(env.getActiveProfiles()).contains("test");
    }

    @Test
    @DisplayName("H2 인메모리를 쓴다 — MySQL에 붙지 않는다")
    void usesH2NotMySql() {
        String url = env.getProperty("spring.datasource.url");
        assertThat(url).startsWith("jdbc:h2:mem:");
    }

    @Test
    @DisplayName("TokenStore는 InMemory 구현이다 — Redis 서버가 필요 없다")
    void tokenStoreIsInMemory() {
        assertThat(tokenStore).isInstanceOf(InMemoryTokenStore.class);
    }

    @Test
    @DisplayName("Redis 자동설정이 실제로 제외된다 — 설정만 있고 무시되는 상태를 막는다")
    void redisAutoConfigurationIsActuallyExcluded() {
        // 제외 클래스명이 틀리면 에러 없이 무시되므로, 결과 빈으로 확인한다.
        assertThat(ctx.getBeanNamesForType(
                org.springframework.data.redis.core.StringRedisTemplate.class))
                .as("StringRedisTemplate이 생성되면 Redis 자동설정 제외가 실패한 것이다")
                .isEmpty();
    }
}
