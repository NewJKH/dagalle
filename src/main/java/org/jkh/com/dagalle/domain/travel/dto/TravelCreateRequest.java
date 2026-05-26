package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.*;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class TravelCreateRequest {

    @NotBlank(message = "여행 제목을 입력해주세요")
    @Size(max = 100, message = "제목은 100자 이하여야 합니다")
    private String title;

    @NotBlank(message = "출발지를 입력해주세요")
    @Size(max = 200, message = "출발지는 200자 이하여야 합니다")
    private String startLocation;

    @NotBlank(message = "도착지를 입력해주세요")
    @Size(max = 200, message = "도착지는 200자 이하여야 합니다")
    private String endLocation;

    @NotNull(message = "출발일을 입력해주세요")
    private LocalDate startDate;

    @NotNull(message = "귀국일을 입력해주세요")
    private LocalDate endDate;

    @NotBlank(message = "국가 코드를 입력해주세요")
    @Size(min = 2, max = 2, message = "국가 코드는 2자리여야 합니다")
    private String countryCode = "JP";

    @Min(value = 1, message = "인원은 최소 1명이어야 합니다")
    @Max(value = 20, message = "인원은 최대 20명까지입니다")
    private Integer memberCount = 1;

    @Min(value = 0, message = "예산은 0 이상이어야 합니다")
    private Integer budgetTotal;
}
