package org.jkh.com.dagalle.domain.plan.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.plan.service.PlanDayService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "일정 (Day)", description = "여행의 날짜별 일정 조회. 루트 목록 포함.")
@RestController
@RequestMapping("/api/v1/travels/{travelId}/days")
@RequiredArgsConstructor
public class PlanDayController {

    private final PlanDayService planDayService;

    @Operation(summary = "전체 날짜 일정 조회", description = "여행의 모든 날짜 일정과 각 날짜의 루트를 반환합니다.")
    @GetMapping
    public ApiResponse<List<PlanDayResponse>> getDays(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        return ApiResponse.ok(planDayService.getDays(principal.getId(), travelId));
    }

    @Operation(summary = "특정 날짜 일정 조회", description = "dayNumber는 1부터 시작합니다.")
    @GetMapping("/{dayNumber}")
    public ApiResponse<PlanDayResponse> getDay(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Parameter(description = "Day 번호 (1부터 시작)") @PathVariable Integer dayNumber) {
        return ApiResponse.ok(planDayService.getDay(principal.getId(), travelId, dayNumber));
    }
}
