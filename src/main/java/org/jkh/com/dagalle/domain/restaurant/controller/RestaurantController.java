package org.jkh.com.dagalle.domain.restaurant.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRatingRequest;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRecommendResponse;
import org.jkh.com.dagalle.domain.restaurant.service.RestaurantService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "음식점", description = "맛집 추천 + 여행 후 별점 등록")
@RestController
@RequestMapping("/api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    @Operation(summary = "근처 맛집 추천",
            description = "기준 위치(lat, lng) 반경 내에서 추천 점수가 높은 음식점 최대 10개를 반환합니다. radiusKm 기본값 3km.")
    @GetMapping("/recommend")
    public ApiResponse<List<RestaurantRecommendResponse>> recommend(
            @Parameter(description = "위도 (예: 35.1587)") @RequestParam Double lat,
            @Parameter(description = "경도 (예: 129.1604)") @RequestParam Double lng,
            @Parameter(description = "검색 반경 km (기본 3)") @RequestParam(required = false) Double radiusKm) {
        return ApiResponse.ok(restaurantService.recommend(lat, lng, radiusKm));
    }

    @Operation(summary = "여행 후 식당 별점 등록",
            description = "다녀온 식당에 1~5점을 남깁니다. 해당 식당의 추천 점수가 즉시 재계산됩니다(이벤트 기반).")
    @PostMapping("/{locationId}/rating")
    public ApiResponse<RestaurantRecommendResponse> rate(
            @AuthenticationPrincipal UserPrincipal principal,
            @Parameter(description = "식당 location ID") @PathVariable Long locationId,
            @Valid @RequestBody RestaurantRatingRequest request) {
        return ApiResponse.ok(restaurantService.rateRestaurant(principal.getId(), locationId, request.getRating()));
    }
}
