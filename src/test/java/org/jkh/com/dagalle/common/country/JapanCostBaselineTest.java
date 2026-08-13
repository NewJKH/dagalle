package org.jkh.com.dagalle.common.country;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

/**
 * 비용 기준선은 AI가 아니라 코드가 계산한다 — 그 표를 고정한다.
 *
 * <p>이 표는 예전에 세 곳에 흩어져 있었다(AiScheduleService 숙박·렌터카, CostService 항공료).
 * 렌터카 표는 CarRentalService에도 <b>복사본</b>이 있었다. 한 곳으로 모았으니 여기서 지킨다.
 */
class JapanCostBaselineTest {

    private final CostBaseline sut = new JapanCostBaseline();

    @Test
    @DisplayName("숙박 점수가 높을수록 단가가 오른다")
    void accommodationPriceRisesWithScore() {
        assertThat(sut.accommodation(10).pricePerNightKrw())
                .isGreaterThan(sut.accommodation(7).pricePerNightKrw());
        assertThat(sut.accommodation(7).pricePerNightKrw())
                .isGreaterThan(sut.accommodation(4).pricePerNightKrw());
        assertThat(sut.accommodation(4).pricePerNightKrw())
                .isGreaterThan(sut.accommodation(0).pricePerNightKrw());
    }

    @Test
    @DisplayName("숙박 등급 명칭은 일본 어휘를 쓴다 — 료칸·캡슐호텔")
    void accommodationLabelUsesJapaneseVocabulary() {
        assertThat(sut.accommodation(9).label()).contains("료칸");
        assertThat(sut.accommodation(0).label()).contains("캡슐호텔");
    }

    @Test
    @DisplayName("점수 경계값이 위 등급에 포함된다")
    void scoreBoundaryBelongsToUpperTier() {
        assertThat(sut.accommodation(9)).isEqualTo(sut.accommodation(10));
        assertThat(sut.accommodation(8)).isEqualTo(sut.accommodation(7));
    }

    @Test
    @DisplayName("일본은 렌터카를 지원한다")
    void japanSupportsRental() {
        assertThat(sut.rental(2, 5)).isPresent();
    }

    @Test
    @DisplayName("인원이 늘면 더 큰 차가 배정된다")
    void largerPartyGetsLargerCar() {
        int small = sut.rental(2, 5).orElseThrow().dailyRateKrw();
        int mid   = sut.rental(3, 5).orElseThrow().dailyRateKrw();
        int large = sut.rental(5, 5).orElseThrow().dailyRateKrw();

        assertThat(mid).isGreaterThan(small);
        assertThat(large).isGreaterThan(mid);
    }

    @Test
    @DisplayName("숙박 등급이 높으면 인원과 무관하게 프리미엄 차량이다")
    void luxuryScoreOverridesPartySize() {
        var luxurySolo = sut.rental(1, 9).orElseThrow();
        var normalLarge = sut.rental(5, 5).orElseThrow();

        assertThat(luxurySolo.carType()).contains("프리미엄");
        assertThat(luxurySolo.dailyRateKrw()).isGreaterThan(normalLarge.dailyRateKrw());
    }

    @Test
    @DisplayName("서일본이 도쿄권보다, 도쿄권이 홋카이도보다 항공료가 싸다")
    void flightPriceReflectsDistance() {
        int west     = sut.flightRoundTripKrw("후쿠오카");
        int tokyo    = sut.flightRoundTripKrw("도쿄");
        int hokkaido = sut.flightRoundTripKrw("삿포로");

        assertThat(west).isLessThan(tokyo);
        assertThat(tokyo).isLessThan(hokkaido);
    }

    @Test
    @DisplayName("목적지가 null이어도 죽지 않고 원거리 기본값을 준다")
    void nullDestinationFallsBackSafely() {
        assertThat(sut.flightRoundTripKrw(null)).isEqualTo(sut.flightRoundTripKrw("알 수 없음"));
    }
}
