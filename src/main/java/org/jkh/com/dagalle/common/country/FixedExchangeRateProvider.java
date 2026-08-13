package org.jkh.com.dagalle.common.country;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.EnumMap;
import java.util.Map;

/**
 * 설정값 기반 고정 환율.
 *
 * <p>결정론적이라 테스트가 흔들리지 않는다. 운영에서 실시간 환율이 필요해지면
 * {@link ExchangeRateProvider} 구현을 하나 더 만들고 이 빈을 걷어내거나 {@code @Primary}로 밀어낸다.
 *
 * <p>기본값은 2026년 8월 근사치다. <b>환율은 변한다</b> — 비용 정확도가 중요해지면
 * {@code application.yml}에서 덮거나 API 구현으로 교체한다.
 */
@Slf4j
@Component
public class FixedExchangeRateProvider implements ExchangeRateProvider {

    private final Map<Currency, BigDecimal> rates = new EnumMap<>(Currency.class);

    public FixedExchangeRateProvider(
            @Value("${exchange-rate.jpy:9.0}") BigDecimal jpy,
            @Value("${exchange-rate.vnd:0.055}") BigDecimal vnd,
            @Value("${exchange-rate.thb:40.0}") BigDecimal thb) {
        rates.put(Currency.KRW, BigDecimal.ONE);
        rates.put(Currency.JPY, jpy);
        rates.put(Currency.VND, vnd);
        rates.put(Currency.THB, thb);
        log.info("[환율] 고정값 사용 — JPY={} VND={} THB={}", jpy, vnd, thb);
    }

    @Override
    public BigDecimal rateToKrw(Currency from) {
        BigDecimal rate = rates.get(from);
        if (rate == null) {
            throw new IllegalArgumentException("환율이 설정되지 않은 통화: " + from);
        }
        return rate;
    }
}
