package org.jkh.com.dagalle.domain.plan.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;

import java.time.LocalDateTime;

@Getter
@Builder
public class PlanRouteResponse {
    private Long id;
    private Integer sequence;
    private LocationInfo from;
    private LocationInfo to;
    private TransportType transport;
    private LocalDateTime departureTime;
    private Integer durationMinutes;
    private Integer estimatedCost;

    public static PlanRouteResponse from(PlanRoute route) {
        return PlanRouteResponse.builder()
                .id(route.getId())
                .sequence(route.getSequence())
                .from(new LocationInfo(route.getFromLocation().getId(),
                        route.getFromLocation().getName(),
                        route.getFromLocation().getLat(),
                        route.getFromLocation().getLng()))
                .to(new LocationInfo(route.getToLocation().getId(),
                        route.getToLocation().getName(),
                        route.getToLocation().getLat(),
                        route.getToLocation().getLng()))
                .transport(route.getTransport())
                .departureTime(route.getDepartureTime())
                .durationMinutes(route.getDurationMinutes())
                .estimatedCost(route.getEstimatedCost())
                .build();
    }

    public record LocationInfo(Long id, String name, Double lat, Double lng) {}
}
