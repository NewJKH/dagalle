package org.jkh.com.dagalle.common.country;

import java.math.BigDecimal;

/**
 * 현지 통화 → 원화 환산.
 *
 * <p>구현을 갈아끼우기 위한 경계다. 로컬·테스트는 고정값({@link FixedExchangeRateProvider}),
 * 운영은 외부 API 구현을 쓴다. {@code TokenStore}(Redis/InMemory)와 같은 패턴이다.
 *
 * <p>이 인터페이스가 생기기 전에는 {@code JapanTransitFareCalculator}에 {@code yen * 9}가
 * 세 곳에 박혀 있었다. 기준 시점도 알 수 없었고 국가를 늘릴 방법도 없었다.
 */
public interface ExchangeRateProvider {

    /** 현지 통화 1단위당 원화. */
    BigDecimal rateToKrw(Currency from);

    /** 현지 통화 금액을 원화로 환산한다. 반올림. */
    default int toKrw(Currency from, long localAmount) {
        if (from == Currency.KRW) return Math.toIntExact(localAmount);
        return rateToKrw(from)
                .multiply(BigDecimal.valueOf(localAmount))
                .setScale(0, java.math.RoundingMode.HALF_UP)
                .intValueExact();
    }
}
