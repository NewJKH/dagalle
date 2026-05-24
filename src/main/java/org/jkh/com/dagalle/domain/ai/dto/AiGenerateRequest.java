package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
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

    /** 인천 출발 시간 (예: "09:00") */
    private String departureFlightTime;

    /** 목적지 공항 도착 시간 (예: "11:30") — Day 1 시작 기준 */
    private String arrivalAtDestTime;

    /** 귀국 출발 시간 (예: "15:00") — 마지막 Day 종료 기준 */
    private String returnFlightTime;
}
