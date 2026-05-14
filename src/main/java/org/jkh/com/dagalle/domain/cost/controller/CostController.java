package org.jkh.com.dagalle.domain.cost.controller;

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

@RestController
@RequestMapping("/api/v1/travels/{travelId}")
@RequiredArgsConstructor
public class CostController {

    private final CostService costService;

    @GetMapping("/cost/summary")
    public ApiResponse<CostSummaryResponse> getSummary(@AuthenticationPrincipal UserPrincipal principal,
                                                        @PathVariable Long travelId) {
        return ApiResponse.ok(costService.getSummary(principal.getId(), travelId));
    }

    @PostMapping("/fuel-cost")
    public ApiResponse<FuelCostResponse> calculateFuelCost(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @Valid @RequestBody FuelCostRequest request) {
        return ApiResponse.ok(costService.calculateFuelCost(principal.getId(), travelId, request));
    }
}
