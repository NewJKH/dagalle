package org.jkh.com.dagalle.common.country;

import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;

/**
 * 🇯🇵 일본 프로파일.
 *
 * <p>3개국 중 1순위. 베트남·태국을 추가할 때 <b>이 파일을 고칠 일이 없어야</b> 추상화가 맞은 것이다.
 */
@Component
@RequiredArgsConstructor
public class JapanCountryProfile implements CountryProfile {

    private final ExchangeRateProvider exchangeRate;
    private final CostBaseline costBaseline = new JapanCostBaseline();
    /** 상태가 없으므로 한 번만 만든다 — 프롬프트 조립마다 호출된다. */
    private AiPromptRule promptRule;

    @Override
    public String countryCode() {
        return "JP";
    }

    @Override
    public CostBaseline costBaseline() {
        return costBaseline;
    }

    @Override
    public String displayName() {
        return "일본";
    }

    @Override
    public Currency currency() {
        return Currency.JPY;
    }

    @Override
    public AiPromptRule aiPromptRule() {
        if (promptRule == null) {
            promptRule = new JapanAiPromptRule(exchangeRate, costBaseline);
        }
        return promptRule;
    }

    /** 일본 어휘. 료칸·타베로그·신칸센처럼 일본에만 있는 표현을 담는다. */
    @RequiredArgsConstructor
    static class JapanAiPromptRule implements AiPromptRule {

        private final ExchangeRateProvider exchangeRate;
        private final CostBaseline costBaseline;

        @Override
        public String costGuide() {
            BigDecimal rate = exchangeRate.rateToKrw(Currency.JPY)
                    .setScale(1, RoundingMode.HALF_UP);
            return "비용은 원화(KRW) 정수로 기재. 엔화 기준 금액에 환율 " + rate.toPlainString()
                    + "을 곱해 환산할 것. CAR 비용에는 고속도로 톨비·주차비를 포함한다.";
        }

        /** 등급 명칭은 {@link CostBaseline}이 정본이다 — 프롬프트와 비용이 어긋나지 않게 한 곳에서만 정의한다. */
        @Override
        public String accommodationLabel(int score) {
            return costBaseline.accommodation(score).label();
        }

        @Override
        public String diningHighEnd() {
            return "미슐랭·타베로그 고평점 맛집만. 편의점·체인점 금지.";
        }

        @Override
        public String diningBudget() {
            return "저렴한 정식집·편의점 OK.";
        }

        @Override
        public String stayLuxury() {
            return "료칸·5성급 호텔만. 비즈니스호텔 언급 금지.";
        }

        @Override
        public String stayBudget() {
            return "게스트하우스·캡슐호텔만. 고급호텔 언급 금지.";
        }

        @Override
        public String scenicTransport() {
            return "신칸센·특급열차·페리 등 경치좋은 이동 route 포함.";
        }

        @Override
        public String placeNamingGuide() {
            return "장소명은 한국어/발음을 먼저 쓰고 괄호 안에 일본어를 병기한다. "
                    + "예: '유노츠보 카이도 (湯の坪街道)' O, '湯の坪街道(유노츠보 카이도)' X. "
                    + "영어 브랜드명은 그대로 쓴다. 주소는 일본 공식 주소 형식으로 기재한다.";
        }

        @Override
        public String airportTransferGuide() {
            return "- 나리타→도쿄: NEX TRAIN 60분. 간사이→오사카: 하루카 TRAIN 75분.\n"
                    + "  후쿠오카 공항→하카타역: SUBWAY 5분. 삿포로↔신치토세: JR TRAIN 40분.\n";
        }

        @Override
        public String genericFallbackDayJson(int dayNumber, String date) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"호텔","address":"Japan","lat":35.6762,"lng":139.6503,"type":"HOTEL","description":"숙박지"},"toLocation":{"name":"지역 관광지","address":"Japan","lat":35.6762,"lng":139.6503,"type":"ETC","description":"지역 유명 관광지"},"transport":"WALK","departureTime":"09:30","durationMinutes":30,"estimatedCost":500,"note":"도보 이동"},
                  {"fromLocation":{"name":"지역 관광지","address":"Japan","lat":35.6762,"lng":139.6503,"type":"ETC","description":"지역 유명 관광지"},"toLocation":{"name":"지역 맛집","address":"Japan","lat":35.6762,"lng":139.6503,"type":"RESTAURANT","description":"지역 맛집"},"transport":"WALK","departureTime":"12:00","durationMinutes":30,"estimatedCost":1500,"note":"점심 식사"},
                  {"fromLocation":{"name":"지역 맛집","address":"Japan","lat":35.6762,"lng":139.6503,"type":"RESTAURANT","description":"지역 맛집"},"toLocation":{"name":"호텔","address":"Japan","lat":35.6762,"lng":139.6503,"type":"HOTEL","description":"숙박지"},"transport":"WALK","departureTime":"19:00","durationMinutes":20,"estimatedCost":200,"note":"저녁 복귀"}
                ]}""".formatted(dayNumber, date);
        }
    }
}
