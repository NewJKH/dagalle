package org.jkh.com.dagalle.domain.plan.controller;

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

@RestController
@RequestMapping("/api/v1/travels/{travelId}/days/{dayNumber}/routes")
@RequiredArgsConstructor
public class PlanRouteController {

    private final PlanRouteService planRouteService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> addRoute(@AuthenticationPrincipal UserPrincipal principal,
                                      @PathVariable Long travelId,
                                      @PathVariable Integer dayNumber,
                                      @Valid @RequestBody RouteAddRequest request) {
        planRouteService.addRoute(principal.getId(), travelId, dayNumber, request);
        return ApiResponse.ok();
    }

    @PatchMapping("/{routeId}")
    public ApiResponse<Void> updateRoute(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable Long travelId,
                                         @PathVariable Integer dayNumber,
                                         @PathVariable Long routeId,
                                         @RequestBody RouteUpdateRequest request) {
        planRouteService.updateRoute(principal.getId(), travelId, dayNumber, routeId, request);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{routeId}")
    public ApiResponse<Void> deleteRoute(@AuthenticationPrincipal UserPrincipal principal,
                                         @PathVariable Long travelId,
                                         @PathVariable Integer dayNumber,
                                         @PathVariable Long routeId) {
        planRouteService.deleteRoute(principal.getId(), travelId, dayNumber, routeId);
        return ApiResponse.ok();
    }

    @PatchMapping("/reorder")
    public ApiResponse<Void> reorder(@AuthenticationPrincipal UserPrincipal principal,
                                     @PathVariable Long travelId,
                                     @PathVariable Integer dayNumber,
                                     @Valid @RequestBody ReorderRequest request) {
        planRouteService.reorder(principal.getId(), travelId, dayNumber, request);
        return ApiResponse.ok();
    }
}
