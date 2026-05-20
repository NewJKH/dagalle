package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
public class AiGenerateRequest {

    @NotBlank
    private String startLocation;

    @NotBlank
    private String endLocation;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    @NotNull
    private Tendency tendency;

    private int memberCount = 1;

    private String countryCode = "JP";

    private List<String> keywords = new ArrayList<>();

    private String theme;

    private boolean withCar = false;

    private Integer budgetTotal;
}
