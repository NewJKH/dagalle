package org.jkh.com.dagalle.domain.restaurant.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.restaurant.dto.RestaurantRecommendResponse;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantReview;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.jkh.com.dagalle.domain.restaurant.entity.ReviewTrend;
import org.jkh.com.dagalle.domain.restaurant.repository.RestaurantReviewRepository;
import org.jkh.com.dagalle.domain.restaurant.repository.RestaurantScoreRepository;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class RestaurantService {

    private final RestaurantScoreRepository restaurantScoreRepository;
    private final RestaurantReviewRepository restaurantReviewRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final PlanRouteRepository planRouteRepository;

    /** 기준 좌표 반경 내 추천 식당 (기본 3km, 최대 10곳) */
    @Transactional(readOnly = true)
    public List<RestaurantRecommendResponse> recommend(Double lat, Double lng, Double radiusKm) {
        double radius = (radiusKm != null && radiusKm > 0) ? radiusKm : 3.0;
        return restaurantScoreRepository.findTopNearby(lat, lng, radius, 10).stream()
                .map(score -> RestaurantRecommendResponse.from(score, lat, lng))
                .toList();
    }

    /**
     * 여행을 다녀온 사용자가 식당에 별점(1~5)을 남긴다.
     * <p>
     * 별점을 저장(없으면 생성, 있으면 갱신)한 뒤, <b>해당 식당 하나의</b> 추천 점수만
     * 즉시 재계산한다(이벤트 기반). 전체 배치를 기다릴 필요가 없다.
     */
    @Transactional
    public RestaurantRecommendResponse rateRestaurant(Long userId, Long locationId, int rating) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        Location location = locationRepository.findById(locationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));

        // 0) 다녀온 곳만 평가 가능 — 완료된 내 여행 일정에 포함된 장소인지 검증
        if (!planRouteRepository.existsVisitedByUser(user, location, TravelStatus.COMPLETED)) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }

        // 1) 별점 upsert (사용자-식당 1건)
        restaurantReviewRepository.findByUserAndLocation(user, location)
                .ifPresentOrElse(
                        review -> review.updateRating(rating),
                        () -> restaurantReviewRepository.save(RestaurantReview.builder()
                                .user(user).location(location).rating(rating).build())
                );

        // 2) 이 식당의 사용자 별점만 집계
        long total = restaurantReviewRepository.countByLocation(location);
        Double avg = restaurantReviewRepository.avgRatingByLocation(location);
        long positive = restaurantReviewRepository.countPositiveByLocation(location);
        double avgRating = avg != null ? avg : 0.0;
        double positiveRatio = total > 0 ? (double) positive / total : 0.0;
        int reviewCount = (int) total;

        // 3) 해당 식당 RestaurantScore만 즉시 갱신 (이벤트 기반 단건)
        RestaurantScore score = restaurantScoreRepository.findByLocation(location)
                .map(existing -> {
                    existing.recalculate(avgRating, positiveRatio, ReviewTrend.STABLE, reviewCount);
                    return existing;
                })
                .orElseGet(() -> restaurantScoreRepository.save(RestaurantScore.builder()
                        .location(location)
                        .rating(avgRating)
                        .positiveRatio(positiveRatio)
                        .recentTrend(ReviewTrend.STABLE)
                        .recommendScore(RestaurantScore.calculateScore(avgRating, positiveRatio, ReviewTrend.STABLE, reviewCount))
                        .build()));

        log.info("[별점] user={} location={} rating={} → 재계산 score={}",
                userId, locationId, rating, score.getRecommendScore());
        return RestaurantRecommendResponse.from(score);
    }
}
