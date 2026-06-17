package org.jkh.com.dagalle.domain.restaurant.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.jkh.com.dagalle.domain.restaurant.entity.ReviewTrend;

@Getter
@Builder
public class RestaurantRecommendResponse {
    private Long locationId;
    private String name;
    private Double rating;
    private Double positiveRatio;
    private ReviewTrend recentTrend;
    private Boolean isOpenNow;
    private Integer recommendScore;
    private LocationSource source;

    public static RestaurantRecommendResponse from(RestaurantScore score) {
        return RestaurantRecommendResponse.builder()
                .locationId(score.getLocation().getId())
                .name(score.getLocation().getName())
                .rating(score.getRating())
                .positiveRatio(score.getPositiveRatio())
                .recentTrend(score.getRecentTrend())
                .isOpenNow(score.getLocation().getIsOpenNow())
                .recommendScore(score.getRecommendScore())
                .source(score.getLocation().getSource())
                .build();
    }
}
