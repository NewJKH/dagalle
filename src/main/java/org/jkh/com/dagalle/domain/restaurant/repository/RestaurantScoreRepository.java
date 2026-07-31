package org.jkh.com.dagalle.domain.restaurant.repository;

import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.restaurant.entity.RestaurantScore;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface RestaurantScoreRepository extends JpaRepository<RestaurantScore, Long> {
    Optional<RestaurantScore> findByLocation(Location location);

    /**
     * 기준 좌표에서 radiusKm 이내의 식당을 추천 점수 순으로 조회한다.
     * <p>
     * · 거리 필터를 두어 실제로 "근처"만 나오게 한다(이전에는 전역 상위 점수가 나왔다).
     * · 영업중 여부(is_open_now)로 걸러내지 않는다 — 값이 NULL인 장소가 많고,
     *   여행 일정은 미래 시점이라 현재 영업 여부로 제외하면 안 된다. 대신 정렬에만 반영한다.
     * · ACOS 인자를 LEAST(1, …)로 감싸 부동소수 오차로 NaN이 나오는 것을 막는다.
     */
    @Query(value = """
        SELECT rs.*
        FROM restaurant_scores rs
        JOIN locations l ON rs.location_id = l.id
        WHERE (6371 * ACOS(LEAST(1, COS(RADIANS(:lat)) * COS(RADIANS(l.lat))
                * COS(RADIANS(l.lng) - RADIANS(:lng))
                + SIN(RADIANS(:lat)) * SIN(RADIANS(l.lat))))) <= :radiusKm
        ORDER BY
            CASE WHEN l.is_open_now = true THEN 0 ELSE 1 END ASC,
            rs.recommend_score DESC,
            (6371 * ACOS(LEAST(1, COS(RADIANS(:lat)) * COS(RADIANS(l.lat))
                * COS(RADIANS(l.lng) - RADIANS(:lng))
                + SIN(RADIANS(:lat)) * SIN(RADIANS(l.lat))))) ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<RestaurantScore> findTopNearby(@Param("lat") Double lat,
                                        @Param("lng") Double lng,
                                        @Param("radiusKm") double radiusKm,
                                        @Param("limit") int limit);
}
