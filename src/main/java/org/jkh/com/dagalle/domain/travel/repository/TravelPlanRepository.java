package org.jkh.com.dagalle.domain.travel.repository;

import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;

import java.util.List;

public interface TravelPlanRepository extends JpaRepository<TravelPlan, Long> {

    List<TravelPlan> findByOwnerOrderByStartDateDesc(User owner);

    @Query("SELECT t FROM TravelPlan t JOIN t.members m WHERE m.user = :user ORDER BY t.startDate DESC")
    List<TravelPlan> findAllByMember(User user);
}
