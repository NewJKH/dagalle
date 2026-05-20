package org.jkh.com.dagalle.domain.cost.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;
import org.jkh.com.dagalle.domain.accommodation.repository.AccommodationRepository;
import org.jkh.com.dagalle.domain.cost.dto.CostSummaryResponse;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostRequest;
import org.jkh.com.dagalle.domain.cost.dto.FuelCostResponse;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.rental.entity.CarRental;
import org.jkh.com.dagalle.domain.rental.repository.CarRentalRepository;
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
    private final CarRentalRepository carRentalRepository;
    private final AccommodationRepository accommodationRepository;

    @Transactional(readOnly = true)
    public CostSummaryResponse getSummary(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        List<PlanRoute> allRoutes = planDayRepository.findByTravelPlanOrderByDayNumberAsc(travel)
                .stream()
                .flatMap(day -> day.getRoutes().stream())
                .toList();

        // 대중교통 비용 (지하철, 버스, 기차, 도보)
        int publicTransport = allRoutes.stream()
                .filter(r -> r.getTransport() != TransportType.CAR)
                .mapToInt(r -> r.getEstimatedCost() != null ? r.getEstimatedCost() : 0)
                .sum();

        // 자동차 이동 예상 비용 (주차비, 통행료 등 estimatedCost에 입력된 값)
        int carCost = allRoutes.stream()
                .filter(r -> r.getTransport() == TransportType.CAR)
                .mapToInt(r -> r.getEstimatedCost() != null ? r.getEstimatedCost() : 0)
                .sum();

        // 렌트카 비용
        List<CarRental> carRentals = carRentalRepository.findByTravelPlan(travel);
        int rentalTotal = carRentals.stream()
                .mapToInt(CarRental::totalCostKrw)
                .sum();

        // 렌트카 연료비
        int rentalFuel = carRentals.stream()
                .mapToInt(r -> r.getEstimatedFuelKrw() != null ? r.getEstimatedFuelKrw() : 0)
                .sum();

        // 숙박비
        int accommodationTotal = accommodationRepository.findByTravelPlan(travel).stream()
                .mapToInt(Accommodation::totalCostKrw)
                .sum();

        int totalKrw = publicTransport + carCost + rentalTotal + accommodationTotal;

        return CostSummaryResponse.builder()
                .totalKrw(totalKrw)
                .breakdown(CostSummaryResponse.Breakdown.builder()
                        .transport(publicTransport)
                        .fuel(carCost + rentalFuel)
                        .accommodation(accommodationTotal)
                        .rental(rentalTotal)
                        .food(0)
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
                .filter(r -> r.getTransport() == TransportType.CAR)
                .mapToDouble(r -> {
                    if (r.getDistanceKm() != null) return r.getDistanceKm();           // Routes API 값 우선
                    if (r.getDurationMinutes() != null) return r.getDurationMinutes() * 0.8; // 폴백: 48km/h 추정
                    return 0;
                })
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
