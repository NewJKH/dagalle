package org.jkh.com.dagalle.domain.restaurant.controller;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRecommendResponse;
import org.jkh.com.dagalle.domain.restaurant.service.RestaurantService;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/restaurants")
@RequiredArgsConstructor
public class RestaurantController {

    private final RestaurantService restaurantService;

    @GetMapping("/recommend")
    public ApiResponse<List<RestaurantRecommendResponse>> recommend(
            @RequestParam Double lat,
            @RequestParam Double lng) {
        return ApiResponse.ok(restaurantService.recommend(lat, lng));
    }
}
