package org.jkh.com.dagalle.domain.rental.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.rental.entity.CarRental;

@Getter
@Builder
public class CarRentalResponse {

    private Long id;
    private String carType;
    private Integer dailyRateKrw;
    private Integer rentalDays;
    private Integer estimatedFuelKrw;
    private Integer estimatedTollKrw;
    private Integer totalCostKrw;

    public static CarRentalResponse from(CarRental r) {
        return CarRentalResponse.builder()
                .id(r.getId())
                .carType(r.getCarType())
                .dailyRateKrw(r.getDailyRateKrw())
                .rentalDays(r.getRentalDays())
                .estimatedFuelKrw(r.getEstimatedFuelKrw())
                .estimatedTollKrw(r.getEstimatedTollKrw())
                .totalCostKrw(r.totalCostKrw())
                .build();
    }
}
