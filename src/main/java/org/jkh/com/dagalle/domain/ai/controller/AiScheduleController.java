package org.jkh.com.dagalle.domain.ai.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.ai.dto.AiFillRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiGenerateRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiNaturalRequest;
import org.jkh.com.dagalle.domain.ai.dto.DayModifyRequest;
import org.jkh.com.dagalle.domain.ai.service.AiScheduleService;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@Tag(name = "AI 일정", description = "Claude AI 기반 자동 일정 생성 / 빈 시간 채우기")
@RestController
@RequestMapping("/api/v1/travels")
@RequiredArgsConstructor
public class AiScheduleController {

    private final AiScheduleService aiScheduleService;

    @Operation(summary = "AI 일정 초기화 (스켈레톤)",
            description = "TravelPlan + 렌트카 + 숙박만 생성. Day는 생성하지 않음. 이후 /ai/day/{N} 으로 Day별 생성.")
    @PostMapping("/ai/init")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> init(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.ok(aiScheduleService.initSchedule(principal.getId(), request));
    }

    @Operation(summary = "AI Day 단건 생성 (또는 재생성)",
            description = "특정 Day의 일정을 Claude AI로 생성. 기존 Day가 있으면 삭제 후 재생성.")
    @PostMapping("/{travelId}/ai/day/{dayNumber}")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<PlanDayResponse> generateDay(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber) {
        return ApiResponse.ok(aiScheduleService.generateDay(principal.getId(), travelId, dayNumber));
    }

    @Operation(summary = "자유 입력으로 AI 일정 생성",
            description = "날짜 + 100~300자 자유 텍스트 → AI가 여행지·교통·테마 등 모두 추론하여 TravelPlan 생성.")
    @PostMapping("/ai/init/natural")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> initNatural(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiNaturalRequest request) {
        return ApiResponse.ok(aiScheduleService.initFromNaturalInput(principal.getId(), request));
    }

    @Operation(summary = "AI 일정 전체 생성 (레거시)",
            description = "전체 일정을 한 번에 생성. Day별 승인이 필요 없는 경우 사용.")
    @PostMapping("/ai/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.ok(aiScheduleService.generateSchedule(principal.getId(), request));
    }

    @Operation(summary = "AI Day 수정 (자연어 요청)",
            description = "기존 일정을 유지하면서 사용자 요청사항만 반영하여 Day를 재생성합니다.")
    @PostMapping("/{travelId}/ai/day/{dayNumber}/modify")
    public ApiResponse<PlanDayResponse> modifyDay(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber,
            @Valid @RequestBody DayModifyRequest request) {
        return ApiResponse.ok(aiScheduleService.modifyDay(principal.getId(), travelId, dayNumber, request.getPrompt()));
    }

    @Operation(summary = "빈 시간 채우기",
            description = "현재 위치와 빈 시간대를 전달하면 Claude AI가 방문 가능한 장소 3~5개를 추천합니다.")
    @PostMapping("/{travelId}/days/{dayNumber}/ai/fill")
    public ApiResponse<List<Map<String, Object>>> fill(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Parameter(description = "Day 번호") @PathVariable Integer dayNumber,
            @Valid @RequestBody AiFillRequest request) {
        return ApiResponse.ok(aiScheduleService.fillFreeTime(principal.getId(), travelId, dayNumber, request));
    }
}
