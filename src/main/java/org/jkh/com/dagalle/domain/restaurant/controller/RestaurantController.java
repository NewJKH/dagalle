package org.jkh.com.dagalle.domain.restaurant.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRecommendResponse;
import org.jkh.com.dagalle.domain.restaurant.service.RestaurantService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "음식점", description = "현재 위치 기반 맛집 추천 (매일 새벽 3시 점수 재계산)")
@RestController
@RequestMapping("/api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    @Operation(summary = "근처 맛집 추천",
            description = "현재 위치(lat, lng)를 기준으로 평점·리뷰 기반 추천 점수가 높은 음식점 최대 10개를 반환합니다.")
    @GetMapping("/recommend")
    public ApiResponse<List<RestaurantRecommendResponse>> recommend(
            @Parameter(description = "위도 (예: 35.1587)") @RequestParam Double lat,
            @Parameter(description = "경도 (예: 129.1604)") @RequestParam Double lng) {
        return ApiResponse.ok(restaurantService.recommend(lat, lng));
    }
}
