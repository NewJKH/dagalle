package org.jkh.com.dagalle.domain.cost.dto;

import lombok.Builder;
import lombok.Getter;

@Getter
@Builder
public class FuelCostResponse {
    private Double totalDistanceKm;
    private Double requiredLiters;
    private Integer estimatedFuelCost;
}
