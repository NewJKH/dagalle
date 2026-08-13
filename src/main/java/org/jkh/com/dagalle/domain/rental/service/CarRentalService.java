package org.jkh.com.dagalle.domain.rental.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.country.CostBaseline;
import org.jkh.com.dagalle.common.country.CountryProfileRegistry;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.rental.dto.CarRentalRequest;
import org.jkh.com.dagalle.domain.rental.dto.CarRentalResponse;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class CarRentalService {

    private final CarRentalRepository carRentalRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final UserRepository userRepository;
    private final CountryProfileRegistry countryProfileRegistry;

    @Transactional
    public CarRentalResponse upsert(Long userId, Long travelId, CarRentalRequest request) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        List<CarRental> existing = carRentalRepository.findByTravelPlan(travel);
        if (existing.isEmpty()) {
            CarRental rental = CarRental.builder()
                    .travelPlan(travel)
                    .carType(request.getCarType())
                    .dailyRateKrw(request.getDailyRateKrw())
                    .rentalDays(request.getRentalDays())
                    .estimatedFuelKrw(request.getEstimatedFuelKrw())
                    .estimatedTollKrw(request.getEstimatedTollKrw())
                    .build();
            return CarRentalResponse.from(carRentalRepository.save(rental));
        } else {
            CarRental rental = existing.get(0);
            rental.update(request.getCarType(), request.getDailyRateKrw(), request.getRentalDays(),
                    request.getEstimatedFuelKrw(), request.getEstimatedTollKrw());
            return CarRentalResponse.from(rental);
        }
    }

    @Transactional
    public CarRentalResponse get(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        CarRental rental = carRentalRepository.findByTravelPlan(travel).stream()
                .findFirst()
                .orElseThrow(() -> new BusinessException(ErrorCode.RENTAL_NOT_FOUND));

        // 구형 carType(차종명 없는 카테고리 값)이면 현재 여행 조건으로 자동 업그레이드
        if (isLegacyCarType(rental.getCarType())) {
            log.info("[렌트카 자동업그레이드] travelId={} oldCarType='{}'", travelId, rental.getCarType());
            resolveCarType(travel).ifPresent(info -> {
                rental.update(info.carType(), info.dailyRateKrw(), null, null, null);
                log.info("[렌트카 자동업그레이드 완료] newCarType='{}' dailyRate={}",
                        info.carType(), info.dailyRateKrw());
            });
        }

        return CarRentalResponse.from(rental);
    }

    /**
     * 구형 generic carType 여부 판별.
     * 새 형식은 항상 차량 브랜드명을 포함한다(예: "토요타 아쿠아 / 혼다 핏 (소형 하이브리드)").
     * 브랜드 키워드가 하나도 없으면 구형으로 간주한다.
     */
    private boolean isLegacyCarType(String carType) {
        if (carType == null || carType.isBlank()) return true;
        String[] brandKeywords = {
            "토요타", "혼다", "닛산", "다이하츠", "스즈키", "렉서스",   // JP
            "아반떼", "소나타", "쏘나타", "카니발", "그랜저", "제네시스",  // KR
            "모닝", "스파크", "팰리세이드", "투싼", "K3", "K5"
        };
        for (String brand : brandKeywords) {
            if (carType.contains(brand)) return false;
        }
        return true;
    }

    /**
     * 여행 조건(국가·인원·숙박등급)에 맞는 차종과 일 렌탈료.
     *
     * <p>표는 {@link CostBaseline}이 갖고 있다 — 예전에는 이 메서드와
     * {@code AiScheduleService.saveRentalCarByRule()}이 같은 표를 각자 복사해 두고 있었다.
     * 렌터카를 쓸 수 없는 나라는 빈 값이 온다.
     */
    private java.util.Optional<CostBaseline.RentalTier> resolveCarType(TravelPlan travel) {
        int members  = travel.getMemberCount() != null ? travel.getMemberCount() : 2;
        int accScore = travel.getAccommodationScore();
        return countryProfileRegistry.require(travel.getCountryCode())
                .costBaseline()
                .rental(members, accScore);
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
