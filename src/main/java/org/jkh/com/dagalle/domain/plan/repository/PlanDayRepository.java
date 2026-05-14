package org.jkh.com.dagalle.domain.plan.repository;

import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanDayRepository extends JpaRepository<PlanDay, Long> {
    List<PlanDay> findByTravelPlanOrderByDayNumberAsc(TravelPlan travelPlan);
    Optional<PlanDay> findByTravelPlanAndDayNumber(TravelPlan travelPlan, Integer dayNumber);
}
