package org.jkh.com.dagalle.domain.plan.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "plan_days",
       uniqueConstraints = @UniqueConstraint(columnNames = {"travel_plan_id", "day_number"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class PlanDay {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @Column(name = "day_number", nullable = false)
    private Integer dayNumber;

    @Column(nullable = false)
    private LocalDate date;

    @OneToMany(mappedBy = "planDay", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sequence ASC")
    private List<PlanRoute> routes = new ArrayList<>();

    @Builder
    public PlanDay(TravelPlan travelPlan, Integer dayNumber, LocalDate date) {
        this.travelPlan = travelPlan;
        this.dayNumber = dayNumber;
        this.date = date;
    }
}
