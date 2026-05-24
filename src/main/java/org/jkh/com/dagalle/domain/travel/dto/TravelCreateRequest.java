package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class TravelCreateRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String startLocation;

    @NotBlank
    private String endLocation;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private String countryCode = "JP";

    private Integer memberCount = 1;

    private Integer budgetTotal;
}
