package org.jkh.com.dagalle.domain.cost.dto;

import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import lombok.Getter;
import lombok.Setter;

@Getter
@Setter
public class FuelCostRequest {

    @NotNull
    @Positive
    private Double vehicleFuelEfficiency;

    @NotNull
    @Positive
    private Integer fuelPricePerLiter;
}
