package org.jkh.com.dagalle.domain.restaurant.repository;

import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface RestaurantScoreRepository extends JpaRepository<RestaurantScore, Long> {
    Optional<RestaurantScore> findByLocation(Location location);

    @Query(value = """
        SELECT rs.*, (6371 * ACOS(COS(RADIANS(:lat)) * COS(RADIANS(l.lat))
            * COS(RADIANS(l.lng) - RADIANS(:lng)) + SIN(RADIANS(:lat)) * SIN(RADIANS(l.lat))))
            AS distance
        FROM restaurant_scores rs
        JOIN locations l ON rs.location_id = l.id
        WHERE l.is_open_now = true
        ORDER BY rs.recommend_score DESC, distance ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<RestaurantScore> findTopNearby(Double lat, Double lng, int limit);
}
