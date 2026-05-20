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

    @Transactional(readOnly = true)
    public CarRentalResponse get(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        return carRentalRepository.findByTravelPlan(travel).stream()
                .findFirst()
                .map(CarRentalResponse::from)
                .orElseThrow(() -> new BusinessException(ErrorCode.RENTAL_NOT_FOUND));
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
