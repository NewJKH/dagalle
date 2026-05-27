package org.jkh.com.dagalle.domain.plan.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.location.entity.Location;

import java.time.LocalDateTime;

@Entity
@Table(name = "plan_routes")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlanRoute {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "plan_day_id", nullable = false)
    private PlanDay planDay;

    @Column(nullable = false)
    private Integer sequence;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "from_location_id", nullable = false)
    private Location fromLocation;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "to_location_id", nullable = false)
    private Location toLocation;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TransportType transport;

    @Column(name = "departure_time")
    private LocalDateTime departureTime;

    @Column(name = "duration_minutes")
    private Integer durationMinutes;

    @Column(name = "estimated_cost")
    private Integer estimatedCost;

    /**
     * 도착 장소에서 소모되는 비용 (입장료·식사비·쇼핑 등).
     * Google Places priceLevel 기반으로 산출. 교통비(estimatedCost)와 별개.
     */
    @Column(name = "place_cost")
    private Integer placeCost;

    /** Routes API로 계산된 실제 이동거리 (km) */
    @Column(name = "distance_km")
    private Double distanceKm;

    /** 이동수단 상세 (예: "후쿠오카공항→벳푸 고속버스 2시간, 산큐패스 3,250엔") */
    @Column(columnDefinition = "TEXT")
    private String note;

    @Builder
    public PlanRoute(PlanDay planDay, Integer sequence, Location fromLocation, Location toLocation,
                     TransportType transport, LocalDateTime departureTime,
                     Integer durationMinutes, Integer estimatedCost, Integer placeCost,
                     Double distanceKm, String note) {
        this.planDay = planDay;
        this.sequence = sequence;
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
        this.transport = transport;
        this.departureTime = departureTime;
        this.durationMinutes = durationMinutes;
        this.estimatedCost = estimatedCost;
        this.placeCost = placeCost;
        this.distanceKm = distanceKm;
        this.note = note;
    }

    public void update(TransportType transport, LocalDateTime departureTime,
                       Integer durationMinutes, Integer estimatedCost) {
        if (transport != null) this.transport = transport;
        if (departureTime != null) this.departureTime = departureTime;
        if (durationMinutes != null) this.durationMinutes = durationMinutes;
        if (estimatedCost != null) this.estimatedCost = estimatedCost;
    }

    public void updateSequence(Integer sequence) {
        this.sequence = sequence;
    }

    /** 다음날 첫 출발지 강제 교정용 */
    public void updateFromLocation(Location fromLocation) {
        this.fromLocation = fromLocation;
    }
}
