package org.jkh.com.dagalle.domain.plan.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.plan.dto.ReorderRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteAddRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteUpdateRequest;
import org.jkh.com.dagalle.domain.plan.service.PlanRouteService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "루트 (Route)", description = "이동 구간 추가 / 수정 / 삭제 / 순서 변경")
@RestController
@RequestMapping("/api/v1/travels/{travelId}/days/{dayNumber}/routes")
@RequiredArgsConstructor
public class PlanRouteController {

    private final PlanRouteService planRouteService;

    @Operation(summary = "루트 추가", description = "fromLocationId → toLocationId 이동 구간을 추가합니다. /api/v1/locations 로 locationId를 먼저 확보하세요.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> addRoute(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Parameter(description = "Day 번호") @PathVariable Integer dayNumber,
            @Valid @RequestBody RouteAddRequest request) {
        planRouteService.addRoute(principal.getId(), travelId, dayNumber, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "루트 수정", description = "교통수단, 출발시각, 이동시간, 비용을 수정합니다. null 필드는 무시.")
    @PatchMapping("/{routeId}")
    public ApiResponse<Void> updateRoute(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber,
            @Parameter(description = "루트 ID") @PathVariable Long routeId,
            @RequestBody RouteUpdateRequest request) {
        planRouteService.updateRoute(principal.getId(), travelId, dayNumber, routeId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "루트 삭제")
    @DeleteMapping("/{routeId}")
    public ApiResponse<Void> deleteRoute(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber,
            @Parameter(description = "루트 ID") @PathVariable Long routeId) {
        planRouteService.deleteRoute(principal.getId(), travelId, dayNumber, routeId);
        return ApiResponse.ok();
    }

    @Operation(summary = "루트 순서 변경", description = "order 배열에 routeId 순서대로 전달하면 sequence가 재배정됩니다.")
    @PatchMapping("/reorder")
    public ApiResponse<Void> reorder(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber,
            @Valid @RequestBody ReorderRequest request) {
        planRouteService.reorder(principal.getId(), travelId, dayNumber, request);
        return ApiResponse.ok();
    }
}
