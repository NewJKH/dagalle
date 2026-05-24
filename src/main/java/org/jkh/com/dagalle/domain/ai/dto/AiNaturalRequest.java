package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

/**
 * 자유 입력 여행 생성 요청 DTO
 * 날짜 + 100~300자 자유 텍스트만으로 AI가 여행 계획 전체를 추론합니다.
 */
@Getter
@Setter
public class AiNaturalRequest {

    /** 출발지 (기본값: 인천국제공항) */
    private String startLocation = "인천국제공항";

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    /** 여행 설명 (100~300자 자유 입력) */
    @NotBlank
    @Size(max = 300, message = "여행 설명은 300자 이하로 입력해주세요.")
    private String naturalInput;

    private int memberCount = 2;

    private int foodScore = 5;
    private int accommodationScore = 5;
    private int extremeScore = 3;
    private int transportScore = 5;
}
