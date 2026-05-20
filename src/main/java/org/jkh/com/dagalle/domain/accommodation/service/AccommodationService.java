package org.jkh.com.dagalle.domain.accommodation.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.accommodation.dto.AccommodationRequest;
import org.jkh.com.dagalle.domain.accommodation.dto.AccommodationResponse;
import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;
import org.jkh.com.dagalle.domain.accommodation.repository.AccommodationRepository;
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
public class AccommodationService {

    private final AccommodationRepository accommodationRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final UserRepository userRepository;

    @Transactional
    public AccommodationResponse add(Long userId, Long travelId, AccommodationRequest request) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);

        Accommodation accommodation = Accommodation.builder()
                .travelPlan(travel)
                .hotelName(request.getHotelName())
                .checkIn(request.getCheckIn())
                .checkOut(request.getCheckOut())
                .pricePerNightKrw(request.getPricePerNightKrw())
                .build();

        return AccommodationResponse.from(accommodationRepository.save(accommodation));
    }

    @Transactional(readOnly = true)
    public List<AccommodationResponse> list(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        return accommodationRepository.findByTravelPlan(travel).stream()
                .map(AccommodationResponse::from)
                .toList();
    }

    @Transactional
    public void delete(Long userId, Long travelId, Long accommodationId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        Accommodation accommodation = accommodationRepository.findById(accommodationId)
                .orElseThrow(() -> new BusinessException(ErrorCode.ACCOMMODATION_NOT_FOUND));
        if (!accommodation.getTravelPlan().getId().equals(travel.getId())) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        accommodationRepository.delete(accommodation);
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
