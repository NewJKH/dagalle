package org.jkh.com.dagalle.domain.accommodation.repository;

import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

public interface AccommodationRepository extends JpaRepository<Accommodation, Long> {
    List<Accommodation> findByTravelPlan(TravelPlan travelPlan);

    @Query("SELECT a FROM Accommodation a WHERE a.travelPlan = :travel AND a.checkIn = :checkIn")
    Optional<Accommodation> findByTravelPlanAndCheckInDate(@Param("travel") TravelPlan travel, @Param("checkIn") LocalDate checkIn);
}
