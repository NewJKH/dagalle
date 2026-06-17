package org.jkh.com.dagalle.domain.rental.repository;

import org.jkh.com.dagalle.domain.rental.entity.CarRental;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface CarRentalRepository extends JpaRepository<CarRental, Long> {
    List<CarRental> findByTravelPlan(TravelPlan travelPlan);
    Optional<CarRental> findByIdAndTravelPlan(Long id, TravelPlan travelPlan);
    void deleteByTravelPlan(TravelPlan travelPlan);
}
