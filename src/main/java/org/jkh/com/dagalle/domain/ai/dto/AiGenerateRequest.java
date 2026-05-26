package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Getter
@Setter
public class AiGenerateRequest {

    @NotBlank(message = "출발지를 입력해주세요")
    @Size(max = 200)
    private String startLocation;

    @NotBlank(message = "여행지를 입력해주세요")
    @Size(max = 200)
    private String endLocation;

    @NotNull(message = "출발일을 입력해주세요")
    private LocalDate startDate;

    @NotNull(message = "귀국일을 입력해주세요")
    private LocalDate endDate;

    @NotNull(message = "여행 성향을 선택해주세요")
    private Tendency tendency;

    @Min(value = 1, message = "인원은 최소 1명이어야 합니다")
    @Max(value = 20, message = "인원은 최대 20명까지입니다")
    private int memberCount = 1;

    @Size(min = 2, max = 2, message = "국가 코드는 2자리여야 합니다")
    private String countryCode = "JP";

    @Size(max = 10, message = "키워드는 최대 10개까지입니다")
    private List<String> keywords = new ArrayList<>();

    @Size(max = 100)
    private String theme;

    private boolean withCar = false;

    @Min(0) @Max(100_000_000)
    private Integer budgetTotal;

    /** 인천 출발 시간 (예: "09:00") */
    private String departureFlightTime;

    /** 목적지 공항 도착 시간 (예: "11:30") — Day 1 시작 기준 */
    private String arrivalAtDestTime;

    /** 귀국 출발 시간 (예: "15:00") — 마지막 Day 종료 기준 */
    private String returnFlightTime;

    @Min(1) @Max(10)
    private int foodScore = 5;

    @Min(1) @Max(10)
    private int accommodationScore = 5;

    @Min(1) @Max(10)
    private int extremeScore = 3;

    @Min(1) @Max(10)
    private int transportScore = 5;
}
