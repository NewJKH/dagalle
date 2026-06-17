package org.jkh.com.dagalle.domain.plan.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
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
    private Integer estimatedCost;  // 교통비
    private Integer placeCost;      // 장소 소비 비용 (입장료·식사비 등, Google priceLevel 기반)
    private String note;            // 이동수단 상세

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
                        route.getFromLocation().getAddress(),
                        route.getFromLocation().getType(),
                        route.getFromLocation().getExternalId()))
                .to(new LocationInfo(
                        route.getToLocation().getId(),
                        route.getToLocation().getName(),
                        route.getToLocation().getLat(),
                        route.getToLocation().getLng(),
                        route.getToLocation().getDescription(),
                        route.getToLocation().getAddress(),
                        route.getToLocation().getType(),
                        route.getToLocation().getExternalId()))
                .transport(route.getTransport())
                .departureTime(route.getDepartureTime())
                .durationMinutes(route.getDurationMinutes())
                .distanceKm(route.getDistanceKm())
                .estimatedCost(route.getEstimatedCost())
                .placeCost(route.getPlaceCost())
                .note(route.getNote())
                .build();
    }

    public record LocationInfo(Long id, String name, Double lat, Double lng, String description, String address, LocationType type, String placeId) {}
}
