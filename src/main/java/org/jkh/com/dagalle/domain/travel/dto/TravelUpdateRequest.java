package org.jkh.com.dagalle.domain.travel.dto;

import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;

import java.time.LocalDate;

@Getter
@Setter
public class TravelUpdateRequest {
    private String title;
    private String startLocation;
    private String endLocation;
    private LocalDate startDate;
    private LocalDate endDate;
    private TravelStatus status;   // DRAFT → CONFIRMED → COMPLETED
}
