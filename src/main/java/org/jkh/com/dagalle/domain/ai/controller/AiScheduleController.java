package org.jkh.com.dagalle.domain.ai.controller;

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

@RestController
@RequestMapping("/api/v1/travels")
@RequiredArgsConstructor
public class AiScheduleController {

    private final AiScheduleService aiScheduleService;

    @PostMapping("/ai/generate")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<TravelResponse> generate(@AuthenticationPrincipal UserPrincipal principal,
                                                @Valid @RequestBody AiGenerateRequest request) {
        return ApiResponse.ok(aiScheduleService.generateSchedule(principal.getId(), request));
    }

    @PostMapping("/{travelId}/days/{dayNumber}/ai/fill")
    public ApiResponse<List<Map<String, Object>>> fill(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @PathVariable Integer dayNumber,
            @Valid @RequestBody AiFillRequest request) {
        return ApiResponse.ok(aiScheduleService.fillFreeTime(principal.getId(), travelId, dayNumber, request));
    }
}
