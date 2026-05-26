package org.jkh.com.dagalle.domain.rental.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
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
            CarTypeInfo info = resolveCarType(travel);
            rental.update(info.carType(), info.dailyRate(), null, null, null);
            log.info("[렌트카 자동업그레이드 완료] newCarType='{}' dailyRate={}", info.carType(), info.dailyRate());
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

    /** 차종 이름 + 단가를 담는 간단한 레코드 */
    private record CarTypeInfo(String carType, int dailyRate) {}

    /**
     * 여행 조건(국가·인원·숙박등급)에 따라 적합한 차종과 일 렌탈료 계산.
     * AiScheduleService.saveRentalCarByRule()과 동일한 규칙 적용.
     */
    private CarTypeInfo resolveCarType(TravelPlan travel) {
        boolean isJp   = "JP".equalsIgnoreCase(travel.getCountryCode());
        int members     = travel.getMemberCount() != null ? travel.getMemberCount() : 2;
        int accScore    = travel.getAccommodationScore();
        boolean luxury  = accScore >= 8;

        String carType;
        int dailyRate;

        if (isJp) {
            if (luxury) {
                carType   = "토요타 알파드 / 렉서스 NX (프리미엄)";
                dailyRate = 180_000;
            } else if (members >= 5) {
                carType   = "토요타 시에나 / 혼다 스텝왜건 (미니밴)";
                dailyRate = 130_000;
            } else if (members >= 3) {
                carType   = "토요타 프리우스 / 닛산 노트 (준중형 하이브리드)";
                dailyRate = 90_000;
            } else if (accScore >= 5) {
                carType   = "토요타 아쿠아 / 혼다 핏 (소형 하이브리드)";
                dailyRate = 70_000;
            } else {
                carType   = "다이하츠 무브 / 스즈키 허슬러 (경차)";
                dailyRate = 50_000;
            }
        } else {
            if (luxury) {
                carType   = "그랜저 / 제네시스 GV80 (프리미엄)";
                dailyRate = 160_000;
            } else if (members >= 5) {
                carType   = "카니발 / 팰리세이드 (대형 SUV·미니밴)";
                dailyRate = 120_000;
            } else if (members >= 3) {
                carType   = "쏘나타 / K5 / 투싼 (중형·소형 SUV)";
                dailyRate = 80_000;
            } else if (accScore >= 5) {
                carType   = "아반떼 / K3 (소형 세단)";
                dailyRate = 55_000;
            } else {
                carType   = "모닝 / 스파크 (경차)";
                dailyRate = 35_000;
            }
        }
        return new CarTypeInfo(carType, dailyRate);
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
