package org.jkh.com.dagalle.domain.plan.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;

import java.time.LocalDateTime;

@Getter
public class RouteAddRequest {

    @NotNull
    private Long fromLocationId;

    @NotNull
    private Long toLocationId;

    @NotNull
    private TransportType transport;

    private LocalDateTime departureTime;
    private Integer durationMinutes;
    private Integer estimatedCost;
}
