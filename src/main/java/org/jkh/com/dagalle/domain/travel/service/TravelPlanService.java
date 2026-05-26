package org.jkh.com.dagalle.domain.travel.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.travel.dto.InviteRequest;
import org.jkh.com.dagalle.domain.travel.dto.SampleImportRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelCreateRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.dto.TravelUpdateRequest;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.entity.TravelStatus;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class TravelPlanService {

    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final PlanDayRepository planDayRepository;
    private final PlanRouteRepository planRouteRepository;
    private final LocationRepository locationRepository;
    private final UserRepository userRepository;

    @Transactional
    public TravelResponse create(Long userId, TravelCreateRequest request) {
        // 날짜 검증: 출발일은 오늘 이후, 귀국일은 출발일 이후
        if (request.getStartDate().isBefore(LocalDate.now())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "출발일은 오늘 이후여야 합니다");
        }
        if (!request.getEndDate().isAfter(request.getStartDate())) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "귀국일은 출발일보다 늦어야 합니다");
        }
        long nights = request.getStartDate().until(request.getEndDate()).getDays();
        if (nights > 30) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "여행 기간은 최대 30박까지 가능합니다");
        }

        User owner = getUser(userId);
        TravelPlan travel = TravelPlan.builder()
                .owner(owner)
                .title(request.getTitle())
                .startLocation(request.getStartLocation())
                .endLocation(request.getEndLocation())
                .startDate(request.getStartDate())
                .endDate(request.getEndDate())
                .countryCode(request.getCountryCode())
                .memberCount(request.getMemberCount())
                .budgetTotal(request.getBudgetTotal())
                .build();
        travelPlanRepository.save(travel);

        TravelMember ownerMember = TravelMember.builder()
                .travelPlan(travel)
                .user(owner)
                .role(MemberRole.OWNER)
                .build();
        travelMemberRepository.save(ownerMember);

        createPlanDays(travel);

        return TravelResponse.from(travel);
    }

    @Transactional(readOnly = true)
    public List<TravelResponse> getMyTravels(Long userId) {
        User user = getUser(userId);
        return travelPlanRepository.findAllByMember(user).stream()
                .map(TravelResponse::from)
                .toList();
    }

    @Transactional(readOnly = true)
    public TravelResponse getTravel(Long userId, Long travelId) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        return TravelResponse.from(travel);
    }

    @Transactional
    public TravelResponse update(Long userId, Long travelId, TravelUpdateRequest request) {
        TravelPlan travel = getOwnerTravel(userId, travelId);

        // 날짜 변경 시 검증
        LocalDate newStart = request.getStartDate() != null ? request.getStartDate() : travel.getStartDate();
        LocalDate newEnd   = request.getEndDate()   != null ? request.getEndDate()   : travel.getEndDate();
        if (!newEnd.isAfter(newStart)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "귀국일은 출발일보다 늦어야 합니다");
        }

        travel.update(request.getTitle(), request.getStartLocation(), request.getEndLocation(),
                request.getStartDate(), request.getEndDate());

        // 상태 전이 검증: DRAFT→CONFIRMED→COMPLETED (역방향 불가)
        if (request.getStatus() != null) {
            validateStatusTransition(travel.getStatus(), request.getStatus());
            travel.updateStatus(request.getStatus());
        }
        return TravelResponse.from(travel);
    }

    /** 허용 전이: DRAFT→CONFIRMED, CONFIRMED→COMPLETED */
    private void validateStatusTransition(TravelStatus current, TravelStatus next) {
        boolean valid = switch (current) {
            case DRAFT     -> next == TravelStatus.CONFIRMED;
            case CONFIRMED -> next == TravelStatus.COMPLETED || next == TravelStatus.DRAFT; // 취소 허용
            case COMPLETED -> false; // 완료 후 변경 불가
        };
        if (!valid) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST,
                    current.name() + " 상태에서 " + next.name() + "으로 변경할 수 없습니다");
        }
    }

    @Transactional
    public void delete(Long userId, Long travelId) {
        TravelPlan travel = getOwnerTravel(userId, travelId);
        travelPlanRepository.delete(travel);
    }

    @Transactional
    public void invite(Long userId, Long travelId, InviteRequest request) {
        TravelPlan travel = getOwnerTravel(userId, travelId);
        User invitee = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (travelMemberRepository.existsByTravelPlanAndUser(travel, invitee)) {
            throw new BusinessException(ErrorCode.ALREADY_MEMBER);
        }
        TravelMember member = TravelMember.builder()
                .travelPlan(travel)
                .user(invitee)
                .role(MemberRole.MEMBER)
                .build();
        travelMemberRepository.save(member);
    }

    @Transactional
    public void removeMember(Long ownerId, Long travelId, Long memberId) {
        TravelPlan travel = getOwnerTravel(ownerId, travelId);
        User target = getUser(memberId);
        if (travelMemberRepository.existsByTravelPlanAndUserAndRole(travel, target, MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.OWNER_CANNOT_LEAVE);
        }
        TravelMember member = travelMemberRepository.findByTravelPlanAndUser(travel, target)
                .orElseThrow(() -> new BusinessException(ErrorCode.MEMBER_NOT_FOUND));
        travelMemberRepository.delete(member);
    }

    /**
     * 샘플 일정 → 내 일정으로 저장
     */
    @Transactional
    public TravelResponse importSample(Long userId, SampleImportRequest req) {
        User owner = getUser(userId);

        // 1. TravelPlan 생성
        TravelPlan travel = TravelPlan.builder()
                .owner(owner)
                .title(req.getTitle())
                .startLocation("인천국제공항")
                .endLocation(req.getDestination())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .countryCode(req.getCountryCode())
                .memberCount(1)
                .build();
        travelPlanRepository.save(travel);

        // 2. OWNER 멤버
        travelMemberRepository.save(TravelMember.builder()
                .travelPlan(travel)
                .user(owner)
                .role(MemberRole.OWNER)
                .build());

        // 3. PlanDay + PlanRoute 생성
        if (req.getSchedule() != null) {
            for (SampleImportRequest.SampleDayDto dayDto : req.getSchedule()) {
                LocalDate dayDate = req.getStartDate().plusDays(dayDto.getDayNumber() - 1);
                PlanDay planDay = planDayRepository.save(
                        PlanDay.builder()
                                .travelPlan(travel)
                                .dayNumber(dayDto.getDayNumber())
                                .date(dayDate)
                                .build()
                );

                if (dayDto.getRoutes() == null) continue;
                int seq = 1;
                for (SampleImportRequest.SampleRouteDto routeDto : dayDto.getRoutes()) {
                    Location from = saveOrGetLocation(routeDto.getFrom());
                    Location to   = saveOrGetLocation(routeDto.getTo());

                    LocalDateTime depTime = null;
                    if (routeDto.getDepartureTime() != null && !routeDto.getDepartureTime().isBlank()) {
                        try {
                            LocalTime t = LocalTime.parse(routeDto.getDepartureTime());
                            depTime = dayDate.atTime(t);
                        } catch (Exception ignored) {}
                    }

                    TransportType transport = parseTransport(routeDto.getTransport());

                    planRouteRepository.save(PlanRoute.builder()
                            .planDay(planDay)
                            .sequence(seq++)
                            .fromLocation(from)
                            .toLocation(to)
                            .transport(transport)
                            .departureTime(depTime)
                            .durationMinutes(routeDto.getDurationMinutes())
                            .estimatedCost(routeDto.getEstimatedCost())
                            .note(routeDto.getNote())
                            .build());
                }
            }
        }

        return TravelResponse.from(travel);
    }

    private Location saveOrGetLocation(SampleImportRequest.SampleLocationDto dto) {
        // 같은 이름 + lat/lng 이면 재사용
        return locationRepository.findByNameAndLatAndLng(dto.getName(), dto.getLat(), dto.getLng())
                .orElseGet(() -> locationRepository.save(Location.builder()
                        .name(dto.getName())
                        .address(dto.getAddress())
                        .lat(dto.getLat())
                        .lng(dto.getLng())
                        .type(parseLocationType(dto.getType()))
                        .source(LocationSource.USER)
                        .description(dto.getDescription())
                        .build()));
    }

    private LocationType parseLocationType(String type) {
        if (type == null) return LocationType.ETC;
        try { return LocationType.valueOf(type); }
        catch (Exception e) { return LocationType.ETC; }
    }

    private TransportType parseTransport(String t) {
        if (t == null) return TransportType.WALK;
        try { return TransportType.valueOf(t); }
        catch (Exception e) { return TransportType.WALK; }
    }

    private void createPlanDays(TravelPlan travel) {
        List<PlanDay> days = new ArrayList<>();
        LocalDate current = travel.getStartDate();
        int dayNumber = 1;
        while (!current.isAfter(travel.getEndDate())) {
            days.add(PlanDay.builder()
                    .travelPlan(travel)
                    .dayNumber(dayNumber++)
                    .date(current)
                    .build());
            current = current.plusDays(1);
        }
        planDayRepository.saveAll(days);
    }

    private TravelPlan getAccessibleTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = getUser(userId);
        if (!travelMemberRepository.existsByTravelPlanAndUser(travel, user)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }

    private TravelPlan getOwnerTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = getUser(userId);
        if (!travelMemberRepository.existsByTravelPlanAndUserAndRole(travel, user, MemberRole.OWNER)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }

    private User getUser(Long userId) {
        return userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
    }
}
