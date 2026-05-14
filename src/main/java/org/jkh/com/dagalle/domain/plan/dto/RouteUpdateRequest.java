package org.jkh.com.dagalle.domain.plan.dto;

import lombok.Getter;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;

import java.time.LocalDateTime;

@Getter
public class RouteUpdateRequest {
    private TransportType transport;
    private LocalDateTime departureTime;
    private Integer durationMinutes;
    private Integer estimatedCost;
}
