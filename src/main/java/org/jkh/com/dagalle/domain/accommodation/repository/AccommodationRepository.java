package org.jkh.com.dagalle.domain.accommodation.repository;

import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface AccommodationRepository extends JpaRepository<Accommodation, Long> {
    List<Accommodation> findByTravelPlan(TravelPlan travelPlan);
}
