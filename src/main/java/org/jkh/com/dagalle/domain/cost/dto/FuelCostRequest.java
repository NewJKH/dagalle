package org.jkh.com.dagalle.domain.cost.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;

@Getter
public class FuelCostRequest {

    @NotNull
    @Positive
    private Double vehicleFuelEfficiency;

    @NotNull
    @Positive
    private Integer fuelPricePerLiter;
}
