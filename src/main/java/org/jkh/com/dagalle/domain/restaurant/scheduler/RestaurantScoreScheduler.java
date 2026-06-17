package org.jkh.com.dagalle.domain.restaurant.scheduler;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.jkh.com.dagalle.domain.restaurant.entity.ReviewTrend;
import org.jkh.com.dagalle.domain.restaurant.repository.RestaurantScoreRepository;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Component
@RequiredArgsConstructor
public class RestaurantScoreScheduler {

    private final LocationRepository locationRepository;
    private final RestaurantScoreRepository restaurantScoreRepository;

    @Scheduled(cron = "0 0 3 * * *")
    @Transactional
    public void recalculateAllScores() {
        log.info("식당 추천 점수 배치 재계산 시작");
        locationRepository.findAll().stream()
                .filter(loc -> loc.getType() == LocationType.RESTAURANT)
                .forEach(location -> {
                    double rating = location.getRating() != null ? location.getRating() : 0;
                    int reviewCount = location.getReviewCount() != null ? location.getReviewCount() : 0;
                    // positiveRatio, recentTrend는 실제로는 외부 리뷰 API에서 가져와야 함
                    double positiveRatio = 0.75;
                    ReviewTrend trend = ReviewTrend.STABLE;

                    restaurantScoreRepository.findByLocation(location).ifPresentOrElse(
                            score -> score.recalculate(rating, positiveRatio, trend, reviewCount),
                            () -> restaurantScoreRepository.save(RestaurantScore.builder()
                                    .location(location)
                                    .rating(rating)
                                    .positiveRatio(positiveRatio)
                                    .recentTrend(trend)
                                    .recommendScore(RestaurantScore.calculateScore(rating, positiveRatio, trend, reviewCount))
                                    .build())
                    );
                });
        log.info("식당 추천 점수 배치 재계산 완료");
    }
}
