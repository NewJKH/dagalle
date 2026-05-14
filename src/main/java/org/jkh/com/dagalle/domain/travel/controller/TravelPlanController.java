package org.jkh.com.dagalle.domain.travel.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.travel.dto.InviteRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelCreateRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.dto.TravelUpdateRequest;
import org.jkh.com.dagalle.domain.travel.service.TravelPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/travels")
@RequiredArgsConstructor
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                              @Valid @RequestBody TravelCreateRequest request) {
        return ApiResponse.ok(travelPlanService.create(principal.getId(), request));
    }

    @GetMapping
    public ApiResponse<List<TravelResponse>> getMyTravels(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(travelPlanService.getMyTravels(principal.getId()));
    }

    @GetMapping("/{travelId}")
    public ApiResponse<TravelResponse> getTravel(@AuthenticationPrincipal UserPrincipal principal,
                                                  @PathVariable Long travelId) {
        return ApiResponse.ok(travelPlanService.getTravel(principal.getId(), travelId));
    }

    @PatchMapping("/{travelId}")
    public ApiResponse<TravelResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                              @PathVariable Long travelId,
                                              @RequestBody TravelUpdateRequest request) {
        return ApiResponse.ok(travelPlanService.update(principal.getId(), travelId, request));
    }

    @DeleteMapping("/{travelId}")
    public ApiResponse<Void> delete(@AuthenticationPrincipal UserPrincipal principal,
                                    @PathVariable Long travelId) {
        travelPlanService.delete(principal.getId(), travelId);
        return ApiResponse.ok();
    }

    @PostMapping("/{travelId}/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> invite(@AuthenticationPrincipal UserPrincipal principal,
                                    @PathVariable Long travelId,
                                    @Valid @RequestBody InviteRequest request) {
        travelPlanService.invite(principal.getId(), travelId, request);
        return ApiResponse.ok();
    }

    @DeleteMapping("/{travelId}/members/{memberId}")
    public ApiResponse<Void> removeMember(@AuthenticationPrincipal UserPrincipal principal,
                                          @PathVariable Long travelId,
                                          @PathVariable Long memberId) {
        travelPlanService.removeMember(principal.getId(), travelId, memberId);
        return ApiResponse.ok();
    }
}
