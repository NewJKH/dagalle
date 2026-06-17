package org.jkh.com.dagalle.domain.rental.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class CarRentalRequest {

    private String carType;

    @NotNull
    private Integer dailyRateKrw;

    @NotNull
    private Integer rentalDays;

    private Integer estimatedFuelKrw;

    private Integer estimatedTollKrw;
}
