package org.jkh.com.dagalle.domain.cost.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.country.CountryProfileRegistry;
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
    private final CountryProfileRegistry countryProfileRegistry;

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

        // 렌트카 비용 (기본 렌탈료만 — 연료/통행료는 fuel/toll로 분리)
        List<CarRental> carRentals = carRentalRepository.findByTravelPlan(travel);
        int rentalBase = carRentals.stream()
                .mapToInt(r -> (r.getDailyRateKrw() != null && r.getRentalDays() != null)
                        ? r.getDailyRateKrw() * r.getRentalDays() : 0)
                .sum();

        // 렌트카 연료비 + 통행료 (breakdown의 연료 항목에 합산)
        int rentalFuel = carRentals.stream()
                .mapToInt(r -> (r.getEstimatedFuelKrw() != null ? r.getEstimatedFuelKrw() : 0)
                             + (r.getEstimatedTollKrw() != null ? r.getEstimatedTollKrw() : 0))
                .sum();

        // 숙박비
        int accommodationTotal = accommodationRepository.findByTravelPlan(travel).stream()
                .mapToInt(Accommodation::totalCostKrw)
                .sum();

        // 항공료 (1인 왕복 — 규칙 기반 추정)
        int members = travel.getMemberCount() != null ? travel.getMemberCount() : 1;
        int flightPerPerson = estimateFlightPerPersonKrw(travel.getCountryCode(), travel.getEndLocation());
        int flightTotal = flightPerPerson * members;

        // 현재 여행 경비 합계 (항공 제외)
        int totalKrw = publicTransport + carCost + rentalBase + rentalFuel + accommodationTotal;

        // 팀 전체 총비용 (항공 포함)
        int teamTotalKrw = totalKrw + flightTotal;

        // 1인 평균 비용
        int perPersonKrw = members > 0 ? teamTotalKrw / members : teamTotalKrw;

        return CostSummaryResponse.builder()
                .totalKrw(totalKrw)
                .flightPerPersonKrw(flightPerPerson)
                .teamTotalKrw(teamTotalKrw)
                .perPersonKrw(perPersonKrw)
                .memberCount(members)
                .breakdown(CostSummaryResponse.Breakdown.builder()
                        .transport(publicTransport)
                        .fuel(carCost + rentalFuel)   // route CAR 비용 + 렌트카 연료·통행료
                        .accommodation(accommodationTotal)
                        .rental(rentalBase)            // 렌트카 기본 렌탈료만 (연료·통행료 제외)
                        .flight(flightTotal)
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

    /**
     * 1인 왕복 항공료 추정 (인천 출발 기준).
     *
     * <p>국가별 표는 {@link org.jkh.com.dagalle.common.country.CostBaseline}에 있다.
     * 국가를 추가할 때 이 메서드는 고치지 않는다.
     */
    private int estimateFlightPerPersonKrw(String countryCode, String endLocation) {
        if (countryCode == null) return 0;
        return countryProfileRegistry.require(countryCode)
                .costBaseline()
                .flightRoundTripKrw(endLocation);
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
