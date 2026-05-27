package org.jkh.com.dagalle.domain.travel.repository;

import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;
import java.util.Optional;

public interface TravelMemberRepository extends JpaRepository<TravelMember, Long> {
    boolean existsByTravelPlanAndUser(TravelPlan travelPlan, User user);
    Optional<TravelMember> findByTravelPlanAndUser(TravelPlan travelPlan, User user);
    Optional<TravelMember> findById(Long id);
    List<TravelMember> findByTravelPlan(TravelPlan travelPlan);
    boolean existsByTravelPlanAndUserAndRole(TravelPlan travelPlan, User user, MemberRole role);
    void deleteByTravelPlan(TravelPlan travelPlan);

    @Query("SELECT m FROM TravelMember m JOIN FETCH m.user WHERE m.travelPlan = :travelPlan ORDER BY m.role ASC")
    List<TravelMember> findByTravelPlanWithUser(@Param("travelPlan") TravelPlan travelPlan);
}
