package org.jkh.com.dagalle.domain.rental.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;

@Getter
public class CarRentalRequest {

    private String carType;

    @NotNull
    private Integer dailyRateKrw;

    @NotNull
    private Integer rentalDays;

    private Integer estimatedFuelKrw;

    private Integer estimatedTollKrw;
}
