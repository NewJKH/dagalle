package org.jkh.com.dagalle.domain.travel.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;

import java.time.temporal.ChronoUnit;

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
    @JsonProperty("isAiGenerated")
    private boolean isAiGenerated;
    private String countryCode;
    private Integer memberCount;
    private Integer budgetTotal;
    private String theme;
    private String keywords;
    private boolean withCar;
    private String departureFlightTime;
    private String returnFlightTime;
    private int totalDays;

    public static TravelResponse from(TravelPlan plan) {
        int days = (int) ChronoUnit.DAYS.between(plan.getStartDate(), plan.getEndDate()) + 1;
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
                .theme(plan.getTheme())
                .keywords(plan.getKeywords())
                .withCar(plan.isWithCar())
                .departureFlightTime(plan.getDepartureFlightTime())
                .returnFlightTime(plan.getReturnFlightTime())
                .totalDays(days)
                .build();
    }
}
