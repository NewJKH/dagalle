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
    private Double distanceKm;
    private Integer estimatedCost;
    private String note;   // 이동수단 상세 (예: "후쿠오카공항→벳푸 고속버스 2시간")

    public static PlanRouteResponse from(PlanRoute route) {
        return PlanRouteResponse.builder()
                .id(route.getId())
                .sequence(route.getSequence())
                .from(new LocationInfo(
                        route.getFromLocation().getId(),
                        route.getFromLocation().getName(),
                        route.getFromLocation().getLat(),
                        route.getFromLocation().getLng(),
                        route.getFromLocation().getDescription(),
                        route.getFromLocation().getAddress()))
                .to(new LocationInfo(
                        route.getToLocation().getId(),
                        route.getToLocation().getName(),
                        route.getToLocation().getLat(),
                        route.getToLocation().getLng(),
                        route.getToLocation().getDescription(),
                        route.getToLocation().getAddress()))
                .transport(route.getTransport())
                .departureTime(route.getDepartureTime())
                .durationMinutes(route.getDurationMinutes())
                .distanceKm(route.getDistanceKm())
                .estimatedCost(route.getEstimatedCost())
                .note(route.getNote())
                .build();
    }

    public record LocationInfo(Long id, String name, Double lat, Double lng, String description, String address) {}
}
