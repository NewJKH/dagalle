package org.jkh.com.dagalle.common.token;

import lombok.RequiredArgsConstructor;
import org.springframework.context.annotation.Profile;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.stereotype.Component;

import java.time.Duration;

/**
 * 운영용. StringRedisTemplate을 요구하므로 Redis 자동설정이 살아있어야 한다.
 *
 * <p>local·test 프로파일에서는 {@link InMemoryTokenStore}가 대신 선택된다 —
 * 두 조건을 함께 고쳐야 한다. 한쪽만 바꾸면 빈이 0개거나 2개가 된다.
 */
@Component
@Profile("!local & !test")
@RequiredArgsConstructor
public class RedisTokenStore implements TokenStore {

    private final StringRedisTemplate redisTemplate;

    @Override
    public void save(String key, String value, Duration ttl) {
        redisTemplate.opsForValue().set(key, value, ttl);
    }

    @Override
    public String get(String key) {
        return redisTemplate.opsForValue().get(key);
    }

    @Override
    public void delete(String key) {
        redisTemplate.delete(key);
    }
}
