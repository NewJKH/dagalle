package org.jkh.com.dagalle.domain.plan.repository;

import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PlanDayRepository extends JpaRepository<PlanDay, Long> {

    /**
     * routes를 JOIN FETCH해서 N+1 방지.
     * fromLocation / toLocation도 함께 fetch.
     */
    @Query("""
            SELECT DISTINCT d FROM PlanDay d
            LEFT JOIN FETCH d.routes r
            LEFT JOIN FETCH r.fromLocation
            LEFT JOIN FETCH r.toLocation
            WHERE d.travelPlan = :travelPlan
            ORDER BY d.dayNumber ASC
            """)
    List<PlanDay> findByTravelPlanOrderByDayNumberAsc(TravelPlan travelPlan);

    @Query("""
            SELECT d FROM PlanDay d
            LEFT JOIN FETCH d.routes r
            LEFT JOIN FETCH r.fromLocation
            LEFT JOIN FETCH r.toLocation
            WHERE d.travelPlan = :travelPlan AND d.dayNumber = :dayNumber
            """)
    Optional<PlanDay> findByTravelPlanAndDayNumber(TravelPlan travelPlan, Integer dayNumber);
}
