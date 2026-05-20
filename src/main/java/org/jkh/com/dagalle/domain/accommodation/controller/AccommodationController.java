package org.jkh.com.dagalle.domain.accommodation.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.accommodation.dto.AccommodationRequest;
import org.jkh.com.dagalle.domain.accommodation.dto.AccommodationResponse;
import org.jkh.com.dagalle.domain.accommodation.service.AccommodationService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Slf4j
@Tag(name = "숙박", description = "숙박 정보 등록/조회/삭제")
@RestController
@RequestMapping("/api/v1/travels/{travelId}/accommodations")
@RequiredArgsConstructor
public class AccommodationController {

    private final AccommodationService accommodationService;

    @Operation(summary = "숙박 추가", description = "여행에 숙박 정보를 추가합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<AccommodationResponse> add(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Valid @RequestBody AccommodationRequest request) {
        return ApiResponse.ok(accommodationService.add(principal.getId(), travelId, request));
    }

    @Operation(summary = "숙박 목록 조회", description = "해당 여행의 숙박 목록을 조회합니다.")
    @GetMapping
    public ApiResponse<List<AccommodationResponse>> list(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        return ApiResponse.ok(accommodationService.list(principal.getId(), travelId));
    }

    @Operation(summary = "숙박 삭제", description = "숙박 정보를 삭제합니다.")
    @DeleteMapping("/{accommodationId}")
    public ApiResponse<Void> delete(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Parameter(description = "숙박 ID") @PathVariable Long accommodationId) {
        accommodationService.delete(principal.getId(), travelId, accommodationId);
        return ApiResponse.ok(null);
    }
}
