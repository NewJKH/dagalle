package org.jkh.com.dagalle.domain.travel.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.travel.dto.*;
import org.jkh.com.dagalle.domain.travel.service.TravelPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "여행 계획", description = "여행 CRUD / 팀원 초대·강퇴·역할 변경")
@RestController
@RequestMapping("/api/v1/travels")
@RequiredArgsConstructor
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    @Operation(summary = "여행 생성")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                              @Valid @RequestBody TravelCreateRequest request) {
        return ApiResponse.ok(travelPlanService.create(principal.getId(), request));
    }

    @Operation(summary = "샘플 일정 → 내 일정으로 저장")
    @PostMapping("/import/sample")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> importSample(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SampleImportRequest request) {
        return ApiResponse.ok(travelPlanService.importSample(principal.getId(), request));
    }

    @Operation(summary = "내 여행 목록 조회")
    @GetMapping
    public ApiResponse<List<TravelResponse>> getMyTravels(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(travelPlanService.getMyTravels(principal.getId()));
    }

    @Operation(summary = "여행 단건 조회")
    @GetMapping("/{travelId}")
    public ApiResponse<TravelResponse> getTravel(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId) {
        return ApiResponse.ok(travelPlanService.getTravel(principal.getId(), travelId));
    }

    @Operation(summary = "여행 수정", description = "리더(OWNER)만 수정 가능.")
    @PatchMapping("/{travelId}")
    public ApiResponse<TravelResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @Valid @RequestBody TravelUpdateRequest request) {
        return ApiResponse.ok(travelPlanService.update(principal.getId(), travelId, request));
    }

    @Operation(summary = "여행 삭제", description = "리더(OWNER)만 삭제 가능.")
    @DeleteMapping("/{travelId}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId) {
        travelPlanService.delete(principal.getId(), travelId);
        return ApiResponse.ok();
    }

    // ──────────────── 멤버 관리 ────────────────

    @Operation(summary = "멤버 목록 조회", description = "여행에 속한 모든 멤버와 역할을 반환합니다.")
    @GetMapping("/{travelId}/members")
    public ApiResponse<List<MemberResponse>> getMembers(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId) {
        return ApiResponse.ok(travelPlanService.getMembers(principal.getId(), travelId));
    }

    @Operation(summary = "팀원 초대", description = "이메일로 초대. 역할 지정 가능 (기본 MEMBER). 리더만 가능.")
    @PostMapping("/{travelId}/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<MemberResponse> invite(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @Valid @RequestBody InviteRequest request) {
        return ApiResponse.ok(travelPlanService.invite(principal.getId(), travelId, request));
    }

    @Operation(summary = "팀원 강퇴", description = "리더만 가능. 리더는 강퇴 불가.")
    @DeleteMapping("/{travelId}/members/{targetUserId}")
    public ApiResponse<Void> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @Parameter(description = "강퇴할 사용자 ID") @PathVariable Long targetUserId) {
        travelPlanService.removeMember(principal.getId(), travelId, targetUserId);
        return ApiResponse.ok();
    }

    @Operation(summary = "역할 변경", description = "리더만 가능. 자기 자신 변경 불가. 마지막 리더 강등 불가.")
    @PatchMapping("/{travelId}/members/{targetUserId}/role")
    public ApiResponse<MemberResponse> changeRole(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Long targetUserId,
            @Valid @RequestBody RoleChangeRequest request) {
        return ApiResponse.ok(travelPlanService.changeRole(principal.getId(), travelId, targetUserId, request));
    }
}
