package org.jkh.com.dagalle.domain.cost.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class CostSummaryResponse {
    private Integer totalKrw;
    private Breakdown breakdown;

    @Getter
    @Builder
    public static class Breakdown {
        private Integer transport;
        private Integer accommodation;
        private Integer food;
        private Integer fuel;
        private Integer etc;
    }
}
