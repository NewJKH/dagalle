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

        // 항공료 (1인 왕복 — 규칙 기반 추정)
        int members = travel.getMemberCount() != null ? travel.getMemberCount() : 1;
        int flightPerPerson = estimateFlightPerPersonKrw(travel.getCountryCode(), travel.getEndLocation());
        int flightTotal = flightPerPerson * members;

        // 현재 여행 경비 합계 (항공 제외)
        int totalKrw = publicTransport + carCost + rentalTotal + accommodationTotal;

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
                        .fuel(carCost + rentalFuel)
                        .accommodation(accommodationTotal)
                        .rental(rentalTotal)
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
     * 1인 왕복 항공료 규칙 기반 추정 (인천 출발 기준).
     * 실제 항공권 API 미연동 시 평균 참고값.
     */
    private int estimateFlightPerPersonKrw(String countryCode, String endLocation) {
        if (countryCode == null) return 0;
        String loc = endLocation != null ? endLocation.toLowerCase() : "";

        return switch (countryCode.toUpperCase()) {
            case "JP" -> {
                // 근거리: 후쿠오카·오사카·교토·나고야·히로시마 등 서일본
                if (loc.contains("후쿠오카") || loc.contains("오사카") || loc.contains("교토") ||
                    loc.contains("나고야") || loc.contains("히로시마") || loc.contains("나가사키") ||
                    loc.contains("벳푸") || loc.contains("유후인") || loc.contains("구마모토") ||
                    loc.contains("오키나와") || loc.contains("나하") || loc.contains("가고시마")) {
                    yield 280_000;  // 근거리 서일본 왕복 평균
                }
                // 중거리: 도쿄·요코하마·나고야·가나자와
                if (loc.contains("도쿄") || loc.contains("요코하마") || loc.contains("가나자와") ||
                    loc.contains("하코네") || loc.contains("닛코") || loc.contains("가마쿠라")) {
                    yield 360_000;  // 도쿄권 왕복 평균
                }
                // 원거리: 삿포로·홋카이도
                yield 420_000;  // 홋카이도 등 원거리
            }
            case "KR" -> {
                // 국내선 (김포·제주 등)
                if (loc.contains("제주")) yield 130_000;
                if (loc.contains("부산") || loc.contains("대구") || loc.contains("광주")) yield 90_000;
                yield 80_000;
            }
            case "TH" -> 550_000;   // 방콕·치앙마이
            case "VN" -> 480_000;   // 다낭·하노이
            case "PH" -> 520_000;   // 세부·마닐라
            default   -> 500_000;
        };
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
