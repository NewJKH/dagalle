package org.jkh.com.dagalle.domain.plan.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class PlanDayService {

    private final PlanDayRepository planDayRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PlanDayResponse> getDays(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        return planDayRepository.findByTravelPlanOrderByDayNumberAsc(travel).stream()
                .map(PlanDayResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public PlanDayResponse getDay(Long userId, Long travelId, Integer dayNumber) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        PlanDay day = planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
        return PlanDayResponse.from(day);
    }

    private TravelPlan getAccessibleTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!travelMemberRepository.existsByTravelPlanAndUser(travel, user)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }
}
