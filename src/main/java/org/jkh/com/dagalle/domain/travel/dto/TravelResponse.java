package org.jkh.com.dagalle.domain.travel.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;

import java.time.LocalDate;

@Getter
@Builder
public class TravelResponse {
    private Long id;
    private String title;
    private String startLocation;
    private String endLocation;
    private LocalDate startDate;
    private LocalDate endDate;
    private TravelStatus status;
    private boolean isAiGenerated;
    private String countryCode;
    private Integer memberCount;
    private Integer budgetTotal;

    public static TravelResponse from(TravelPlan plan) {
        return TravelResponse.builder()
                .id(plan.getId())
                .title(plan.getTitle())
                .startLocation(plan.getStartLocation())
                .endLocation(plan.getEndLocation())
                .startDate(plan.getStartDate())
                .endDate(plan.getEndDate())
                .status(plan.getStatus())
                .isAiGenerated(plan.isAiGenerated())
                .countryCode(plan.getCountryCode())
                .memberCount(plan.getMemberCount())
                .budgetTotal(plan.getBudgetTotal())
                .build();
    }
}
