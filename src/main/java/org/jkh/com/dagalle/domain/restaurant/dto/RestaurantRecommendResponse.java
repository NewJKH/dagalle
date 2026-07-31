package org.jkh.com.dagalle.domain.restaurant.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.jkh.com.dagalle.domain.restaurant.entity.ReviewTrend;

@Getter
@Builder
public class RestaurantRecommendResponse {
    private Long locationId;
    private String name;
    private String address;
    private Double lat;
    private Double lng;
    private Double rating;
    private Double positiveRatio;
    private ReviewTrend recentTrend;
    private Boolean isOpenNow;
    private Integer recommendScore;
    private LocationSource source;
    /** 기준 좌표로부터의 거리(km). 기준 좌표가 없으면 null */
    private Double distanceKm;

    public static RestaurantRecommendResponse from(RestaurantScore score) {
        return from(score, null, null);
    }

    public static RestaurantRecommendResponse from(RestaurantScore score, Double baseLat, Double baseLng) {
        Location loc = score.getLocation();
        Double distanceKm = (baseLat != null && baseLng != null)
                ? Math.round(haversineKm(baseLat, baseLng, loc.getLat(), loc.getLng()) * 10.0) / 10.0
                : null;
        return RestaurantRecommendResponse.builder()
                .locationId(loc.getId())
                .name(loc.getName())
                .address(loc.getAddress())
                .lat(loc.getLat())
                .lng(loc.getLng())
                .rating(score.getRating())
                .positiveRatio(score.getPositiveRatio())
                .recentTrend(score.getRecentTrend())
                .isOpenNow(loc.getIsOpenNow())
                .recommendScore(score.getRecommendScore())
                .source(loc.getSource())
                .distanceKm(distanceKm)
                .build();
    }

    private static double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }
}
