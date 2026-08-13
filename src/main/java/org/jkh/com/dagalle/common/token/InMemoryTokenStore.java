package org.jkh.com.dagalle.common.token;

import org.springframework.context.annotation.Profile;
import org.springframework.stereotype.Component;

import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;

/** Redis 없이 도는 환경용. 로컬 개발과 테스트가 외부 의존 없이 뜨게 한다. */
@Component
@Profile({"local", "test"})
public class InMemoryTokenStore implements TokenStore {

    private record Entry(String value, Instant expiresAt) {}

    private final Map<String, Entry> store = new ConcurrentHashMap<>();

    @Override
    public void save(String key, String value, Duration ttl) {
        store.put(key, new Entry(value, Instant.now().plus(ttl)));
    }

    @Override
    public String get(String key) {
        Entry entry = store.get(key);
        if (entry == null) return null;
        if (Instant.now().isAfter(entry.expiresAt())) {
            store.remove(key);
            return null;
        }
        return entry.value();
    }

    @Override
    public void delete(String key) {
        store.remove(key);
    }
}
