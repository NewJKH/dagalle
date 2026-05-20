package org.jkh.com.dagalle.domain.travel.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.travel.dto.InviteRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelCreateRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.dto.TravelUpdateRequest;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TravelPlanService {

    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final PlanDayRepository planDayRepository;
    private final UserRepository userRepository;

    @Transactional
    public TravelResponse create(Long userId, TravelCreateRequest request) {
        User owner = getUser(userId);
        TravelPlan travel = TravelPlan.builder()
                .owner(owner)
                .title(request.getTitle())
                .startLocation(request.getStartLocation())
                .endLocation(request.getEndLocation())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .countryCode(request.getCountryCode())
                .memberCount(request.getMemberCount())
                .budgetTotal(request.getBudgetTotal())
                .build();
        travelPlanRepository.save(travel);

        TravelMember ownerMember = TravelMember.builder()
                .travelPlan(travel)
                .user(owner)
                .role(MemberRole.OWNER)
                .build();
        travelMemberRepository.save(ownerMember);

        createPlanDays(travel);

        return TravelResponse.from(travel);
    }

    @Transactional(readOnly = true)
    public List<TravelResponse> getMyTravels(Long userId) {
        User user = getUser(userId);
        return travelPlanRepository.findAllByMember(user).stream()
                .map(TravelResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TravelResponse getTravel(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        return TravelResponse.from(travel);
    }

    @Transactional
    public TravelResponse update(Long userId, Long travelId, TravelUpdateRequest request) {
        TravelPlan travel = getOwnerTravel(userId, travelId);
        travel.update(request.getTitle(), request.getStartLocation(), request.getEndLocation(),
                request.getStartDate(), request.getEndDate());
        return TravelResponse.from(travel);
    }

    @Transactional
    public void delete(Long userId, Long travelId) {
        TravelPlan travel = getOwnerTravel(userId, travelId);
        travelPlanRepository.delete(travel);
    }

    @Transactional
    public void invite(Long userId, Long travelId, InviteRequest request) {
        TravelPlan travel = getOwnerTravel(userId, travelId);
        User invitee = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (travelMemberRepository.existsByTravelPlanAndUser(travel, invitee)) {
            throw new BusinessException(ErrorCode.ALREADY_MEMBER);
        }
        TravelMember member = TravelMember.builder()
                .travelPlan(travel)
                .user(invitee)
                .role(MemberRole.MEMBER)
                .build();
        travelMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(Long ownerId, Long travelId, Long memberId) {
        TravelPlan travel = getOwnerTravel(ownerId, travelId);
        User target = getUser(memberId);
        if (travelMemberRepository.existsByTravelPlanAndUserAndRole(travel, target, MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE);
        }
        TravelMember member = travelMemberRepository.findByTravelPlanAndUser(travel, target)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        travelMemberRepository.delete(member);
    }

    private void createPlanDays(TravelPlan travel) {
        List<PlanDay> days = new ArrayList<>();
        LocalDate current = travel.getStartDate();
        int dayNumber = 1;
        while (!current.isAfter(travel.getEndDate())) {
            days.add(PlanDay.builder()
                    .travelPlan(travel)
                    .dayNumber(dayNumber++)
                    .date(current)
                    .build());
            current = current.plusDays(1);
        }
        planDayRepository.saveAll(days);
    }

    private TravelPlan getAccessibleTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = getUser(userId);
        if (!travelMemberRepository.existsByTravelPlanAndUser(travel, user)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }

    private TravelPlan getOwnerTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = getUser(userId);
        if (!travelMemberRepository.existsByTravelPlanAndUserAndRole(travel, user, MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
