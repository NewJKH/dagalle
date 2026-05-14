package org.jkh.com.dagalle.domain.restaurant.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRecommendResponse;
import org.jkh.com.dagalle.domain.restaurant.repository.RestaurantScoreRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantScoreRepository restaurantScoreRepository;

    @Transactional(readOnly = true)
    public List<RestaurantRecommendResponse> recommend(Double lat, Double lng) {
        return restaurantScoreRepository.findTopNearby(lat, lng, 10).stream()
                .map(RestaurantRecommendResponse::from)
                .toList();
    }
}
