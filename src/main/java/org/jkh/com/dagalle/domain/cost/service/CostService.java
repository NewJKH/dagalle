package org.jkh.com.dagalle.domain.cost.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.cost.dto.CostSummaryResponse;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostRequest;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostResponse;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
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
public class CostService {

    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final PlanDayRepository planDayRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public CostSummaryResponse getSummary(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        List<PlanRoute> allRoutes = planDayRepository.findByTravelPlanOrderByDayNumberAsc(travel)
                .stream()
                .flatMap(day -> day.getRoutes().stream())
                .toList();

        int transport = allRoutes.stream()
                .filter(r -> r.getTransport() != TransportType.CAR)
                .mapToInt(r -> r.getEstimatedCost() != null ? r.getEstimatedCost() : 0)
                .sum();

        return CostSummaryResponse.builder()
                .totalKrw(transport)
                .breakdown(CostSummaryResponse.Breakdown.builder()
                        .transport(transport)
                        .accommodation(0)
                        .food(0)
                        .fuel(0)
                        .etc(0)
                        .build())
                .build();
    }

    @Transactional(readOnly = true)
    public FuelCostResponse calculateFuelCost(Long userId, Long travelId, FuelCostRequest request) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        double totalCarDistanceKm = planDayRepository.findByTravelPlanOrderByDayNumberAsc(travel)
                .stream()
                .flatMap(day -> day.getRoutes().stream())
                .filter(r -> r.getTransport() == TransportType.CAR && r.getDurationMinutes() != null)
                .mapToDouble(r -> r.getDurationMinutes() * 0.8)  // 평균 속도 48km/h 가정
                .sum();

        double requiredLiters = totalCarDistanceKm / request.getVehicleFuelEfficiency();
        int estimatedCost = (int) Math.round(requiredLiters * request.getFuelPricePerLiter());

        return FuelCostResponse.builder()
                .totalDistanceKm(Math.round(totalCarDistanceKm * 10.0) / 10.0)
                .requiredLiters(Math.round(requiredLiters * 10.0) / 10.0)
                .estimatedFuelCost(estimatedCost)
                .build();
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
