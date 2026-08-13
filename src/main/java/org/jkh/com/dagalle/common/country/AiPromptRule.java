package org.jkh.com.dagalle.common.country;

/**
 * AI 프롬프트에 들어가는 국가별 어휘.
 *
 * <p>{@code AiScheduleService}에 흩어져 있던 {@code boolean isJp = "JP".equals(countryCode)} 분기를
 * 여기로 모은다. 국가를 추가할 때 프롬프트 조립 코드를 고치지 않기 위해서다.
 *
 * <p>담는 것은 <b>어휘</b>지 규칙이 아니다. "숙박 점수 8 이상이면 고급 숙소" 같은 규칙은 공통이고,
 * 그 고급 숙소를 일본에서는 "료칸·5성급", 태국에서는 "리조트·5성급"이라 부르는 차이만 담는다.
 */
public interface AiPromptRule {

    /**
     * 비용 기재 지침. 현지 통화와 환율을 알려줘 AI가 원화로 환산해 적게 한다.
     * 환율이 프롬프트 문자열에 박히지 않도록 {@link ExchangeRateProvider}에서 만들어 넣는다.
     */
    String costGuide();

    /** 숙박 점수(0~10)에 대응하는 숙소 등급 명칭. */
    String accommodationLabel(int score);

    /** 음식 점수가 매우 높을 때(9+) 요구할 맛집 수준. */
    String diningHighEnd();

    /** 음식 점수가 낮을 때(2~3) 허용할 식사 수준. */
    String diningBudget();

    /** 숙박 점수가 매우 높을 때(8+) 요구할 숙소. */
    String stayLuxury();

    /** 숙박 점수가 매우 낮을 때(2 이하) 허용할 숙소. */
    String stayBudget();

    /** 이동 점수가 높을 때(8+) 포함할 경치 좋은 교통수단. */
    String scenicTransport();

    /** 장소명·주소 표기 지침 (현지어 병기 규칙 등). */
    String placeNamingGuide();

    /**
     * 공항↔도시 이동 지침.
     *
     * <p>나라마다 실제로 쓰는 교통편이 달라 구체 노선까지 알려줘야 AI가 엉뚱한 수단을 고르지 않는다.
     * 공통 규칙("공항 이동에 CAR 금지")은 호출부에 두고, 여기에는 노선 예시만 담는다.
     */
    String airportTransferGuide();

    /**
     * AI 호출이 실패했을 때 쓸 최소 일정 JSON. 여행지를 특정할 수 없을 때의 기본값이다.
     *
     * <p>화면이 비는 것보다 낫다는 판단으로 두는 안전장치다
     * ({@code technical-decisions.md} 7번의 폴백 사상과 같다).
     *
     * @param dayNumber 몇 일차
     * @param date      ISO 날짜 문자열
     */
    String genericFallbackDayJson(int dayNumber, String date);
}
