package org.jkh.com.dagalle.domain.plan.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;

import java.time.LocalDate;
import java.util.List;

@Getter
@Builder
public class PlanDayResponse {
    private Integer dayNumber;
    private LocalDate date;
    private List<PlanRouteResponse> routes;
    private int totalCostKrw;   // 교통비 + 장소비용 합계

    public static PlanDayResponse from(PlanDay day) {
        List<PlanRouteResponse> routeList = day.getRoutes().stream()
                .map(PlanRouteResponse::from).toList();
        int totalCost = routeList.stream()
                .mapToInt(r -> (r.getEstimatedCost() != null ? r.getEstimatedCost() : 0)
                             + (r.getPlaceCost()     != null ? r.getPlaceCost()     : 0))
                .sum();
        return PlanDayResponse.builder()
                .dayNumber(day.getDayNumber())
                .date(day.getDate())
                .routes(routeList)
                .totalCostKrw(totalCost)
                .build();
    }
}
