package org.jkh.com.dagalle.common.country;

import java.util.Optional;

/**
 * 🇯🇵 일본 비용 기준선.
 *
 * <p>흩어져 있던 세 표를 모았다 — {@code AiScheduleService}의 숙박·렌터카 규칙 테이블과
 * {@code CostService}의 항공료 switch. 셋 다 "일본이면 A, 아니면 B" 형태였다.
 *
 * <p><b>값은 2026년 8월 기준 추정치다.</b> 실제 예약가가 아니며, 정확도가 필요해지면
 * 실시간 API 구현으로 교체한다.
 */
class JapanCostBaseline implements CostBaseline {

    @Override
    public AccommodationTier accommodation(int score) {
        if (score >= 9) return new AccommodationTier(270_000, "최고급 료칸·5성급");
        if (score >= 7) return new AccommodationTier(180_000, "고급 호텔·부티크 료칸");
        if (score >= 4) return new AccommodationTier(110_000, "비즈니스 호텔");
        if (score >= 2) return new AccommodationTier(54_000, "저가 비즈니스·게스트하우스");
        return new AccommodationTier(27_000, "캡슐호텔·도미토리");
    }

    /**
     * 일본 렌터카는 경차 비중이 높고 고속도로 톨비가 비싸다.
     * 지방 이동에만 의미가 있어 도시 여행에는 잘 쓰이지 않는다.
     */
    @Override
    public Optional<RentalTier> rental(int memberCount, int accommodationScore) {
        final int fuelPerDay = 18_000;
        final int tollPerDay = 5_000;

        if (accommodationScore >= 8) {
            return Optional.of(new RentalTier(
                    "토요타 알파드 / 렉서스 NX (프리미엄)", 180_000, fuelPerDay, tollPerDay));
        }
        if (memberCount >= 5) {
            return Optional.of(new RentalTier(
                    "토요타 시에나 / 혼다 스텝왜건 (미니밴)", 130_000, fuelPerDay, tollPerDay));
        }
        if (memberCount >= 3) {
            return Optional.of(new RentalTier(
                    "토요타 프리우스 / 닛산 노트 (준중형 하이브리드)", 90_000, fuelPerDay, tollPerDay));
        }
        if (accommodationScore >= 5) {
            return Optional.of(new RentalTier(
                    "토요타 아쿠아 / 혼다 핏 (소형 하이브리드)", 70_000, fuelPerDay, tollPerDay));
        }
        return Optional.of(new RentalTier(
                "다이하츠 무브 / 스즈키 허슬러 (경차)", 50_000, fuelPerDay, tollPerDay));
    }

    /** 인천 출발 왕복. 서일본이 가깝고 홋카이도가 멀다. */
    @Override
    public int flightRoundTripKrw(String destinationCity) {
        String loc = destinationCity != null ? destinationCity.toLowerCase() : "";

        if (containsAny(loc, "후쿠오카", "오사카", "교토", "나고야", "히로시마", "나가사키",
                             "벳푸", "유후인", "구마모토", "오키나와", "나하", "가고시마")) {
            return 280_000;   // 서일본 근거리
        }
        if (containsAny(loc, "도쿄", "요코하마", "가나자와", "하코네", "닛코", "가마쿠라")) {
            return 360_000;   // 도쿄권
        }
        return 420_000;       // 홋카이도 등 원거리
    }

    private boolean containsAny(String input, String... keywords) {
        for (String kw : keywords) {
            if (input.contains(kw)) return true;
        }
        return false;
    }
}
