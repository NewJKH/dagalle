package org.jkh.com.dagalle.domain.location.repository;

import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface LocationRepository extends JpaRepository<Location, Long> {
    Optional<Location> findByExternalIdAndSource(String externalId, LocationSource source);

    @Query(value = """
        SELECT *, (6371 * ACOS(COS(RADIANS(:lat)) * COS(RADIANS(lat))
            * COS(RADIANS(lng) - RADIANS(:lng)) + SIN(RADIANS(:lat)) * SIN(RADIANS(lat))))
            AS distance
        FROM locations
        WHERE name LIKE %:keyword%
        ORDER BY distance ASC
        LIMIT :limit
        """, nativeQuery = true)
    List<Location> searchByKeywordNearby(String keyword, Double lat, Double lng, int limit);
}
