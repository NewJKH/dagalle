package org.jkh.com.dagalle.domain.plan.controller;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.plan.service.PlanDayService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/travels/{travelId}/days")
@RequiredArgsConstructor
public class PlanDayController {

    private final PlanDayService planDayService;

    @GetMapping
    public ApiResponse<List<PlanDayResponse>> getDays(@AuthenticationPrincipal UserPrincipal principal,
                                                       @PathVariable Long travelId) {
        return ApiResponse.ok(planDayService.getDays(principal.getId(), travelId));
    }

    @GetMapping("/{dayNumber}")
    public ApiResponse<PlanDayResponse> getDay(@AuthenticationPrincipal UserPrincipal principal,
                                                @PathVariable Long travelId,
                                                @PathVariable Integer dayNumber) {
        return ApiResponse.ok(planDayService.getDay(principal.getId(), travelId, dayNumber));
    }
}
