package org.jkh.com.dagalle.common.country;

import java.util.Optional;

/**
 * 국가별 비용 기준선.
 *
 * <p>숙박 단가·렌터카 요금·항공료처럼 <b>나라마다 다르지만 규칙으로 계산 가능한</b> 값을 담는다.
 * AI에게 물어보면 자주 틀리는 종류의 값이라 코드가 갖고 있는다
 * ({@code docs/technical-decisions.md} 3번의 연장선).
 *
 * <p>여기 값은 <b>추정치</b>다. 실제 예약가가 아니라 "이 정도 예산이 든다"를 보여주기 위한 것이며,
 * 정확도가 필요해지면 Amadeus 같은 실시간 API 구현으로 교체한다.
 */
public interface CostBaseline {

    /** 숙박 등급 — 1박 단가와 등급 명칭. */
    record AccommodationTier(int pricePerNightKrw, String label) {}

    /** 렌터카 등급 — 차종과 1일 비용. */
    record RentalTier(String carType, int dailyRateKrw, int fuelPerDayKrw, int tollPerDayKrw) {}

    /**
     * 숙박 점수(0~10)에 대응하는 등급.
     *
     * <p>등급 명칭은 프롬프트와 저장 양쪽에서 쓰인다 — 한 곳에서만 정의해 서로 어긋나지 않게 한다.
     */
    AccommodationTier accommodation(int score);

    /**
     * 렌터카 등급. <b>렌터카를 쓸 수 없는 나라는 {@link Optional#empty()}를 반환한다.</b>
     * 베트남이 그런 경우라, 호출부가 국가를 따지지 않고 이 결과만 보면 된다.
     */
    Optional<RentalTier> rental(int memberCount, int accommodationScore);

    /** 인천 출발 1인 왕복 항공료 추정(원). 도시별로 거리 차이가 커서 목적지를 받는다. */
    int flightRoundTripKrw(String destinationCity);
}
