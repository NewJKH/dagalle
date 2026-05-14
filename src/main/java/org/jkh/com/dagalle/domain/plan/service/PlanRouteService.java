package org.jkh.com.dagalle.domain.plan.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.dto.ReorderRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteAddRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteUpdateRequest;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class PlanRouteService {

    private final PlanRouteRepository planRouteRepository;
    private final PlanDayRepository planDayRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;

    @Transactional
    public void addRoute(Long userId, Long travelId, Integer dayNumber, RouteAddRequest request) {
        PlanDay day = getAccessibleDay(userId, travelId, dayNumber);
        Location from = locationRepository.findById(request.getFromLocationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));
        Location to = locationRepository.findById(request.getToLocationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));
        int nextSeq = planRouteRepository.countByPlanDay(day) + 1;
        PlanRoute route = PlanRoute.builder()
                .planDay(day)
                .sequence(nextSeq)
                .fromLocation(from)
                .toLocation(to)
                .transport(request.getTransport())
                .departureTime(request.getDepartureTime())
                .estimatedCost(request.getEstimatedCost())
                .build();
        planRouteRepository.save(route);
    }

    @Transactional
    public void updateRoute(Long userId, Long travelId, Integer dayNumber,
                            Long routeId, RouteUpdateRequest request) {
        PlanDay day = getAccessibleDay(userId, travelId, dayNumber);
        PlanRoute route = planRouteRepository.findByIdAndPlanDay(routeId, day)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROUTE_NOT_FOUND));
        route.update(request.getTransport(), request.getDepartureTime(),
                request.getDurationMinutes(), request.getEstimatedCost());
    }

    @Transactional
    public void deleteRoute(Long userId, Long travelId, Integer dayNumber, Long routeId) {
        PlanDay day = getAccessibleDay(userId, travelId, dayNumber);
        PlanRoute route = planRouteRepository.findByIdAndPlanDay(routeId, day)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROUTE_NOT_FOUND));
        planRouteRepository.delete(route);
    }

    @Transactional
    public void reorder(Long userId, Long travelId, Integer dayNumber, ReorderRequest request) {
        PlanDay day = getAccessibleDay(userId, travelId, dayNumber);
        List<PlanRoute> routes = planRouteRepository.findByPlanDayOrderBySequenceAsc(day);
        Map<Long, PlanRoute> routeMap = routes.stream()
                .collect(Collectors.toMap(PlanRoute::getId, r -> r));
        List<Long> order = request.getOrder();
        for (int i = 0; i < order.size(); i++) {
            PlanRoute route = routeMap.get(order.get(i));
            if (route == null) throw new BusinessException(ErrorCode.ROUTE_NOT_FOUND);
            route.updateSequence(i + 1);
        }
    }

    private PlanDay getAccessibleDay(Long userId, Long travelId, Integer dayNumber) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!travelMemberRepository.existsByTravelPlanAndUser(travel, user)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
    }
}
