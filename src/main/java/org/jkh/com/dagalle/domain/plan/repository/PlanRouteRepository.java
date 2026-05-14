package org.jkh.com.dagalle.domain.plan.repository;

import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface PlanRouteRepository extends JpaRepository<PlanRoute, Long> {
    List<PlanRoute> findByPlanDayOrderBySequenceAsc(PlanDay planDay);
    Optional<PlanRoute> findByIdAndPlanDay(Long id, PlanDay planDay);
    int countByPlanDay(PlanDay planDay);
}
