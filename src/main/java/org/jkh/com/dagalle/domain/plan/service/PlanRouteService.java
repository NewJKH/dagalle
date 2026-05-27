package org.jkh.com.dagalle.domain.plan.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.common.websocket.WebSocketEventPublisher;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.client.GoogleRoutesClient;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.plan.dto.PlanRouteResponse;
import org.jkh.com.dagalle.domain.plan.fare.TransitFareRegistry;
import org.jkh.com.dagalle.domain.plan.dto.ReorderRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteAddRequest;
import org.jkh.com.dagalle.domain.plan.dto.RouteUpdateRequest;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
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

@Slf4j
@Service
@RequiredArgsConstructor
public class PlanRouteService {

    private final PlanRouteRepository planRouteRepository;
    private final PlanDayRepository planDayRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;
    private final GoogleRoutesClient googleRoutesClient;
    private final TransitFareRegistry transitFareRegistry;
    private final WebSocketEventPublisher publisher;

    @Transactional
    public PlanRouteResponse addRoute(Long userId, Long travelId, Integer dayNumber, RouteAddRequest request) {
        PlanDay day = getEditableDay(userId, travelId, dayNumber); // 팀원 이상 가능
        Location from = locationRepository.findById(request.getFromLocationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));
        Location to = locationRepository.findById(request.getToLocationId())
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));

        Double distanceKm = null;
        Integer durationMinutes = request.getDurationMinutes();
        GoogleRoutesClient.RouteResult routeResult = googleRoutesClient.computeRoute(
                from.getLat(), from.getLng(), to.getLat(), to.getLng(),
                request.getTransport(), request.getDepartureTime());
        if (routeResult != null) {
            distanceKm = Math.round(routeResult.distanceKm() * 10.0) / 10.0;
            if (durationMinutes == null) durationMinutes = routeResult.durationMinutes();
            log.info("Routes API: {}→{} {}km {}분", from.getName(), to.getName(), distanceKm, routeResult.durationMinutes());
        }

        Integer estimatedCost = request.getEstimatedCost();
        TransportType transport = request.getTransport();
        if (estimatedCost == null &&
                (transport == TransportType.SUBWAY || transport == TransportType.BUS || transport == TransportType.TRAIN)) {
            String countryCode = day.getTravelPlan().getCountryCode();
            double calcDistanceKm = distanceKm != null ? distanceKm
                    : haversineKm(from.getLat(), from.getLng(), to.getLat(), to.getLng());
            estimatedCost = transitFareRegistry.calculate(countryCode, transport, calcDistanceKm).orElse(null);
        }

        int nextSeq = planRouteRepository.countByPlanDay(day) + 1;
        PlanRoute route = PlanRoute.builder()
                .planDay(day).sequence(nextSeq)
                .fromLocation(from).toLocation(to)
                .transport(transport)
                .departureTime(request.getDepartureTime())
                .durationMinutes(durationMinutes)
                .estimatedCost(estimatedCost)
                .distanceKm(distanceKm)
                .build();
        PlanRouteResponse result = PlanRouteResponse.from(planRouteRepository.save(route));

        // 실시간 브로드캐스트: 일정 추가
        publishDayUpdate(travelId, day);
        return result;
    }

    @Transactional
    public void updateRoute(Long userId, Long travelId, Integer dayNumber,
                            Long routeId, RouteUpdateRequest request) {
        PlanDay day = getEditableDay(userId, travelId, dayNumber);
        PlanRoute route = planRouteRepository.findByIdAndPlanDay(routeId, day)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROUTE_NOT_FOUND));
        route.update(request.getTransport(), request.getDepartureTime(),
                request.getDurationMinutes(), request.getEstimatedCost());
        publishDayUpdate(travelId, day);
    }

    @Transactional
    public void deleteRoute(Long userId, Long travelId, Integer dayNumber, Long routeId) {
        PlanDay day = getLeaderDay(userId, travelId, dayNumber); // 리더만 삭제 가능
        PlanRoute route = planRouteRepository.findByIdAndPlanDay(routeId, day)
                .orElseThrow(() -> new BusinessException(ErrorCode.ROUTE_NOT_FOUND));
        planRouteRepository.delete(route);
        publishDayUpdate(travelId, day);
    }

    @Transactional
    public void reorder(Long userId, Long travelId, Integer dayNumber, ReorderRequest request) {
        PlanDay day = getEditableDay(userId, travelId, dayNumber);
        List<PlanRoute> routes = planRouteRepository.findByPlanDayOrderBySequenceAsc(day);
        Map<Long, PlanRoute> routeMap = routes.stream()
                .collect(Collectors.toMap(PlanRoute::getId, r -> r));
        List<Long> order = request.getOrder();
        for (int i = 0; i < order.size(); i++) {
            PlanRoute route = routeMap.get(order.get(i));
            if (route == null) throw new BusinessException(ErrorCode.ROUTE_NOT_FOUND);
            route.updateSequence(i + 1);
        }
        publishDayUpdate(travelId, day);
    }

    // ── 실시간 브로드캐스트 ────────────────────────────────
    private void publishDayUpdate(Long travelId, PlanDay day) {
        try {
            // 최신 Day를 다시 로드해서 전체 일정 전파
            planDayRepository.findByTravelPlanAndDayNumber(day.getTravelPlan(), day.getDayNumber())
                    .ifPresent(fresh -> publisher.publishScheduleUpdate(travelId,
                            Map.of("type", "DAY_UPDATED",
                                   "dayNumber", fresh.getDayNumber(),
                                   "day", PlanDayResponse.from(fresh))));
        } catch (Exception e) {
            log.warn("[WS] 일정 업데이트 브로드캐스트 실패: {}", e.getMessage());
        }
    }

    private double haversineKm(double lat1, double lng1, double lat2, double lng2) {
        double R = 6371;
        double dLat = Math.toRadians(lat2 - lat1);
        double dLng = Math.toRadians(lng2 - lng1);
        double a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
                + Math.cos(Math.toRadians(lat1)) * Math.cos(Math.toRadians(lat2))
                * Math.sin(dLng / 2) * Math.sin(dLng / 2);
        return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    /** 팀원 이상(MEMBER, OWNER) 접근 가능 */
    private PlanDay getEditableDay(Long userId, Long travelId, Integer dayNumber) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        var member = travelMemberRepository.findByTravelPlanAndUser(travel, user)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED));
        if (!member.getRole().canEditSchedule()) {
            throw new BusinessException(ErrorCode.FORBIDDEN);
        }
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
    }

    /** 리더(OWNER)만 접근 가능 */
    private PlanDay getLeaderDay(Long userId, Long travelId, Integer dayNumber) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        var member = travelMemberRepository.findByTravelPlanAndUser(travel, user)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED));
        if (!member.getRole().canDeleteSchedule()) {
            throw new BusinessException(ErrorCode.LEADER_ONLY);
        }
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .orElseThrow(() -> new BusinessException(ErrorCode.DAY_NOT_FOUND));
    }
}
