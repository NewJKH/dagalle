package org.jkh.com.dagalle.domain.plan.repository;

import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

import java.util.List;
import java.util.Optional;

public interface PlanRouteRepository extends JpaRepository<PlanRoute, Long> {
    List<PlanRoute> findByPlanDayOrderBySequenceAsc(PlanDay planDay);
    Optional<PlanRoute> findByIdAndPlanDay(Long id, PlanDay planDay);
    int countByPlanDay(PlanDay planDay);

    @Modifying
    @Query("DELETE FROM PlanRoute r WHERE r.planDay IN (SELECT d FROM PlanDay d WHERE d.travelPlan.id = :travelId)")
    void deleteByTravelPlanId(Long travelId);
}
