package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.util.List;

/**
 * 샘플 일정 체험하기 → 내 일정으로 저장 요청 DTO
 */
@Getter
@NoArgsConstructor
public class SampleImportRequest {

    @NotBlank
    private String title;

    @NotBlank
    private String countryCode;

    /** 여행 목적지 (도착지) */
    @NotBlank
    private String destination;

    @NotNull
    private LocalDate startDate;

    @NotNull
    private LocalDate endDate;

    private String transport; // "대중교통" | "렌트카"

    private List<SampleDayDto> schedule;

    @Getter
    @NoArgsConstructor
    public static class SampleDayDto {
        private int dayNumber;
        private String label;
        private List<SampleRouteDto> routes;
    }

    @Getter
    @NoArgsConstructor
    public static class SampleRouteDto {
        private SampleLocationDto from;
        private SampleLocationDto to;
        private String transport; // WALK | SUBWAY | BUS | TRAIN | CAR
        private String departureTime; // HH:mm
        private int durationMinutes;
        private int estimatedCost;
        private String note;
    }

    @Getter
    @NoArgsConstructor
    public static class SampleLocationDto {
        private String name;
        private String type; // RESTAURANT | CAFE | MUSEUM | PARK | HOTEL | STATION | AIRPORT | SHOPPING | ETC
        private double lat;
        private double lng;
        private String description;
        private String address;
    }
}
