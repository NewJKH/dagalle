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

    @Builder
    public PlanRoute(PlanDay planDay, Integer sequence, Location fromLocation, Location toLocation,
                     TransportType transport, LocalDateTime departureTime,
                     Integer durationMinutes, Integer estimatedCost) {
        this.planDay = planDay;
        this.sequence = sequence;
        this.fromLocation = fromLocation;
        this.toLocation = toLocation;
        this.transport = transport;
        this.departureTime = departureTime;
        this.durationMinutes = durationMinutes;
        this.estimatedCost = estimatedCost;
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
}
