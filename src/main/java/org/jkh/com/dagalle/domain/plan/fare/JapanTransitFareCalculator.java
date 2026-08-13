package org.jkh.com.dagalle.domain.plan.fare;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.country.Currency;
import org.jkh.com.dagalle.common.country.ExchangeRateProvider;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.springframework.stereotype.Component;

import java.util.Optional;

/**
 * 일본 궤도 교통 요금.
 *
 * <p>일본은 <b>거리 구간별 정액제</b>다({@code DISTANCE_TABLE}). 요금표를 엔화 그대로 두고
 * 원화 환산은 {@link ExchangeRateProvider}에 맡긴다 — 요금표와 환율은 바뀌는 주기가 다르다.
 *
 * <p>이 클래스가 존재하는 이유는 LLM이 교통비를 자주 틀리게 내놓기 때문이다. 도보에 1,400원,
 * 지하철에 600원 같은 값이 나왔었다. 궤도 교통은 AI 값을 버리고 이 표로 강제 재계산한다.
 *
 * <p><b>한계</b> — 거리는 좌표 기반 직선거리(Haversine)라 실제 노선 거리와 다르다.
 * 회사별 별도 정산(JR↔사철 환승 시 요금이 각각 붙는 것)도 반영하지 않는다.
 */
@Component
@RequiredArgsConstructor
public class JapanTransitFareCalculator implements TransitFareCalculator {

    /** 도쿄 시내버스 균일 요금(엔). */
    private static final int TOKYO_BUS_FLAT_YEN = 230;

    private final ExchangeRateProvider exchangeRate;

    @Override
    public String countryCode() {
        return "JP";
    }

    @Override
    public Optional<Integer> calculate(TransportType transport, double distanceKm) {
        return switch (transport) {
            case SUBWAY -> Optional.of(toKrw(subwayFareYen(distanceKm)));
            case BUS    -> Optional.of(toKrw(TOKYO_BUS_FLAT_YEN));
            case TRAIN  -> Optional.of(toKrw(trainFareYen(distanceKm)));
            default     -> Optional.empty();
        };
    }

    /** 도쿄메트로 거리별 요금(엔). */
    private int subwayFareYen(double km) {
        if (km <= 3)  return 180;
        if (km <= 6)  return 210;
        if (km <= 11) return 240;
        if (km <= 16) return 270;
        return 300;
    }

    /** JR 거리별 요금(엔). */
    private int trainFareYen(double km) {
        if (km <= 3)  return 150;
        if (km <= 6)  return 160;
        if (km <= 11) return 200;
        if (km <= 22) return 250;
        if (km <= 50) return 410;
        return 770;
    }

    private int toKrw(int yen) {
        return exchangeRate.toKrw(Currency.JPY, yen);
    }
}
