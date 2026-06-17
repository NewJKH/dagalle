package org.jkh.com.dagalle.domain.rental.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.rental.dto.CarRentalRequest;
import org.jkh.com.dagalle.domain.rental.dto.CarRentalResponse;
import org.jkh.com.dagalle.domain.rental.service.CarRentalService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Slf4j
@Tag(name = "렌트카", description = "렌트카 정보 등록 및 조회")
@RestController
@RequestMapping("/api/v1/travels/{travelId}/rental")
@RequiredArgsConstructor
public class CarRentalController {

    private final CarRentalService carRentalService;

    @Operation(summary = "렌트카 등록/수정",
            description = "렌트카 정보를 등록하거나 기존 정보를 수정합니다. (여행당 1건)")
    @PutMapping
    public ApiResponse<CarRentalResponse> upsert(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId,
            @Valid @RequestBody CarRentalRequest request) {
        return ApiResponse.ok(carRentalService.upsert(principal.getId(), travelId, request));
    }

    @Operation(summary = "렌트카 조회", description = "해당 여행의 렌트카 정보를 조회합니다.")
    @GetMapping
    public ApiResponse<CarRentalResponse> get(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "여행 ID") @PathVariable Long travelId) {
        return ApiResponse.ok(carRentalService.get(principal.getId(), travelId));
    }
}
