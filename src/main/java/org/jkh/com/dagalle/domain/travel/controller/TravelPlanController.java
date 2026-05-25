package org.jkh.com.dagalle.domain.travel.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.travel.dto.InviteRequest;
import org.jkh.com.dagalle.domain.travel.dto.SampleImportRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelCreateRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.dto.TravelUpdateRequest;
import org.jkh.com.dagalle.domain.travel.service.TravelPlanService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "여행 계획", description = "여행 CRUD / 팀원 초대·제거")
@RestController
@RequestMapping("/api/v1/travels")
@RequiredArgsConstructor
public class TravelPlanController {

    private final TravelPlanService travelPlanService;

    @Operation(summary = "여행 생성", description = "새 여행 계획을 만들고 날짜별 PlanDay를 자동 생성합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> create(@AuthenticationPrincipal UserPrincipal principal,
                                              @Valid @RequestBody TravelCreateRequest request) {
        return ApiResponse.ok(travelPlanService.create(principal.getId(), request));
    }

    @Operation(summary = "샘플 일정 → 내 일정으로 저장",
            description = "추천 여행 샘플 데이터를 그대로 내 여행 계획으로 복사합니다. 전체 일정(장소·루트)이 즉시 저장됩니다.")
    @PostMapping("/import/sample")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> importSample(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody SampleImportRequest request) {
        return ApiResponse.ok(travelPlanService.importSample(principal.getId(), request));
    }

    @Operation(summary = "내 여행 목록 조회", description = "내가 속한 모든 여행(OWNER + MEMBER)을 반환합니다.")
    @GetMapping
    public ApiResponse<List<TravelResponse>> getMyTravels(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(travelPlanService.getMyTravels(principal.getId()));
    }

    @Operation(summary = "여행 단건 조회")
    @GetMapping("/{travelId}")
    public ApiResponse<TravelResponse> getTravel(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        return ApiResponse.ok(travelPlanService.getTravel(principal.getId(), travelId));
    }

    @Operation(summary = "여행 수정", description = "OWNER만 수정 가능. null 필드는 무시됩니다.")
    @PatchMapping("/{travelId}")
    public ApiResponse<TravelResponse> update(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @RequestBody TravelUpdateRequest request) {
        return ApiResponse.ok(travelPlanService.update(principal.getId(), travelId, request));
    }

    @Operation(summary = "여행 삭제", description = "OWNER만 삭제 가능. 연관 PlanDay / PlanRoute도 함께 삭제됩니다.")
    @DeleteMapping("/{travelId}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        travelPlanService.delete(principal.getId(), travelId);
        return ApiResponse.ok();
    }

    @Operation(summary = "팀원 초대", description = "이메일로 팀원을 초대합니다. OWNER만 가능.")
    @PostMapping("/{travelId}/invite")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<Void> invite(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Valid @RequestBody InviteRequest request) {
        travelPlanService.invite(principal.getId(), travelId, request);
        return ApiResponse.ok();
    }

    @Operation(summary = "팀원 제거", description = "OWNER만 가능. OWNER 자신은 제거 불가.")
    @DeleteMapping("/{travelId}/members/{memberId}")
    public ApiResponse<Void> removeMember(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Parameter(description = "제거할 사용자 ID") @PathVariable Long memberId) {
        travelPlanService.removeMember(principal.getId(), travelId, memberId);
        return ApiResponse.ok();
    }
}
