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

    public static PlanDayResponse from(PlanDay day) {
        return PlanDayResponse.builder()
                .dayNumber(day.getDayNumber())
                .date(day.getDate())
                .routes(day.getRoutes().stream().map(PlanRouteResponse::from).toList())
                .build();
    }
}
