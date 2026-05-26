package org.jkh.com.dagalle.common.security;

import org.springframework.stereotype.Component;

import java.util.concurrent.ConcurrentHashMap;

/**
 * IP 기반 로그인 브루트-포스 방지 Rate Limiter.
 *
 * <ul>
 *   <li>연속 실패 10회 → 15분 차단</li>
 *   <li>로그인 성공 시 실패 기록 초기화</li>
 *   <li>단일 인스턴스 (ConcurrentHashMap, 외부 의존 없음)</li>
 * </ul>
 */
@Component
public class LoginRateLimiter {

    private static final int  MAX_FAILURES = 10;
    private static final long WINDOW_MS    = 15 * 60 * 1_000L;  // 15분
    private static final long BLOCK_MS     = 15 * 60 * 1_000L;  // 15분

    private record AttemptRecord(int failures, long firstFailAt, long blockedUntil) {}

    private final ConcurrentHashMap<String, AttemptRecord> store = new ConcurrentHashMap<>();

    /** 현재 IP 가 차단 상태인지 확인한다. */
    public boolean isBlocked(String ip) {
        AttemptRecord rec = store.get(ip);
        if (rec == null) return false;
        if (rec.blockedUntil() > 0 && System.currentTimeMillis() < rec.blockedUntil()) return true;
        // 차단 기간 만료 → 레코드 제거
        if (rec.blockedUntil() > 0) { store.remove(ip); return false; }
        return false;
    }

    /** 로그인 실패 1회를 기록한다. 임계치 초과 시 차단 상태로 전환. */
    public void recordFailure(String ip) {
        long now = System.currentTimeMillis();
        store.compute(ip, (key, rec) -> {
            if (rec == null) return new AttemptRecord(1, now, 0);
            // 윈도우가 지났으면 카운트 리셋
            if (now - rec.firstFailAt() >= WINDOW_MS) return new AttemptRecord(1, now, 0);
            int newCount = rec.failures() + 1;
            long blocked = (newCount >= MAX_FAILURES) ? now + BLOCK_MS : 0;
            return new AttemptRecord(newCount, rec.firstFailAt(), blocked);
        });
    }

    /** 로그인 성공 시 해당 IP 의 실패 기록을 초기화한다. */
    public void recordSuccess(String ip) {
        store.remove(ip);
    }

    /** 남은 차단 시간(분)을 반환한다. 차단 중이 아니면 0. */
    public long remainingBlockMinutes(String ip) {
        AttemptRecord rec = store.get(ip);
        if (rec == null || rec.blockedUntil() == 0) return 0;
        long remaining = rec.blockedUntil() - System.currentTimeMillis();
        return remaining > 0 ? (remaining / 60_000) + 1 : 0;
    }
}
