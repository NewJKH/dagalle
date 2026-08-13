package org.jkh.com.dagalle.domain.plan.fare;

import org.jkh.com.dagalle.common.country.Currency;
import org.jkh.com.dagalle.common.country.FixedExchangeRateProvider;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 교통비는 AI가 아니라 코드가 계산한다 — 그 계산을 고정한다.
 *
 * <p>환율을 고정 주입하므로 이 테스트는 결정론적이다.
 */
class JapanTransitFareCalculatorTest {

    /** JPY 9원, VND 0.055원, THB 40원 */
    private final FixedExchangeRateProvider rate = new FixedExchangeRateProvider(
            new BigDecimal("9.0"), new BigDecimal("0.055"), new BigDecimal("40.0"));

    private final JapanTransitFareCalculator sut = new JapanTransitFareCalculator(rate);

    @Test
    @DisplayName("도쿄 시내버스는 거리와 무관하게 균일 요금이다")
    void busIsFlatRate() {
        // 230엔 × 9 = 2,070원
        assertThat(sut.calculate(TransportType.BUS, 1.0)).contains(2_070);
        assertThat(sut.calculate(TransportType.BUS, 30.0)).contains(2_070);
    }

    @Test
    @DisplayName("지하철은 거리 구간이 올라가면 요금도 올라간다")
    void subwayFareIncreasesByDistanceBand() {
        assertThat(sut.calculate(TransportType.SUBWAY, 2.0)).contains(180 * 9);
        assertThat(sut.calculate(TransportType.SUBWAY, 5.0)).contains(210 * 9);
        assertThat(sut.calculate(TransportType.SUBWAY, 20.0)).contains(300 * 9);
    }

    @Test
    @DisplayName("구간 경계값은 아래 구간에 포함된다")
    void bandBoundaryBelongsToLowerBand() {
        assertThat(sut.calculate(TransportType.SUBWAY, 3.0)).contains(180 * 9);   // 경계
        assertThat(sut.calculate(TransportType.SUBWAY, 3.1)).contains(210 * 9);   // 경계 직후
    }

    @Test
    @DisplayName("기차는 장거리 구간까지 단계가 이어진다")
    void trainHasLongDistanceBands() {
        assertThat(sut.calculate(TransportType.TRAIN, 2.0)).contains(150 * 9);
        assertThat(sut.calculate(TransportType.TRAIN, 40.0)).contains(410 * 9);
        assertThat(sut.calculate(TransportType.TRAIN, 100.0)).contains(770 * 9);
    }

    @Test
    @DisplayName("도보·자동차는 이 계산기가 값을 내지 않는다")
    void nonTransitReturnsEmpty() {
        // WALK는 상위에서 0원으로 강제하고, CAR는 AI 추정값을 쓴다
        assertThat(sut.calculate(TransportType.WALK, 1.0)).isEmpty();
        assertThat(sut.calculate(TransportType.CAR, 10.0)).isEmpty();
    }

    @Test
    @DisplayName("환율이 바뀌면 요금도 따라 바뀐다 — 하드코딩이 아니다")
    void fareFollowsExchangeRate() {
        FixedExchangeRateProvider doubled = new FixedExchangeRateProvider(
                new BigDecimal("18.0"), new BigDecimal("0.055"), new BigDecimal("40.0"));
        JapanTransitFareCalculator other = new JapanTransitFareCalculator(doubled);

        Optional<Integer> base = sut.calculate(TransportType.BUS, 1.0);
        Optional<Integer> twice = other.calculate(TransportType.BUS, 1.0);

        assertThat(twice).contains(base.orElseThrow() * 2);
    }

    @Test
    @DisplayName("원화는 환산 없이 그대로 통과한다")
    void krwPassesThrough() {
        assertThat(rate.toKrw(Currency.KRW, 1_500)).isEqualTo(1_500);
    }

    @Test
    @DisplayName("베트남 동은 자릿수가 커도 정확히 환산된다")
    void vndLargeAmountConvertsCorrectly() {
        // 5,000,000 VND × 0.055 = 275,000원
        assertThat(rate.toKrw(Currency.VND, 5_000_000L)).isEqualTo(275_000);
    }
}
