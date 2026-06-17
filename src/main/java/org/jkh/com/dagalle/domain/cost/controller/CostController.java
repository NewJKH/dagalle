package org.jkh.com.dagalle.domain.cost.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.cost.dto.CostSummaryResponse;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostRequest;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostResponse;
import org.jkh.com.dagalle.domain.cost.service.CostService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "비용", description = "교통비 합산 / 연료비 계산")
@RestController
@RequestMapping("/api/v1/travels/{travelId}")
@RequiredArgsConstructor
public class CostController {

    private final CostService costService;

    @Operation(summary = "비용 합계 조회", description = "PlanRoute의 estimatedCost를 항목별로 합산합니다. (숙박·식비는 추후 확장)")
    @GetMapping("/cost/summary")
    public ApiResponse<CostSummaryResponse> getSummary(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        return ApiResponse.ok(costService.getSummary(principal.getId(), travelId));
    }

    @Operation(summary = "연료비 계산",
            description = "CAR 루트의 예상 거리를 합산해 연료비를 계산합니다. vehicleFuelEfficiency(km/L)와 fuelPricePerLiter(원)을 입력하세요.")
    @PostMapping("/fuel-cost")
    public ApiResponse<FuelCostResponse> calculateFuelCost(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Valid @RequestBody FuelCostRequest request) {
        return ApiResponse.ok(costService.calculateFuelCost(principal.getId(), travelId, request));
    }
}
