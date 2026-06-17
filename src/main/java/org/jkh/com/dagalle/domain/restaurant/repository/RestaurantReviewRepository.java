package org.jkh.com.dagalle.domain.restaurant.repository;

import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantReview;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.Optional;

public interface RestaurantReviewRepository extends JpaRepository<RestaurantReview, Long> {

    Optional<RestaurantReview> findByUserAndLocation(User user, Location location);

    long countByLocation(Location location);

    /** 해당 식당의 평균 별점 (리뷰 없으면 null) */
    @Query("SELECT AVG(r.rating) FROM RestaurantReview r WHERE r.location = :location")
    Double avgRatingByLocation(@Param("location") Location location);

    /** 긍정 평점(4점 이상) 개수 — positiveRatio 계산용 */
    @Query("SELECT COUNT(r) FROM RestaurantReview r WHERE r.location = :location AND r.rating >= 4")
    long countPositiveByLocation(@Param("location") Location location);
}
