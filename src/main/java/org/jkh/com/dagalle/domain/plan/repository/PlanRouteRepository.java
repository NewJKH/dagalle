package org.jkh.com.dagalle.domain.plan.repository;

import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface PlanRouteRepository extends JpaRepository<PlanRoute, Long> {
    List<PlanRoute> findByPlanDayOrderBySequenceAsc(PlanDay planDay);
    Optional<PlanRoute> findByIdAndPlanDay(Long id, PlanDay planDay);
    int countByPlanDay(PlanDay planDay);

    /**
     * 해당 사용자가 <b>실제로 다녀온</b>(= 완료된 여행의 일정에 포함된) 장소인지 확인한다.
     * 여행 후 별점은 다녀온 곳에만 남길 수 있으므로 그 검증에 사용한다.
     */
    @Query("""
        SELECT COUNT(r) > 0 FROM PlanRoute r
        JOIN r.planDay d
        JOIN d.travelPlan tp
        JOIN TravelMember m ON m.travelPlan = tp
        WHERE m.user = :user
          AND tp.status = :status
          AND (r.toLocation = :location OR r.fromLocation = :location)
        """)
    boolean existsVisitedByUser(@Param("user") User user,
                                @Param("location") Location location,
                                @Param("status") TravelStatus status);

    @Modifying
    @Query("DELETE FROM PlanRoute r WHERE r.planDay IN (SELECT d FROM PlanDay d WHERE d.travelPlan.id = :travelId)")
    void deleteByTravelPlanId(Long travelId);
}
