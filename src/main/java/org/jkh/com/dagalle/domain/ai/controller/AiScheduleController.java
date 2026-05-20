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
import org.jkh.com.dagalle.domain.ai.service.AiScheduleService;
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

    @Operation(summary = "AI 일정 자동 생성",
            description = """
                    Claude AI에게 출발지·여행지·날짜·성향을 전달해 전체 여행 일정을 자동 생성합니다.
                    - 응답 시간: 약 20~40초 (Claude API 호출)
                    - 생성된 TravelPlan + PlanDay + PlanRoute + Location이 DB에 저장됩니다.
                    - tendency: RELAX / BALANCED / ACTIVE
                    """)
    @PostMapping("/ai/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> generate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.ok(aiScheduleService.generateSchedule(principal.getId(), request));
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
