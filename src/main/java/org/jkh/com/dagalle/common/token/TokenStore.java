package org.jkh.com.dagalle.common.token;

import java.time.Duration;

public interface TokenStore {
    void save(String key, String value, Duration ttl);
    String get(String key);
    void delete(String key);
}
