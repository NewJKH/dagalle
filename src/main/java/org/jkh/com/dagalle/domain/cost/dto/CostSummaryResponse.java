package org.jkh.com.dagalle.domain.cost.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CostSummaryResponse {
    private Integer totalKrw;           // 여행 경비 합계 (항공 제외)
    private Integer flightPerPersonKrw; // 1인 항공료 (왕복 추정)
    private Integer teamTotalKrw;       // 팀 전체 총비용 (항공 포함)
    private Integer perPersonKrw;       // 1인 평균 비용 (항공 포함)
    private Integer memberCount;        // 인원 수
    private Breakdown breakdown;

    @Getter
    @Builder
    public static class Breakdown {
        private Integer transport;
        private Integer accommodation;
        private Integer food;
        private Integer fuel;
        private Integer rental;
        private Integer flight;   // 항공료 전체 (1인 × 인원)
        private Integer etc;
    }
}
