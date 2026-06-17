package org.jkh.com.dagalle.domain.rental.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;

@Entity
@Table(name = "car_rentals")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class CarRental {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @Column(length = 100)
    private String carType;

    private Integer dailyRateKrw;

    private Integer rentalDays;

    private Integer estimatedFuelKrw;

    private Integer estimatedTollKrw;

    @Builder
    public CarRental(TravelPlan travelPlan, String carType, Integer dailyRateKrw,
                     Integer rentalDays, Integer estimatedFuelKrw, Integer estimatedTollKrw) {
        this.travelPlan = travelPlan;
        this.carType = carType;
        this.dailyRateKrw = dailyRateKrw;
        this.rentalDays = rentalDays;
        this.estimatedFuelKrw = estimatedFuelKrw;
        this.estimatedTollKrw = estimatedTollKrw;
    }

    public int totalCostKrw() {
        int rent = dailyRateKrw != null && rentalDays != null ? dailyRateKrw * rentalDays : 0;
        int fuel = estimatedFuelKrw != null ? estimatedFuelKrw : 0;
        int toll = estimatedTollKrw != null ? estimatedTollKrw : 0;
        return rent + fuel + toll;
    }

    public void update(String carType, Integer dailyRateKrw, Integer rentalDays,
                       Integer estimatedFuelKrw, Integer estimatedTollKrw) {
        if (carType != null) this.carType = carType;
        if (dailyRateKrw != null) this.dailyRateKrw = dailyRateKrw;
        if (rentalDays != null) this.rentalDays = rentalDays;
        if (estimatedFuelKrw != null) this.estimatedFuelKrw = estimatedFuelKrw;
        if (estimatedTollKrw != null) this.estimatedTollKrw = estimatedTollKrw;
    }
}
