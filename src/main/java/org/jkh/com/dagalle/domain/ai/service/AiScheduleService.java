package org.jkh.com.dagalle.domain.ai.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;
import org.jkh.com.dagalle.domain.accommodation.repository.AccommodationRepository;
import org.jkh.com.dagalle.domain.ai.client.ClaudeApiClient;
import org.jkh.com.dagalle.domain.ai.dto.AiFillRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiGenerateRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiNaturalRequest;
import org.jkh.com.dagalle.domain.location.client.GooglePlacesClient;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.dto.PlanDayResponse;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.fare.TransitFareRegistry;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.rental.entity.CarRental;
import org.jkh.com.dagalle.domain.rental.repository.CarRentalRepository;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.Tendency;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.jkh.com.dagalle.common.country.AiPromptRule;
import org.jkh.com.dagalle.common.country.CountryProfileRegistry;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import jakarta.persistence.EntityManager;
import jakarta.persistence.PersistenceContext;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.time.format.DateTimeFormatter;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * AI 여행 일정 생성 서비스.
 *
 * ── Claude API 호출 정책 ─────────────────────────────────
 * ① generateSchedule / initFromNaturalInput  → 1회 (전체 Day 일괄 생성)
 * ② generateDay (단건 재생성, 사용자 요청 시)  → 1회
 * ③ fillFreeTime (빈 시간 채우기, 사용자 요청)  → 1회
 *
 * 스켈레톤(제목·렌트카·숙박) 및 자연어 파싱은 규칙 기반으로 처리하여
 * 불필요한 Claude 호출을 제거했습니다.
 * ─────────────────────────────────────────────────────────
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AiScheduleService {

    @PersistenceContext
    private EntityManager entityManager;

    private final ClaudeApiClient claudeApiClient;
    private final UserRepository userRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final PlanDayRepository planDayRepository;
    private final PlanRouteRepository planRouteRepository;
    private final LocationRepository locationRepository;
    private final CarRentalRepository carRentalRepository;
    private final AccommodationRepository accommodationRepository;
    private final ObjectMapper objectMapper;
    private final GooglePlacesClient googlePlacesClient;
    private final TransitFareRegistry transitFareRegistry;
    private final CountryProfileRegistry countryProfileRegistry;

    /** 국가별 프롬프트 어휘. 이 메서드를 거치면 국가 분기가 호출부에 남지 않는다. */
    private AiPromptRule promptRule(String countryCode) {
        return countryProfileRegistry.require(countryCode).aiPromptRule();
    }

    // ──────────────────────────────────────────────
    //  Day 전체 스키마 (단일 Claude 호출용)
    // ──────────────────────────────────────────────

    private static final String DAY_SCHEMA =
            "{\"dayNumber\":숫자,\"date\":\"YYYY-MM-DD\",\"routes\":[{" +
            "\"fromLocation\":{\"name\":\"장소명\",\"address\":\"주소\",\"lat\":위도,\"lng\":경도," +
            "\"type\":\"RESTAURANT|CAFE|HOTEL|STATION|AIRPORT|SHOPPING|MUSEUM|PARK|ETC\",\"description\":\"설명\"}," +
            "\"toLocation\":{...}," +
            "\"transport\":\"CAR|WALK|SUBWAY|BUS|TRAIN\"," +
            "\"departureTime\":\"HH:mm\",\"durationMinutes\":숫자,\"estimatedCost\":숫자,\"note\":\"설명\"}]}";

    // ──────────────────────────────────────────────
    //  ① 전체 일정 생성 (Claude 1회 호출)
    //     - 스켈레톤(제목·렌트카·숙박)은 규칙 기반
    //     - 모든 Day를 단일 Claude 호출로 생성
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse generateSchedule(Long userId, AiGenerateRequest req) {
        validateDateRange(req.getStartDate(), req.getEndDate());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        int totalDays = (int) daysBetween(req.getStartDate(), req.getEndDate());
        log.info("[AI generate] userId={}, {}→{}, {}~{} ({}일)",
                userId, req.getStartLocation(), req.getEndLocation(),
                req.getStartDate(), req.getEndDate(), totalDays);

        // 규칙 기반: TravelPlan 생성 (Claude 호출 없음)
        TravelPlan travel = createTravelByRule(user, req, totalDays);

        // Claude 1회: 1일차만 생성 (나머지는 사용자가 순서대로 생성)
        generateDay(userId, travel.getId(), 1, null);

        log.info("[AI generate 완료] travelId={}", travel.getId());
        return TravelResponse.from(travel);
    }

    // ──────────────────────────────────────────────
    //  ② 자유 입력 → 규칙 파싱 → generateSchedule
    //     - 도시명 찾으면 Claude 파싱 호출 없음
    //     - 도시명 못 찾을 때만 Claude 1회 fallback
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse initFromNaturalInput(Long userId, AiNaturalRequest req) {
        log.info("[AI natural] userId={}, input='{}'", userId, req.getNaturalInput());

        AiGenerateRequest structuredReq = parseNaturalByRules(req);

        // 규칙으로 여행지를 특정하지 못한 경우에만 Claude fallback
        if (structuredReq.getEndLocation() == null || structuredReq.getEndLocation().isBlank()) {
            log.info("[AI natural] 도시명 미감지 → Claude 파싱 fallback");
            structuredReq = parseNaturalByAi(req);
        } else {
            log.info("[AI natural] 규칙 파싱 성공: 여행지={}, 국가={}, 렌트카={}",
                    structuredReq.getEndLocation(), structuredReq.getCountryCode(), structuredReq.isWithCar());
        }

        return generateSchedule(userId, structuredReq);
    }

    // ──────────────────────────────────────────────
    //  ③ initSchedule: 스켈레톤만 (Claude 호출 없음)
    //     프론트에서 travelId 먼저 받고 Day별 생성할 때 사용
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse initSchedule(Long userId, AiGenerateRequest req) {
        validateDateRange(req.getStartDate(), req.getEndDate());
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        int totalDays = (int) daysBetween(req.getStartDate(), req.getEndDate());
        TravelPlan travel = createTravelByRule(user, req, totalDays);
        log.info("[AI init] 규칙 기반 완료, travelId={}", travel.getId());
        return TravelResponse.from(travel);
    }

    // ──────────────────────────────────────────────
    //  ④ Day 단건 생성 / 재생성 (Claude 1회)
    //     사용자가 특정 Day만 재생성할 때 사용
    // ──────────────────────────────────────────────

    @Transactional
    public PlanDayResponse generateDay(Long userId, Long travelId, int dayNumber, String userWish) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        int totalDays = (int) daysBetween(travel.getStartDate(), travel.getEndDate());
        LocalDate date = travel.getStartDate().plusDays(dayNumber - 1);

        planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .ifPresent(planDayRepository::delete);
        planDayRepository.flush();

        log.info("[AI generateDay] travelId={}, day={}/{}, wish='{}'", travelId, dayNumber, totalDays,
                userWish != null ? userWish : "없음");

        String prevLastLocation = resolvePrevLastLocation(travel, dayNumber);
        String accommodationHint = accommodationRepository.findByTravelPlan(travel).stream()
                .map(a -> a.getHotelName() + "(" + a.getCheckIn() + "~" + a.getCheckOut() + ")")
                .reduce("", (a, b) -> a + b + " ");
        String flightHint = buildFlightHint(travel, dayNumber, totalDays);
        boolean nightviewUsed = isNightviewAlreadyUsed(travel, dayNumber);

        // ── TODO: 하드코딩 fallback 활성 (나중에 제거) ──────────────────
        String dayRaw;
        try {
            dayRaw = claudeApiClient.chat(
                    buildDaySystemPrompt(travel.getCountryCode(),
                            travel.getFoodScore(), travel.getAccommodationScore(),
                            travel.getExtremeScore(), travel.getTransportScore()),
                    buildDayUserMessage(travel, dayNumber, totalDays, date,
                            prevLastLocation, accommodationHint.trim(), flightHint, nightviewUsed, userWish));
        } catch (Exception e) {
            String errMsg = e.getMessage();
            if (errMsg != null && errMsg.contains("credit balance is too low")) {
                log.error("[AI generateDay] ❌ Anthropic 크레딧 소진! console.anthropic.com/settings/billing 에서 충전 필요. day={}", dayNumber);
                throw new BusinessException(ErrorCode.AI_CREDIT_EXHAUSTED);
            }
            log.warn("[AI generateDay] Claude 호출 실패 → 하드코딩 fallback. day={}, dest={}, err={}",
                    dayNumber, travel.getEndLocation(), errMsg);
            dayRaw = buildFallbackDayJson(travel.getEndLocation(), travel.getCountryCode(), dayNumber, date);
        }
        log.debug("[AI day{} 응답] {}", dayNumber, dayRaw);

        JsonNode dayNode;
        try {
            dayNode = parseJson(dayRaw);
        } catch (Exception e) {
            log.warn("[AI generateDay] JSON 파싱 실패 → 하드코딩 fallback. day={}, err={}", dayNumber, e.getMessage());
            dayNode = parseJson(buildFallbackDayJson(travel.getEndLocation(), travel.getCountryCode(), dayNumber, date));
        }
        // ── 하드코딩 fallback 끝 ───────────────────────────────────────

        savePlanDay(travel, dayNode, dayNumber, date);

        // flush 후 교정 (lazy load 이슈 방지)
        entityManager.flush();
        entityManager.clear();

        // ── 2일차 이상: 첫 route의 fromLocation을 전날 마지막 toLocation으로 강제 교정 ──
        if (dayNumber > 1) {
            fixFirstRouteFromLocation(travel, dayNumber);
            entityManager.flush();
            entityManager.clear();
        }

        TravelPlan travelFresh = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        return planDayRepository.findByTravelPlanAndDayNumber(travelFresh, dayNumber)
                .map(PlanDayResponse::from)
                .orElseThrow(() -> new IllegalStateException("Day 저장 후 조회 실패: day=" + dayNumber));
    }

    // ──────────────────────────────────────────────
    //  ⑤ Day 자연어 수정 (Claude 1회)
    //     기존 일정 컨텍스트 + 사용자 요청 → 수정 반영
    // ──────────────────────────────────────────────

    @Transactional
    public PlanDayResponse modifyDay(Long userId, Long travelId, int dayNumber, String userPrompt) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        LocalDate date = travel.getStartDate().plusDays(dayNumber - 1);

        // 기존 일정 JSON 요약 추출
        String currentJson = buildCurrentDayContext(travel, dayNumber);

        // 기존 Day 삭제
        planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .ifPresent(planDayRepository::delete);
        planDayRepository.flush();

        log.info("[AI modifyDay] travelId={}, day={}, prompt='{}'", travelId, dayNumber, userPrompt);

        String raw = claudeApiClient.chat(
                buildModifySystemPrompt(travel.getCountryCode(),
                        travel.getFoodScore(), travel.getAccommodationScore(),
                        travel.getExtremeScore(), travel.getTransportScore()),
                buildModifyUserMessage(travel, dayNumber, date, currentJson, userPrompt));
        log.debug("[AI modify 응답] {}", raw);

        JsonNode dayNode = parseJson(raw);
        savePlanDay(travel, dayNode, dayNumber, date);

        // 수정 후에도 전날 마지막 위치 강제 교정
        if (dayNumber > 1) {
            fixFirstRouteFromLocation(travel, dayNumber);
        }

        entityManager.flush();
        entityManager.clear();
        TravelPlan fresh = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        return planDayRepository.findByTravelPlanAndDayNumber(fresh, dayNumber)
                .map(PlanDayResponse::from)
                .orElseThrow(() -> new IllegalStateException("수정 후 조회 실패: day=" + dayNumber));
    }

    /** 기존 Day 일정을 Claude에 전달할 간결한 텍스트로 변환 */
    private String buildCurrentDayContext(TravelPlan travel, int dayNumber) {
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .map(day -> {
                    StringBuilder sb = new StringBuilder();
                    for (PlanRoute r : day.getRoutes()) {
                        sb.append(String.format("[%s] %s→%s (%s, %d분, %d원)\n",
                                r.getDepartureTime() != null
                                        ? r.getDepartureTime().toLocalTime().toString().substring(0, 5)
                                        : "?",
                                r.getFromLocation().getName(),
                                r.getToLocation().getName(),
                                r.getTransport(),
                                r.getDurationMinutes() != null ? r.getDurationMinutes() : 0,
                                r.getEstimatedCost() != null ? r.getEstimatedCost() : 0));
                    }
                    return sb.toString();
                })
                .orElse("(기존 일정 없음)");
    }

    /** 수정 전용 시스템 프롬프트 */
    private String buildModifySystemPrompt(String countryCode,
                                           int foodScore, int accommodationScore,
                                           int extremeScore, int transportScore) {
        AiPromptRule rule = promptRule(countryCode);
        return "JSON만 응답. 마크다운 금지.\n스키마: " + DAY_SCHEMA + "\n" +
                "【실존 장소만】Google Maps 실제 검색되는 공식 명칭만 사용. 만들어낸 골목·거리 이름 절대 금지. 확신 없는 장소는 유명한 다른 장소로 대체.\n" +
                "【장소명 형식】" + rule.placeNamingGuide() + "\n" +
                rule.costGuide() + "\n" +
                "【공항·렌트카 이동 규칙 — 수정 시에도 유지】\n" +
                "- 공항↔도시 이동: 반드시 TRAIN 또는 BUS. CAR 사용 절대 금지.\n" +
                "- 렌트카 허브-앤-스포크: 호텔(CAR) → 관광지구 주차장(ETC) → 관광지들(WALK) → 주차장(WALK) → 호텔(CAR).\n" +
                "- 관광지구 내부 500m 이내: WALK만 허용. CAR 금지.\n" +
                "- 마지막날 렌트카 반납 후: 렌트카 영업소(ETC) → 공항(TRAIN/BUS) 순서.\n" +
                "【수정 규칙 — 최우선 준수】\n" +
                "1. 사용자 요청사항만 변경. 요청하지 않은 route는 장소명·좌표·시간 그대로 유지.\n" +
                "2. 장소 추가 시 → 기존 동선 흐름(지리적 방향)에 자연스럽게 삽입. 왔다갔다 금지.\n" +
                "3. 장소 교체 시 → 같은 type·비슷한 위치의 장소로 대체. 이전·이후 시간 연동 조정.\n" +
                "4. 시간 삭제 요청 시 → 해당 route 제거 후 앞뒤 시간 자동 재계산.\n" +
                "5. departureTime은 '도착시각 + 체류시간' 기준으로 정확히 계산.\n" +
                "체류시간: 전망대 20~35분. 카페·빵집 20~50분. 식사 50~90분. 박물관 90~120분. 신사 30~60분. 쇼핑몰 60~90분. 먹거리거리·시장 60~90분. 마트 45~60분. 축제 90~150분. 온천 60~90분.\n" +
                "온천: 반드시 19:00 이후. 낮 온천 절대 금지.\n" +
                "야경·전망대: 전체 여행 최대 1회. 이미 다른 Day에 있으면 이 Day 추가 금지.\n" +
                "장소 추가 시: 관광지뿐 아니라 먹거리 거리·마트·로컬카페·축제 등 일상적 장소도 적극 활용.\n" +
                "동선: 인접 구역 묶음 배치. 왔다갔다 절대 금지.\n" +
                "【숙박 규칙】마지막 날 제외 시 → 마지막 route의 toLocation.type='HOTEL' (실존 호텔명). 체크인 departureTime=20:00~21:00.\n" +
                buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);
    }

    /** 수정 전용 유저 메시지 */
    private String buildModifyUserMessage(TravelPlan travel, int dayNumber, LocalDate date,
                                          String currentJson, String userPrompt) {
        int totalDays = (int) daysBetween(travel.getStartDate(), travel.getEndDate());
        String transport = travel.isWithCar()
                ? "렌트카(공항=TRAIN/BUS, 지역간=CAR, 관광지내=WALK, 구역간반납포함)"
                : "대중교통(공항=TRAIN/BUS, 도심=SUBWAY/BUS, 근거리=WALK)";
        // 수정 시에도 이전날 마지막 위치 강제 적용
        String prevLocationJson = resolvePrevLastLocation(travel, dayNumber);
        String startConstraint = "";
        if (!prevLocationJson.isEmpty()) {
            String cleanJson = prevLocationJson.replace(" [야간이동도착지]", "");
            startConstraint = "\n⚠️ 첫 route의 fromLocation은 반드시 유지: " + cleanJson + "\n";
        }
        return String.format(
                "여행지:%s | %d일차/%d일 | %s | 이동:%s%s\n" +
                "【현재 %d일차 일정】\n%s\n" +
                "【수정 요청】%s\n" +
                "위 요청을 반영한 %d일차 전체 일정을 JSON으로 출력.",
                travel.getEndLocation(), dayNumber, totalDays, date, transport,
                startConstraint,
                dayNumber, currentJson,
                userPrompt,
                dayNumber);
    }

    // ──────────────────────────────────────────────
    //  ⑦ 빈 시간 채우기 (Claude 1회, 사용자 요청 시)
    // ──────────────────────────────────────────────

    public List<Map<String, Object>> fillFreeTime(Long userId, Long travelId,
                                                   Integer dayNumber, AiFillRequest req) {
        log.info("[AI fillFreeTime] travelId={}, day={}", travelId, dayNumber);
        String raw = claudeApiClient.chat(buildFillSystemPrompt(), buildFillUserMessage(req));
        JsonNode recs = parseJson(raw);
        List<Map<String, Object>> result = new ArrayList<>();
        for (JsonNode place : recs.path("places")) {
            Map<String, Object> item = new HashMap<>();
            item.put("name",        place.path("name").asText());
            item.put("address",     place.path("address").asText());
            item.put("lat",         place.path("lat").asDouble());
            item.put("lng",         place.path("lng").asDouble());
            item.put("type",        place.path("type").asText());
            item.put("description", place.path("description").asText());
            item.put("stayMinutes", place.path("stayMinutes").asInt(60));
            result.add(item);
        }
        return result;
    }

    // ══════════════════════════════════════════════
    //  규칙 기반 여행 생성 (Claude 호출 없음)
    // ══════════════════════════════════════════════

    /**
     * Claude 호출 없이 TravelPlan + 렌트카 + 숙박을 규칙으로 생성.
     */
    private TravelPlan createTravelByRule(User user, AiGenerateRequest req, int totalDays) {
        String title = buildTitleByRule(req.getEndLocation(), totalDays, req.getTheme());
        String keywords = String.join(",", req.getKeywords());

        TravelPlan travel = TravelPlan.builder()
                .owner(user)
                .title(title)
                .startLocation(req.getStartLocation())
                .endLocation(req.getEndLocation())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .countryCode(req.getCountryCode())
                .memberCount(req.getMemberCount())
                .budgetTotal(req.getBudgetTotal())
                .theme(req.getTheme())
                .keywords(keywords)
                .withCar(req.isWithCar())
                .departureFlightTime(req.getDepartureFlightTime())
                .arrivalAtDestTime(req.getArrivalAtDestTime())
                .returnFlightTime(req.getReturnFlightTime())
                .foodScore(req.getFoodScore())
                .accommodationScore(req.getAccommodationScore())
                .extremeScore(req.getExtremeScore())
                .transportScore(req.getTransportScore())
                .build();
        travel.markAiGenerated();
        travelPlanRepository.save(travel);

        travelMemberRepository.save(TravelMember.builder()
                .travelPlan(travel).user(user).role(MemberRole.OWNER).build());

        // 렌트카: 규칙 기반 단가 저장
        if (req.isWithCar()) {
            saveRentalCarByRule(travel, req.getCountryCode(), totalDays);
        }

        // 숙박: 1박 단위로 저장 (마지막날 제외 — 귀국일은 숙박 없음)
        saveAccommodationPerNight(travel, req.getCountryCode(), req.getAccommodationScore(),
                req.getStartDate(), req.getEndDate(), req.getEndLocation());

        // PlanDay 스켈레톤: 빈 Day 레코드를 미리 생성 (route 없이)
        // → GET /travels/{id}/days 에서 모든 날짜가 반환되도록 보장
        java.util.List<PlanDay> emptyDays = new java.util.ArrayList<>();
        LocalDate cur = req.getStartDate();
        int dn = 1;
        while (!cur.isAfter(req.getEndDate())) {
            emptyDays.add(PlanDay.builder().travelPlan(travel).dayNumber(dn++).date(cur).build());
            cur = cur.plusDays(1);
        }
        planDayRepository.saveAll(emptyDays);

        log.info("[규칙] TravelPlan 생성 완료: title={}, travelId={}", title, travel.getId());
        return travel;
    }

    /** 제목 규칙: "[여행지] [테마] [N]일" */
    private String buildTitleByRule(String endLocation, int totalDays, String theme) {
        if (theme != null && !theme.isBlank()) {
            return endLocation + " " + theme + " " + totalDays + "일";
        }
        return endLocation + " " + totalDays + "일 여행";
    }

    /**
     * 렌트카 차종·단가 추천 (인원수 + 숙박 등급 + 국가 기반)
     *
     * [JP] 경차/하이브리드 계열 — 일본 도로/주차 특성상 소형 유리
     *   1~2명 절약형  → 다이하츠 무브 / 스즈키 허슬러 (경차)          50,000원/일
     *   1~2명 일반형  → 토요타 아쿠아 / 혼다 핏 (소형 하이브리드)     70,000원/일
     *   3~4명         → 토요타 프리우스 / 닛산 노트 (준중형 하이브리드) 90,000원/일
     *   5명 이상       → 토요타 시에나 / 혼다 스텝왜건 (미니밴)        130,000원/일
     *   고급형(acc≥8) → 토요타 알파드 / 렉서스 NX                    180,000원/일
     *
     * [KR] 국내 도로 특성 반영
     *   1~2명 절약형  → 모닝 / 스파크 (경차)                         35,000원/일
     *   1~2명 일반형  → 아반떼 / K3 (소형 세단)                      55,000원/일
     *   3~4명         → 쏘나타 / K5 / 투싼 (중형·소형 SUV)           80,000원/일
     *   5명 이상       → 카니발 / 팰리세이드 (대형 SUV·미니밴)       120,000원/일
     *   고급형(acc≥8) → 그랜저 / 제네시스 GV80                      160,000원/일
     */
    private void saveRentalCarByRule(TravelPlan travel, String countryCode, int totalDays) {
        boolean isJp    = "JP".equalsIgnoreCase(countryCode);
        int members     = travel.getMemberCount() != null ? travel.getMemberCount() : 2;
        int accScore    = travel.getAccommodationScore();
        boolean luxury  = accScore >= 8;

        String carType;
        int dailyRate, fuelPerDay, tollPerDay;

        if (isJp) {
            fuelPerDay = 18_000;
            tollPerDay =  5_000;
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
            fuelPerDay = 30_000;
            tollPerDay = 10_000;
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

        carRentalRepository.save(CarRental.builder()
                .travelPlan(travel)
                .carType(carType)
                .dailyRateKrw(dailyRate)
                .rentalDays(totalDays)
                .estimatedFuelKrw(fuelPerDay * totalDays)
                .estimatedTollKrw(tollPerDay * totalDays)
                .build());
        log.info("[규칙] 렌트카 추천: {} {}원/일 × {}일 ({}명, acc={})",
                carType, dailyRate, totalDays, members, accScore);
    }

    /** 숙박 등급 → 단가 규칙 테이블 (Claude 없이 저장) */
    private void saveAccommodationByRule(TravelPlan travel, String countryCode,
                                         int accScore, LocalDate checkIn, LocalDate checkOut,
                                         String location) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        int pricePerNight;
        String type;

        if (isJp) {
            if      (accScore >= 9) { pricePerNight = 270_000; type = "최고급 료칸/5성급 호텔"; }
            else if (accScore >= 7) { pricePerNight = 180_000; type = "고급 호텔/부티크 료칸"; }
            else if (accScore >= 4) { pricePerNight = 110_000; type = "비즈니스 호텔"; }
            else if (accScore >= 2) { pricePerNight =  54_000; type = "저가 비즈니스/게스트하우스"; }
            else                    { pricePerNight =  27_000; type = "캡슐호텔/도미토리"; }
        } else {
            if      (accScore >= 9) { pricePerNight = 350_000; type = "최고급 호텔/리조트"; }
            else if (accScore >= 7) { pricePerNight = 200_000; type = "고급 호텔"; }
            else if (accScore >= 4) { pricePerNight = 120_000; type = "일반 호텔"; }
            else if (accScore >= 2) { pricePerNight =  60_000; type = "모텔/게스트하우스"; }
            else                    { pricePerNight =  30_000; type = "저가 게스트하우스/도미토리"; }
        }

        accommodationRepository.save(Accommodation.builder()
                .travelPlan(travel)
                .hotelName(location + " " + type)
                .checkIn(checkIn)
                .checkOut(checkOut)
                .pricePerNightKrw(pricePerNight)
                .build());
        log.info("[규칙] 숙박 저장: {} ({}원/박)", type, pricePerNight);
    }

    /**
     * 1박 단위 숙박 저장 — 귀국일 전날까지 (마지막날은 숙박 없음).
     * 숙소 위치는 AI가 실제 일정에서 결정하므로 여기선 등급·단가만 저장.
     * 여행 중 이동이 있으면 AI가 날짜별로 다른 숙소를 route에 포함하고,
     * 비용 계산에는 이 레코드들의 pricePerNightKrw 합산값 사용.
     */
    private void saveAccommodationPerNight(TravelPlan travel, String countryCode,
                                           int accScore, LocalDate startDate, LocalDate endDate,
                                           String location) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        int pricePerNight;
        String type;

        if (isJp) {
            if      (accScore >= 9) { pricePerNight = 270_000; type = "최고급 료칸/5성급"; }
            else if (accScore >= 7) { pricePerNight = 180_000; type = "고급 호텔/부티크 료칸"; }
            else if (accScore >= 4) { pricePerNight = 110_000; type = "비즈니스 호텔"; }
            else if (accScore >= 2) { pricePerNight =  54_000; type = "게스트하우스"; }
            else                    { pricePerNight =  27_000; type = "캡슐호텔"; }
        } else {
            if      (accScore >= 9) { pricePerNight = 350_000; type = "최고급 호텔/리조트"; }
            else if (accScore >= 7) { pricePerNight = 200_000; type = "고급 호텔"; }
            else if (accScore >= 4) { pricePerNight = 120_000; type = "일반 호텔"; }
            else if (accScore >= 2) { pricePerNight =  60_000; type = "모텔/게스트하우스"; }
            else                    { pricePerNight =  30_000; type = "저가 게스트하우스"; }
        }

        // startDate 부터 endDate 전날까지 1박씩 저장
        LocalDate night = startDate;
        int nightNum = 1;
        while (night.isBefore(endDate)) {
            accommodationRepository.save(Accommodation.builder()
                    .travelPlan(travel)
                    .hotelName(location + " " + nightNum + "박차 " + type)
                    .checkIn(night)
                    .checkOut(night.plusDays(1))
                    .pricePerNightKrw(pricePerNight)
                    .build());
            night = night.plusDays(1);
            nightNum++;
        }
        log.info("[규칙] 숙박 {}박 저장: {} ({}원/박)", nightNum - 1, type, pricePerNight);
    }

    // ══════════════════════════════════════════════
    //  규칙 기반 자연어 파싱 (Claude 호출 없음)
    // ══════════════════════════════════════════════

    /**
     * 키워드 매칭으로 여행지·국가·렌트카·성향·키워드를 추출.
     * endLocation == null 이면 호출자가 Claude fallback을 사용해야 함.
     */
    private AiGenerateRequest parseNaturalByRules(AiNaturalRequest req) {
        String input = req.getNaturalInput().toLowerCase();

        // ── 도시·국가 탐색 ─────────────────────────────
        String endLocation = null;
        String countryCode = "JP"; // 기본값

        outer:
        for (Map.Entry<String, String[]> entry : buildCityDictionary().entrySet()) {
            for (String city : entry.getValue()) {
                if (input.contains(city)) {
                    endLocation = city;
                    countryCode = entry.getKey();
                    break outer;
                }
            }
        }

        // ── 렌트카 ────────────────────────────────────
        boolean withCar = containsAny(input, "렌트카", "렌터카", "자차", "드라이브", "자동차로");

        // ── 여행 성향 ──────────────────────────────────
        Tendency tendency = Tendency.BALANCED;
        if (containsAny(input, "여유", "힐링", "천천히", "느긋", "쉬엄", "편하게")) {
            tendency = Tendency.RELAX;
        } else if (containsAny(input, "빡빡", "알차게", "최대한", "많이 보", "빼곡", "바쁘게")) {
            tendency = Tendency.ACTIVE;
        }

        // ── 키워드 ─────────────────────────────────────
        List<String> keywords = new ArrayList<>();
        String[] kwCandidates = {
            "온천", "라멘", "스시", "초밥", "스키", "스노보드", "해수욕", "쇼핑",
            "맛집", "카페", "박물관", "공원", "하이킹", "트레킹", "사케", "야키니쿠",
            "타코야키", "교자", "라면", "문화재", "야경", "드라이브", "자연",
            "성", "신사", "절", "디즈니", "유니버설", "료칸", "온천욕"
        };
        for (String kw : kwCandidates) {
            if (input.contains(kw)) keywords.add(kw);
        }

        // ── 인원 수 파싱 ───────────────────────────────
        int memberCount = req.getMemberCount();
        Matcher m = Pattern.compile("(\\d+)\\s*[명인]").matcher(input);
        if (m.find()) {
            try { memberCount = Integer.parseInt(m.group(1)); } catch (NumberFormatException ignored) {}
        }

        AiGenerateRequest out = new AiGenerateRequest();
        out.setStartLocation(req.getStartLocation() != null ? req.getStartLocation() : "인천국제공항");
        out.setEndLocation(endLocation);   // null 이면 fallback 필요
        out.setStartDate(req.getStartDate());
        out.setEndDate(req.getEndDate());
        out.setCountryCode(countryCode);
        out.setMemberCount(memberCount);
        out.setWithCar(withCar);
        out.setTendency(tendency);
        out.setKeywords(keywords);
        out.setFoodScore(req.getFoodScore());
        out.setAccommodationScore(req.getAccommodationScore());
        out.setExtremeScore(req.getExtremeScore());
        out.setTransportScore(req.getTransportScore());
        return out;
    }

    /**
     * 규칙 파싱으로 여행지를 찾지 못했을 때만 사용하는 Claude fallback.
     * 최소 정보(여행지 + 국가코드)만 추출하여 비용 최소화.
     */
    private AiGenerateRequest parseNaturalByAi(AiNaturalRequest req) {
        String systemPrompt =
                "JSON만 응답. {\"endLocation\":\"여행지(한국어 도시명)\",\"countryCode\":\"JP|KR\"," +
                "\"withCar\":bool,\"tendency\":\"RELAX|BALANCED|ACTIVE\",\"keywords\":[\"키워드\"]}";

        String userPrompt = String.format("기간:%s~%s 인원:%d명\n설명:%s",
                req.getStartDate(), req.getEndDate(), req.getMemberCount(), req.getNaturalInput());

        String raw = claudeApiClient.chat(systemPrompt, userPrompt);
        log.debug("[AI natural fallback 결과] {}", raw);
        JsonNode parsed = parseJson(raw);

        AiGenerateRequest out = new AiGenerateRequest();
        out.setStartLocation(req.getStartLocation() != null ? req.getStartLocation() : "인천국제공항");
        out.setEndLocation(parsed.path("endLocation").asText("도쿄"));
        out.setStartDate(req.getStartDate());
        out.setEndDate(req.getEndDate());
        out.setCountryCode(parsed.path("countryCode").asText("JP"));
        out.setMemberCount(req.getMemberCount());
        out.setWithCar(parsed.path("withCar").asBoolean(false));
        out.setTendency(parseTendency(parsed.path("tendency").asText("BALANCED")));
        List<String> kws = new ArrayList<>();
        parsed.path("keywords").forEach(kw -> kws.add(kw.asText()));
        out.setKeywords(kws);
        out.setFoodScore(req.getFoodScore());
        out.setAccommodationScore(req.getAccommodationScore());
        out.setExtremeScore(req.getExtremeScore());
        out.setTransportScore(req.getTransportScore());
        return out;
    }

    /**
     * 도시명 사전: 더 긴/구체적인 지명을 앞에 배치해 오탐 방지.
     * LinkedHashMap으로 순서 보장 (JP 먼저, 각 국가 내에서 우선순위 순).
     */
    private Map<String, String[]> buildCityDictionary() {
        Map<String, String[]> map = new LinkedHashMap<>();
        map.put("JP", new String[]{
            // 홋카이도
            "하코다테", "삿포로", "오타루", "홋카이도",
            // 도호쿠
            "센다이",
            // 간토
            "닛코", "가마쿠라", "하코네", "요코하마", "도쿄",
            // 고신에쓰·중부
            "가나자와", "시라카와고", "나고야", "아타미", "시즈오카",
            // 간사이
            "나라", "고베", "교토", "오사카", "와카야마",
            // 주고쿠·시코쿠
            "히로시마", "미야지마",
            // 규슈
            "나가사키", "구마모토", "유후인", "벳푸", "가고시마", "후쿠오카",
            // 오키나와
            "미야코지마", "이시가키", "나하", "오키나와"
        });
        map.put("KR", new String[]{
            "속초", "강릉", "춘천", "평창",
            "전주", "여수", "순천",
            "통영", "거제", "남해", "경주", "부산",
            "제주",
            "서울", "인천"
        });
        return map;
    }

    // ══════════════════════════════════════════════
    //  전체 Day 단일 Claude 호출
    // ══════════════════════════════════════════════

    /**
     * 모든 Day를 한 번의 Claude 호출로 생성하고 저장.
     * 기존 N회 호출 → 1회로 압축.
     */
    private void generateAllDays(TravelPlan travel, AiGenerateRequest req, int totalDays) {
        log.info("[AI 전체 Day 생성 시작] travelId={}, {}일치", travel.getId(), totalDays);

        String raw = claudeApiClient.chat(
                buildAllDaysSystemPrompt(req.getCountryCode(),
                        req.getFoodScore(), req.getAccommodationScore(),
                        req.getExtremeScore(), req.getTransportScore()),
                buildAllDaysUserMessage(travel, req, totalDays));

        log.debug("[AI 전체 Day 응답 length={}]", raw.length());

        JsonNode allDays = parseJson(raw);

        // 응답이 배열이 아닌 경우 단일 객체로도 허용
        if (allDays.isObject()) {
            allDays = objectMapper.createArrayNode().add(allDays);
        }

        int saved = 0;
        for (JsonNode dayNode : allDays) {
            int dayNum = dayNode.path("dayNumber").asInt(++saved);
            if (dayNum < 1 || dayNum > totalDays) continue;
            LocalDate date = travel.getStartDate().plusDays(dayNum - 1);

            // 기존 Day 있으면 삭제 (재시도 시)
            planDayRepository.findByTravelPlanAndDayNumber(travel, dayNum)
                    .ifPresent(planDayRepository::delete);

            savePlanDay(travel, dayNode, dayNum, date);
        }

        entityManager.flush();
        entityManager.clear();
        log.info("[AI 전체 Day 생성 완료] travelId={}, 저장 Day={}개", travel.getId(), saved);
    }

    // ──────────────────────────────────────────────
    //  전체 Day 프롬프트 (압축 버전)
    // ──────────────────────────────────────────────

    private String buildAllDaysSystemPrompt(String countryCode,
                                             int foodScore, int accommodationScore,
                                             int extremeScore, int transportScore) {
        AiPromptRule rule = promptRule(countryCode);

        String base = "JSON 배열만 응답. 마크다운 금지.\n" +
                "스키마(배열): [" + DAY_SCHEMA + "]\n" +
                "【실존 장소만 — 절대 규칙, 위반 시 전체 일정 무효】\n" +
                "반드시 Google Maps에서 실제로 검색되는 장소만 사용할 것. 아래 규칙 엄수:\n" +
                "1. 장소명 형식(필수): 한국어 이름 먼저, 뒤에 괄호로 현지어. 예: '유노츠보 카이도 (湯の坪街道)' O, '湯の坪街道(유노츠보 카이도)' X. 한국어 이름이 없으면 한국어 발음 표기 후 괄호 안에 현지어. 영어 고유명사(브랜드명 등)는 그대로 사용.\n" +
                "2. 스스로 지어낸 '~골목', '~거리', '~먹자 거리' 이름 절대 금지. 실제 행정·관광 명칭만 사용.\n" +
                "3. 확신이 없는 장소는 넣지 말고, 대신 그 지역의 확실히 유명한 다른 장소로 대체.\n" +
                "4. 레스토랑·카페는 트립어드바이저·식베로그·구글 4.0 이상 실제 영업 중인 곳만. 폐업 가능성 있는 소규모 무명 가게 금지.\n" +
                "5. 주소(address)는 실제 일본어/한국어 공식 주소 형식으로 기재. 없으면 빈 문자열.\n" +
                "6. 좌표(lat/lng)는 해당 장소의 실제 Google Maps 좌표. 대략적인 지역 중심 좌표 금지.\n" +
                "검증 기준: '이 장소가 구글 지도에서 검색되는가?' — YES면 포함, NO면 제외.\n" +
                rule.costGuide() +
                " 하루 4~6개 route.\n" +
                "【장소 다양성】\n" +
                "관광지·사찰만 나열 금지. 하루 대표 관광지 최대 1~2곳, 나머지는 아래 실존 로컬 장소로:\n" +
                "- 먹거리 거리: 유노츠보 카이도(유후인), 쿠로몬이치바(오사카), 아메요코(도쿄 우에노), 니시키이치바(교토), 나카미세도리(아사쿠사) 등 공식 명칭 사용\n" +
                "- 마트·드럭스토어: 이온(AEON), 돈키호테(ドン・キホーテ), 마츠모토키요시, 코코카라파인, 세이유 — 실제 지점명+주소 포함\n" +
                "- 지역 축제·마츠리: 여행 날짜에 실제 개최 확인된 것만. 불확실하면 넣지 말 것.\n" +
                "- 시장: 니시키이치바, 츠키지 장외시장, 오오이도 어시장 등 공식명 사용\n" +
                "- 로컬 카페·빵집: 구글 지도에 실제 등록된 곳, 지점명 정확히 기재\n" +
                "- 산책로·강변: 실제 명칭 있는 곳만 (예: 철학의 길(哲学の道), 아라시야마 대나무숲(竹林の小径))\n" +
                "하루 일정에 박물관·신사·성만 나열 금지.\n" +
                "교통: WALK=1km이하/도보15분이내, CAR=3km초과 지역간 이동, BUS/TRAIN=도시간·공항이동. WALK 하루 최소1구간.\n" +
                "【공항 이동 — 절대 규칙】\n" +
                "- 공항↔도시 이동은 반드시 TRAIN 또는 BUS. CAR 절대 금지.\n" +
                rule.airportTransferGuide() +
                "【렌트카 운행 패턴 — withCar=true일 때만 적용】\n" +
                "- Day1: 공항 도착 → TRAIN/BUS로 도시 이동 → 도시 내 렌트카 영업소 또는 다음날 아침 픽업.\n" +
                "  (공항에서 바로 렌트카 픽업 후 고속도로 이동은 허용, 단 공항→도시 자체는 공항까지 포함된 고속도로 경로로 처리)\n" +
                "- 렌트카 허브-앤-스포크 패턴:\n" +
                "  1) 호텔(CAR출발) → 관광지구 주차장(ETC, 주차, 10~15분) → 관광지A(WALK) → 관광지B(WALK) → 관광지C(WALK) → 주차장(WALK 귀환)\n" +
                "  2) 다음 관광지구로 이동: 주차장(CAR) → 다음 관광지구 주차장(CAR)\n" +
                "  3) 저녁: 마지막 주차장(CAR) → 호텔(CAR)\n" +
                "- 관광지구 내부(500m 이내) 이동은 반드시 WALK. 같은 구역 내에서 CAR 사용 금지.\n" +
                "- 걸어서 다닌 구역에서 호텔로 돌아올 때도 반드시 주차장(WALK) → 호텔(CAR) 순서.\n" +
                "  즉 WALK로 나간 곳에서 갑자기 CAR로 귀환하는 route 금지 — 주차장 경유 필수.\n" +
                "- 마지막날: 호텔 체크아웃(CAR) → 렌트카 반납 영업소(ETC, 15~20분) → 공항(TRAIN/BUS).\n" +
                "  공항까지 CAR로 직행 금지 — 반납 후 TRAIN/BUS 이용.\n" +
                "동선 최적화 규칙(최우선):\n" +
                "- 하루 방문 장소는 지리적으로 인접한 구역끼리 묶어서 순서 배치. 절대 왔다갔다(A→B→A 방향) 금지.\n" +
                "- 직선 이동 원칙: 하루 동선은 한 방향(북→남, 서→동 등)으로 흐르거나 루프(원형 귀환) 형태.\n" +
                "- 같은 구역 장소는 연속 배치. 멀리 떨어진 장소 사이에 가까운 장소를 끼워 넣지 말 것.\n" +
                "- 숙소 기준: 하루 첫 출발지·마지막 도착지가 숙소 인근이 되도록 루트 설계.\n" +
                "CAR 이동 규칙:\n" +
                "- durationMinutes에 교통 정체 여유 포함(시내 +10분, 고속도로 +15분, 관광지 주차 +20분).\n" +
                "- 하루 CAR 총 이동 3시간 초과 시: 중간에 주유소/휴게소 route 1개 추가(장소명='고속도로 휴게소' 또는 '주유소', type=ETC, durationMinutes=20).\n" +
                "장소 description: RESTAURANT/CAFE=대표메뉴+가격대 2~3문장 필수. 마트·상점가=살 수 있는 대표 품목·가격대. 축제=축제명·볼거리·주의사항. 그외=주요볼거리·특징 1~2문장.\n" +
                "공항이동: Day1첫route=도착공항→여행지. 마지막날마지막route=여행지→출발공항.\n" +
                "렌트카여행: 주차장 기점 → 주변 WALK → 다음지역 CAR. 관광지밀집구역 내 이동은 WALK.\n" +
                "【장소별 현실적 체류시간 — departureTime 계산 필수 기준】\n" +
                "다음 route의 departureTime = 해당 장소 도착시각 + 아래 체류시간. 반드시 지킬 것.\n" +
                "- 공항(AIRPORT): 국내선 대기 45분. 국제선 입국장 60분.\n" +
                "- 호텔/숙소(HOTEL): 체크인 20~30분. 체크아웃 10~15분.\n" +
                "- 역·환승(STATION): 5~10분.\n" +
                "- 아침식사(RESTAURANT): 30~45분.\n" +
                "- 점심식사(RESTAURANT): 50~70분.\n" +
                "- 저녁식사(RESTAURANT 저녁): 70~90분. 이자카야·코스요리 90~120분.\n" +
                "- 카페·빵집·소프트아이스크림(CAFE): 20~50분.\n" +
                "- 박물관·미술관·수족관(MUSEUM): 90~120분.\n" +
                "- 신사·절 소형: 30~45분. 대형(후시미이나리·센소지 등) 60~90분.\n" +
                "- 성: 60~90분.\n" +
                "- 공원·강변산책(PARK): 30~60분.\n" +
                "- 전망대·관망포인트(ETC): 20~35분. 절대 60분 초과 금지.\n" +
                "- 쇼핑몰·아케이드(SHOPPING): 60~90분.\n" +
                "- 먹거리 거리·시장·야타이(SHOPPING/ETC): 60~90분.\n" +
                "- 마트·드럭스토어·돈키호테(SHOPPING): 45~60분.\n" +
                "- 축제·마츠리(ETC): 90~150분.\n" +
                "- 편의점 명소(ETC): 15~20분.\n" +
                "- 도로변 명소·드라이브인(ETC): 15~25분.\n" +
                "- 온천(ETC): 60~90분.\n" +
                "- 해수욕장(PARK): 90~150분.\n" +
                "- 야시장(ETC): 60~90분.\n" +
                "시간대 규칙(departureTime 반드시 준수):\n" +
                "- 아침시장/아침카페: 07:00~09:30.\n" +
                "- 오전: 박물관·신사·먹거리거리·마트 10:00~13:00.\n" +
                "- 점심식사: 11:30~13:30.\n" +
                "- 오후: 쇼핑·산책·로컬카페·드럭스토어 14:00~17:00.\n" +
                "- 저녁식사: 18:00~20:30.\n" +
                "- 온천: 반드시 19:00 이후. 낮 온천 절대 금지.\n" +
                "- 야경·야시장·루프탑바·축제 야간: 19:00 이후.\n" +
                "- 숙소 체크인: 21:00 이전.\n" +
                "【중복 방지】\n" +
                "- 야경·전망대: 전체 여행 최대 1회. 이미 앞 Day에 있으면 이 Day 절대 금지.\n" +
                "- 온천: 하루 1회. 여러 날 반복 최소화.\n" +
                "- 같은 이름 신사·관광지 중복 금지.\n" +
                "- 전망대·산 정상: 전체 1회.\n" +
                "【숙박 규칙 — 절대 준수】\n" +
                "1. 마지막 날(귀국일) 제외한 모든 Day의 마지막 route는 반드시 type=HOTEL인 숙소로 끝낼 것.\n" +
                "   - toLocation.type = 'HOTEL', toLocation.name = 실존 호텔명 (예: '도미인 후쿠오카 하카타')\n" +
                "   - 숙소는 그날 마지막 관광지 인근의 실존 호텔로 배치. Google Maps에서 실제 검색되는 호텔만.\n" +
                "   - transport = WALK 또는 CAR (택시/버스 이동 포함). durationMinutes = 이동시간.\n" +
                "   - 체크인 시각(departureTime)은 20:00~21:00 범위 내.\n" +
                "2. 다음 날 첫 route의 fromLocation은 전날 숙박한 호텔과 동일한 장소로 시작.\n" +
                "   - 즉 Day N의 마지막 toLocation(호텔) = Day N+1의 첫 fromLocation(동일 호텔).\n" +
                "3. 여행 중 이동 지역이 바뀌면(예: 후쿠오카→벳푸→유후인) 날마다 다른 호텔 배치 허용.\n" +
                "   - 여행 동선상 마지막 지점 인근 호텔을 그날 숙소로.\n" +
                "4. 마지막 날은 호텔 체크아웃 route로 시작(fromLocation=전날 호텔, toLocation=첫 방문지, transport=WALK/CAR).\n" +
                "5. 마지막 날 마지막 route = 여행지→공항 이동 (AIRPORT type).";

        String prefRules = buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);
        return base + prefRules;
    }

    private String buildAllDaysUserMessage(TravelPlan travel, AiGenerateRequest req, int totalDays) {
        String transport = travel.isWithCar()
                ? "렌트카(공항↔도시=TRAIN/BUS필수, 지역간=CAR, 관광지구내=WALK, 마지막날반납후=TRAIN/BUS)"
                : "대중교통(공항↔도시=TRAIN/BUS, 도심=SUBWAY/BUS, 근거리=WALK)";

        StringBuilder sb = new StringBuilder();
        sb.append(String.format(
                "여행지:%s(%s) %d일차~%d일차(%s~%s) 인원:%d명 이동:%s 테마:%s 키워드:%s\n",
                travel.getEndLocation(), travel.getCountryCode(),
                1, totalDays, travel.getStartDate(), travel.getEndDate(),
                travel.getMemberCount() != null ? travel.getMemberCount() : 2,
                transport,
                travel.getTheme() != null ? travel.getTheme() : "일반관광",
                travel.getKeywords() != null && !travel.getKeywords().isEmpty()
                        ? travel.getKeywords() : "없음"));

        // 항공편 힌트
        if (req.getArrivalAtDestTime() != null) {
            sb.append(String.format("Day1: 현지공항 도착 %s → TRAIN/BUS로 %s 이동 포함(CAR 금지).\n",
                    req.getArrivalAtDestTime(), travel.getEndLocation()));
        } else {
            sb.append(String.format("Day1: 첫route=도착공항→%s TRAIN/BUS 이동 포함(CAR 금지).\n", travel.getEndLocation()));
        }
        if (req.getReturnFlightTime() != null) {
            sb.append(String.format("마지막날: %s 이전 공항 도착. 마지막route=%s→공항.\n",
                    req.getReturnFlightTime(), travel.getEndLocation()));
        }

        // 숙박 등급 힌트
        sb.append(String.format("숙박등급: 점수%d/10 → %s.\n",
                travel.getAccommodationScore(),
                getAccommodationTypeLabel(travel.getCountryCode(), travel.getAccommodationScore())));

        sb.append(String.format("전체 %d일 일정을 JSON 배열로 출력.\n", totalDays));
        sb.append("⚠️ 야경·전망대 스팟은 전체 일정 통틀어 딱 1회만 넣을 것. 온천은 저녁(19:00 이후)에만 배치.");
        return sb.toString();
    }

    // ──────────────────────────────────────────────
    //  단건 Day 프롬프트 (재생성용, 기존 유지)
    // ──────────────────────────────────────────────

    private String buildDaySystemPrompt(String countryCode,
                                        int foodScore, int accommodationScore,
                                        int extremeScore, int transportScore) {
        AiPromptRule rule = promptRule(countryCode);

        String base = "JSON만 응답. 마크다운 금지.\n스키마: " + DAY_SCHEMA + "\n" +
                "【★ 최최우선 규칙: 사용자 요청(userWish) ★】\n" +
                "유저 메시지 맨 위에 🚨 표시가 있으면 그것이 이 일정의 핵심 요구사항이다.\n" +
                "해당 요청(맛집, 쇼핑, 특정 장소, 테마 등)을 route에 반드시 포함해야 한다.\n" +
                "포함하지 않으면 틀린 답변이다. 다른 모든 규칙보다 우선이다.\n" +
                "──────────────────────────────────────────────\n" +
                "【실존 장소만 — 절대 규칙】\n" +
                "Google Maps에서 실제 검색되는 장소만 사용. 엄수 사항:\n" +
                "1. 장소명 형식(필수): 한국어/발음 먼저, 괄호 안에 현지어. 예: '유노츠보 카이도 (湯の坪街道)' O, '湯の坪街道(유노츠보 카이도)' X. 영어 브랜드명은 그대로.\n" +
                "2. 스스로 만든 '~골목', '~거리', '~먹자 거리' 이름 절대 금지.\n" +
                "3. 확신 없는 장소는 제외. 그 지역의 확실히 유명한 장소로 대체.\n" +
                "4. 레스토랑·카페는 구글·식베로그 4.0+ 실제 영업 중인 곳만.\n" +
                "5. 좌표는 Google Maps 실제 좌표. 지역 중심 좌표 금지.\n" +
                rule.costGuide() +
                " 4~6 route.\n" +
                "【장소 다양성】관광지 최대 1~2곳, 나머지는 로컬 실존 장소:\n" +
                "- 공식 명칭 있는 먹거리 거리: 유노츠보 카이도, 쿠로몬이치바, 아메요코, 니시키이치바, 나카미세도리\n" +
                "- 실존 마트·드럭스토어: 이온, 돈키호테(지점명+주소), 마츠모토키요시\n" +
                "- 실제 개최 확인된 축제만(불확실하면 제외)\n" +
                "- 구글 지도 등록 카페·빵집(지점명 정확히)\n" +
                "- 공식 명칭 있는 산책로(철학의 길, 아라시야마 대나무숲 등)\n" +
                "박물관·신사·성만 나열 금지.\n" +
                "교통: WALK=1km이하/15분이내, CAR=3km초과 지역간 이동, BUS/TRAIN=도시간·공항이동. WALK 최소1구간.\n" +
                "【공항 이동 — 절대 규칙】\n" +
                "- 공항↔도시 이동은 반드시 TRAIN 또는 BUS. CAR 절대 금지.\n" +
                rule.airportTransferGuide() +
                "【렌트카 운행 패턴 — withCar=true일 때만】\n" +
                "- 허브-앤-스포크: 호텔(CAR) → 관광지구 주차장(ETC) → 관광지들(WALK) → 주차장(WALK) → 다음 지구(CAR) → 호텔(CAR).\n" +
                "- 관광지구 내부 500m 이내 이동은 WALK만. 같은 구역에서 CAR 금지.\n" +
                "- WALK로 나간 구역에서 호텔 귀환 시: 반드시 주차장(WALK 귀환) → 호텔(CAR) 순서.\n" +
                "- 마지막날 렌트카: 호텔(CAR) → 렌트카 반납 영업소(ETC, 15~20분) → 공항(TRAIN/BUS).\n" +
                "동선 최적화(최우선): 인접 구역 묶어서 배치. 왔다갔다 절대 금지. 숙소 인근 출발·귀환.\n" +
                "CAR: 정체 여유 포함(시내+10분, 고속도로+15분). 3시간 초과 시 휴게소 route 추가(ETC, 20분).\n" +
                "description: RESTAURANT/CAFE=대표메뉴+가격대. 마트·상점가=살 수 있는 품목·가격대. 축제=볼거리·주의사항.\n" +
                "Day1첫route=공항→여행지(TRAIN/BUS). 마지막날마지막route=여행지→공항(TRAIN/BUS).\n" +
                "【체류시간】\n" +
                "- 공항: 입국 60분. 호텔 체크인 20~30분. 역 5~10분.\n" +
                "- 아침식사 30~45분. 점심 50~70분. 저녁 70~90분. 이자카야/코스 90~120분.\n" +
                "- 카페·빵집 20~50분. 박물관·수족관 90~120분. 신사 소형 30~45분/대형 60~90분.\n" +
                "- 전망대·관망포인트 20~35분(절대 60분 초과 금지). 공원·산책 30~60분.\n" +
                "- 먹거리거리·시장 60~90분. 마트·드럭스토어 45~60분. 쇼핑몰 60~90분.\n" +
                "- 축제·마츠리 90~150분. 도로변 명소 15~25분. 온천 60~90분. 해수욕 90~150분.\n" +
                "【시간대】\n" +
                "- 아침시장·카페: 07:00~09:30. 점심: 11:30~13:30. 저녁: 18:00~20:30.\n" +
                "- 오전: 박물관·신사·먹거리거리·마트(10:00~). 오후: 쇼핑·산책·드럭스토어(14:00~).\n" +
                "- 온천: 반드시 19:00 이후. 낮 온천 절대 금지.\n" +
                "- 야경·야시장·루프탑·축제 야간: 19:00 이후. 전체 여행에서 야경 최대 1회.\n" +
                "【중복 방지】 야경·전망대 전체 1회. 온천 하루 1곳. 같은 이름 관광지 중복 금지.\n" +
                "【숙박 규칙 — 절대 준수】\n" +
                "1. 마지막 날 제외한 모든 Day: 마지막 route의 toLocation.type='HOTEL', 실존 호텔명 사용.\n" +
                "   체크인 departureTime = 20:00~21:00. transport=WALK 또는 CAR.\n" +
                "2. 마지막 날이 아닌 경우: 이 Day의 마지막 toLocation이 그날 밤 숙소 호텔.\n" +
                "   숙소는 당일 마지막 관광지 인근의 Google Maps 실존 호텔.\n" +
                "3. 다음날 첫 fromLocation = 이 Day 마지막 toLocation(호텔)과 동일 장소.\n" +
                "4. 이전날 마지막위치가 호텔이면 → 이 Day 첫 fromLocation = 그 호텔. 체크아웃 route로 시작.";

        return base + buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);
    }

    private String buildDayUserMessage(TravelPlan travel, int dayNum, int totalDays,
                                       LocalDate date, String prevLocationJson,
                                       String accommodationHint, String flightHint,
                                       boolean nightviewUsed, String userWish) {
        String transport = travel.isWithCar()
                ? "렌트카(공항↔도시=TRAIN/BUS필수, 지역간=CAR, 관광지내=WALK)"
                : "대중교통(공항↔도시=TRAIN/BUS, 도심=SUBWAY/BUS, 근거리=WALK)";
        String nightviewNote = nightviewUsed
                ? "⚠️ 이미 이전 Day에 야경·전망대 포함됨 → 이 Day에는 야경·전망대 절대 배치 금지."
                : "야경·전망대는 전체 여행에서 딱 1회 — 이번이 처음이면 넣어도 되나 반드시 19:00 이후.";

        // 이전날 마지막 위치를 첫 출발지로 강제
        String startConstraint = "";
        if (!prevLocationJson.isEmpty()) {
            boolean isNightTransit = prevLocationJson.contains("[야간이동도착지]");
            String cleanJson = prevLocationJson.replace(" [야간이동도착지]", "");
            if (isNightTransit) {
                startConstraint = String.format(
                        "\n🚉 야간이동 도착: 이 Day 첫 route의 fromLocation은 반드시 아래 JSON 그대로 사용.\n%s",
                        cleanJson);
            } else {
                startConstraint = String.format(
                        "\n🏨 전날 숙박지에서 출발: 이 Day 첫 route의 fromLocation은 반드시 아래 JSON 그대로 사용.\n%s",
                        cleanJson);
            }
        }

        boolean hasWish = userWish != null && !userWish.isBlank();

        if (hasWish) {
            // ── userWish 있을 때: 요청이 핵심, 나머지는 참고 ──────────────────
            return "═══════════════════════════════════════════════════\n" +
                   "이 일정의 핵심 목표 (반드시 route에 반영):\n" +
                   "  ▶ " + userWish.trim() + "\n" +
                   "위 요청에 포함된 장소·테마·활동을 route에 구체적으로 넣을 것.\n" +
                   "특정 장소명이 있으면 그 장소가 route에 반드시 등장해야 함.\n" +
                   "특정 지역이 있으면 그 지역 중심으로 일정을 구성할 것.\n" +
                   "이 요청을 지키지 않으면 잘못된 일정이다.\n" +
                   "═══════════════════════════════════════════════════\n" +
                   String.format(
                   "참고 정보 | %d일차/%d일 | %s | 인원:%d명 | 이동:%s\n" +
                   "기본 여행지(참고용):%s | 숙소:%s\n%s%s\n%d일차 JSON.",
                   dayNum, totalDays, date,
                   travel.getMemberCount() != null ? travel.getMemberCount() : 2,
                   transport,
                   travel.getEndLocation(),
                   accommodationHint.isEmpty() ? "미정" : accommodationHint,
                   nightviewNote,
                   startConstraint,
                   dayNum);
        } else {
            // ── userWish 없을 때: 기존 방식 ──────────────────────────────────
            return String.format(
                   "여행지:%s | %d일차/%d일 | %s | 인원:%d명 | %s | 테마:%s | 키워드:%s\n" +
                   "숙소:%s | %s\n%s%s\n%d일차 JSON.",
                   travel.getEndLocation(), dayNum, totalDays, date,
                   travel.getMemberCount() != null ? travel.getMemberCount() : 2,
                   transport,
                   travel.getTheme() != null ? travel.getTheme() : "일반관광",
                   travel.getKeywords() != null && !travel.getKeywords().isEmpty()
                           ? travel.getKeywords() : "없음",
                   accommodationHint.isEmpty() ? "미정" : accommodationHint,
                   flightHint,
                   nightviewNote,
                   startConstraint,
                   dayNum);
        }
    }

    /** 이미 생성된 이전 Day들에 야경·전망대 장소가 있는지 확인 */
    private boolean isNightviewAlreadyUsed(TravelPlan travel, int currentDayNum) {
        List<String> nightviewKeywords = List.of("야경", "전망대", "루프탑", "야간", "night view", "야타이", "야시장");
        return planDayRepository.findByTravelPlanOrderByDayNumberAsc(travel).stream()
                .filter(d -> d.getDayNumber() < currentDayNum)
                .flatMap(d -> d.getRoutes().stream())
                .anyMatch(r -> {
                    String fromName = r.getFromLocation() != null ? r.getFromLocation().getName().toLowerCase() : "";
                    String toName   = r.getToLocation()   != null ? r.getToLocation().getName().toLowerCase()   : "";
                    String note     = r.getNote() != null ? r.getNote().toLowerCase() : "";
                    return nightviewKeywords.stream().anyMatch(k ->
                            fromName.contains(k) || toName.contains(k) || note.contains(k));
                });
    }

    private String buildFlightHint(TravelPlan travel, int dayNum, int totalDays) {
        if (dayNum == 1) {
            String base = "Day1 첫route=도착공항→" + travel.getEndLocation() + " 이동 포함.";
            if (travel.getArrivalAtDestTime() != null) {
                return "현지공항 도착 " + travel.getArrivalAtDestTime() + ". " + base;
            }
            return base;
        }
        if (dayNum == totalDays && travel.getReturnFlightTime() != null) {
            return travel.getReturnFlightTime() + " 이전 공항 도착. 마지막route=" + travel.getEndLocation() + "→출발공항.";
        }
        return "";
    }

    // ──────────────────────────────────────────────
    //  선호도 강제 규칙 (시스템 프롬프트 레벨)
    // ──────────────────────────────────────────────

    private String buildPrefSystemRules(String countryCode, int food, int accommodation,
                                        int extreme, int transport) {
        AiPromptRule rule = promptRule(countryCode);
        StringBuilder sb = new StringBuilder("\n\n【선호도 강제 규칙 - 위반 금지】");

        // 음식
        if (food >= 9) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 3곳이상. ")
              .append(rule.diningHighEnd());
        } else if (food >= 7) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 2곳이상. 현지맛집 중심.");
        } else if (food >= 4) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 1~2곳. 무난한 현지식당.");
        } else if (food >= 2) {
            sb.append("\n▶음식(").append(food).append("/10): 식사 최소화. RESTAURANT 하루 최대1곳. ")
              .append(rule.diningBudget());
        } else {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE route 생성 금지. 편의점 이용 가정.");
        }

        // 숙박 (동선 내 호텔 이동 route에 적용)
        if (accommodation >= 8) {
            sb.append("\n▶숙박(").append(accommodation).append("/10): ")
              .append(rule.stayLuxury());
        } else if (accommodation <= 2) {
            sb.append("\n▶숙박(").append(accommodation).append("/10): ")
              .append(rule.stayBudget());
        }

        // 액티비티
        if (extreme >= 8) {
            sb.append("\n▶액티비티(").append(extreme).append("/10): 하이킹·래프팅·스키 등 체험 route 1개이상 필수.");
        } else if (extreme <= 2) {
            sb.append("\n▶액티비티(").append(extreme).append("/10): 스포츠·어드벤처 route 금지. 관광·카페·쇼핑 위주.");
        }

        // 이동
        if (transport >= 8) {
            sb.append("\n▶이동(").append(transport).append("/10): ")
              .append(rule.scenicTransport());
        } else if (transport <= 2) {
            sb.append("\n▶이동(").append(transport).append("/10): 하루 총이동 90분이하. 한구역(2km이내) 집중.")
              .append(" 먼거리 이동 route 금지.");
        }

        return sb.toString();
    }

    // ──────────────────────────────────────────────
    //  빈 시간 채우기 프롬프트
    // ──────────────────────────────────────────────

    private String buildFillSystemPrompt() {
        return "JSON만 응답.\n스키마:{\"places\":[{\"name\":\"장소명\",\"address\":\"주소\"," +
               "\"lat\":위도,\"lng\":경도,\"type\":\"RESTAURANT|CAFE|PARK|MUSEUM|SHOPPING|ETC\"," +
               "\"description\":\"2줄이내\",\"stayMinutes\":숫자}]}\n3~5개, 실제 좌표.";
    }

    private String buildFillUserMessage(AiFillRequest req) {
        return String.format("현재위치:%s | 빈시간:%s~%s\nJSON으로 장소 추천.",
                req.getCurrentLocation(), req.getFreeTimeStart(), req.getFreeTimeEnd());
    }

    // ──────────────────────────────────────────────
    //  Day 저장
    // ──────────────────────────────────────────────

    private PlanDay savePlanDay(TravelPlan travel, JsonNode dayNode, int dayNumber, LocalDate date) {
        PlanDay planDay = PlanDay.builder()
                .travelPlan(travel).dayNumber(dayNumber).date(date).build();
        planDayRepository.save(planDay);

        List<JsonNode> routeNodes = new ArrayList<>();
        for (JsonNode rn : dayNode.path("routes")) routeNodes.add(rn);

        int seq = 1;
        for (JsonNode routeNode : routeNodes) {
            LocationWithCost fromLc = resolveLocation(routeNode.path("fromLocation"), date);
            LocationWithCost toLc   = resolveLocation(routeNode.path("toLocation"),   date);
            String note = routeNode.path("note").isMissingNode() ? null : routeNode.path("note").asText(null);

            // 교통수단 파싱
            TransportType transport = parseTransport(routeNode.path("transport").asText("WALK"));

            // 교통비 계산
            // - WALK : 무조건 0원 (도보는 무료)
            // - SUBWAY/BUS/TRAIN : TransitFareRegistry 계산값 우선 (AI 추정값 무시)
            // - CAR/ETC : AI 추정값 사용
            int transportCost;
            if (transport == TransportType.WALK) {
                transportCost = 0;
            } else if (transport == TransportType.SUBWAY
                    || transport == TransportType.BUS
                    || transport == TransportType.TRAIN) {
                double lat1 = fromLc.location().getLat(), lng1 = fromLc.location().getLng();
                double lat2 = toLc.location().getLat(),   lng2 = toLc.location().getLng();
                double distKm = haversineKm(lat1, lng1, lat2, lng2);
                transportCost = transitFareRegistry
                        .calculate(travel.getCountryCode(), transport, distKm)
                        .orElse(routeNode.path("estimatedCost").asInt(0));
            } else {
                transportCost = routeNode.path("estimatedCost").asInt(0);
            }

            // 장소비용: Google priceLevel 기반 (placeCost) — 0이면 Google 데이터 없음
            int placeCost = toLc.placeCost();

            planRouteRepository.save(PlanRoute.builder()
                    .planDay(planDay)
                    .sequence(seq++)
                    .fromLocation(fromLc.location()).toLocation(toLc.location())
                    .transport(transport)
                    .departureTime(parseDepartureTime(date, routeNode.path("departureTime").asText("09:00")))
                    .durationMinutes(routeNode.path("durationMinutes").asInt(30))
                    .estimatedCost(transportCost)
                    .placeCost(placeCost)
                    .note(note)
                    .build());
        }
        log.info("[저장] day{}({}) {}개 route", dayNumber, date, seq - 1);

        // 마지막 route의 toLocation이 HOTEL이면 → 해당 날짜 숙박 기록 hotelName 갱신
        if (!routeNodes.isEmpty()) {
            JsonNode lastRoute = routeNodes.get(routeNodes.size() - 1);
            JsonNode toLoc = lastRoute.path("toLocation");
            if ("HOTEL".equalsIgnoreCase(toLoc.path("type").asText(""))) {
                String hotelName = toLoc.path("name").asText(null);
                if (hotelName != null && !hotelName.isBlank()) {
                    accommodationRepository.findByTravelPlanAndCheckInDate(travel, date)
                            .ifPresent(acc -> {
                                acc.update(hotelName, null, null, null);
                                log.info("[숙박 업데이트] day{} → hotelName='{}'", dayNumber, hotelName);
                            });
                }
            }
        }

        return planDay;
    }

    // ──────────────────────────────────────────────
    //  헬퍼
    // ──────────────────────────────────────────────

    /**
     * N일차 첫 번째 route의 fromLocation을 N-1일차 마지막 route의 toLocation으로 강제 교정.
     * AI가 프롬프트를 무시하더라도 DB 레벨에서 반드시 연결을 보장한다.
     */
    private void fixFirstRouteFromLocation(TravelPlan travel, int dayNumber) {
        try {
            planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber - 1)
                .ifPresent(prevDay -> {
                    List<PlanRoute> prevRoutes = prevDay.getRoutes();
                    if (prevRoutes.isEmpty()) return;
                    Location prevLastTo = prevRoutes.get(prevRoutes.size() - 1).getToLocation();
                    if (prevLastTo == null) return;

                    planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                        .ifPresent(currDay -> {
                            List<PlanRoute> currRoutes = currDay.getRoutes();
                            if (currRoutes.isEmpty()) return;
                            PlanRoute firstRoute = currRoutes.get(0);
                            firstRoute.updateFromLocation(prevLastTo);
                            planRouteRepository.save(firstRoute);
                            log.info("[fixFirstRoute] day{} 첫 from → '{}' (day{} 마지막 to)",
                                    dayNumber, prevLastTo.getName(), dayNumber - 1);
                        });
                });
        } catch (Exception e) {
            log.warn("[fixFirstRoute] 교정 실패 day={}: {}", dayNumber, e.getMessage());
        }
    }

    /**
     * 이전 Day 마지막 route의 toLocation을 JSON으로 반환.
     * AI가 다음 Day 첫 fromLocation을 동일 좌표로 사용하도록 강제.
     * 야간버스/야간기차인 경우도 동일하게 마지막 toLocation(도착지)에서 시작.
     */
    private String resolvePrevLastLocation(TravelPlan travel, int dayNumber) {
        if (dayNumber <= 1) return "";
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber - 1)
                .map(d -> {
                    List<PlanRoute> routes = d.getRoutes();
                    if (routes.isEmpty()) return "";
                    org.jkh.com.dagalle.domain.location.entity.Location loc =
                            routes.get(routes.size() - 1).getToLocation();
                    if (loc == null) return "";
                    // 야간 이동 여부 감지 (버스/기차로 2시간 이상 이동 → 도착역/터미널에서 시작)
                    PlanRoute lastRoute = routes.get(routes.size() - 1);
                    String transportNote = "";
                    if (lastRoute.getTransport() != null) {
                        String t = lastRoute.getTransport().name();
                        if (("BUS".equals(t) || "TRAIN".equals(t))
                                && lastRoute.getDurationMinutes() != null
                                && lastRoute.getDurationMinutes() >= 90) {
                            transportNote = " [야간이동도착지]";
                        }
                    }
                    // 다음날 첫 fromLocation으로 그대로 쓸 수 있도록 JSON 형태로 반환
                    return String.format(
                            "{\"name\":\"%s\",\"lat\":%s,\"lng\":%s,\"address\":\"%s\",\"type\":\"%s\"}%s",
                            loc.getName(),
                            loc.getLat() != null ? loc.getLat() : 0.0,
                            loc.getLng() != null ? loc.getLng() : 0.0,
                            loc.getAddress() != null ? loc.getAddress().replace("\"", "'") : "",
                            loc.getType() != null ? loc.getType().name() : "ETC",
                            transportNote);
                }).orElse("");
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

    private JsonNode parseJson(String raw) {
        String cleaned = raw.strip();

        // 1) 마크다운 코드블록 제거
        if (cleaned.startsWith("```")) {
            int first = cleaned.indexOf('\n');
            int last  = cleaned.lastIndexOf("```");
            if (first > 0 && last > first)
                cleaned = cleaned.substring(first + 1, last).strip();
        }

        // 2) 직접 파싱 시도
        try { return objectMapper.readTree(cleaned); }
        catch (JacksonException e1) {
            // 3) 앞뒤 텍스트 무시하고 첫 { ... } 블록만 추출
            int start = cleaned.indexOf('{');
            int end   = cleaned.lastIndexOf('}');
            if (start >= 0 && end > start) {
                try {
                    return objectMapper.readTree(cleaned.substring(start, end + 1));
                } catch (JacksonException e2) { /* fall through */ }
            }
            log.error("[JSON 파싱 실패] raw={}", raw, e1);
            throw new IllegalStateException("Claude 응답 파싱 실패: " + e1.getMessage(), e1);
        }
    }

    /** Google Places 결과와 함께 장소 비용도 반환하는 래퍼 */
    private record LocationWithCost(Location location, int placeCost) {}

    private LocationWithCost resolveLocation(JsonNode node, LocalDate date) {
        String name        = node.path("name").asText("알 수 없는 장소");
        String address     = node.path("address").asText("");
        double aiLat       = node.path("lat").asDouble(35.6762);
        double aiLng       = node.path("lng").asDouble(139.6503);
        LocationType type  = parseLocationType(node.path("type").asText("ETC"));
        String description = node.path("description").asText(null);

        double lat = aiLat, lng = aiLng;
        String realAddress = address;
        LocationSource source = LocationSource.AI;
        String externalId = "ai-" + name.replaceAll("\\s+", "-") + "-" + date;
        int placeCost = 0;   // Google priceLevel 기반으로 결정

        try {
            String query = address.isBlank() ? name : name + " " + address;
            List<GooglePlacesClient.GooglePlaceResult> results =
                    googlePlacesClient.searchText(query, aiLat, aiLng, 1);
            if (!results.isEmpty()) {
                GooglePlacesClient.GooglePlaceResult hit = results.get(0);
                lat = hit.lat(); lng = hit.lng(); realAddress = hit.address();
                source = LocationSource.GOOGLE;
                externalId = (hit.placeId() != null && !hit.placeId().isBlank())
                        ? hit.placeId()
                        : "google-" + name.replaceAll("\\s+", "-") + "-" + date;

                // ── Google priceLevel → 장소 예상 비용 ─────────────
                placeCost = priceLevelToKrw(type, hit.priceLevel());
                log.info("[Places] '{}' → ({}, {}) priceLevel={} → {}원",
                        name, lat, lng, hit.priceLevel(), placeCost);

                // 기존 Location 재사용 (중복 방지)
                if (hit.placeId() != null && !hit.placeId().isBlank()) {
                    Optional<Location> existing = locationRepository.findByExternalIdAndSource(hit.placeId(), LocationSource.GOOGLE);
                    if (existing.isPresent()) {
                        log.info("[Places] '{}' 기존 Location 재사용 id={}", name, existing.get().getId());
                        return new LocationWithCost(existing.get(), placeCost);
                    }
                }
            } else {
                log.warn("[Places] '{}' 구글 검색 결과 없음 — 존재하지 않는 장소일 수 있음", name);
                name = "⚠️ " + name;
                description = (description != null ? description + "\n" : "") +
                        "[주의] 이 장소는 구글 지도에서 확인되지 않았습니다. 방문 전 직접 검색해 주세요.";
            }
        } catch (Exception e) {
            log.warn("[Places 실패] '{}' - AI 좌표 사용. {}", name, e.getMessage());
            // Google 호출 실패 시 타입별 평균 비용 적용
            placeCost = defaultCostByType(type);
        }

        // Google 결과가 있었지만 priceLevel만 없을 때도 평균값으로 보정
        if (placeCost == 0) {
            placeCost = defaultCostByType(type);
        }

        final String finalName = name;
        final String finalDesc = description;
        Location saved = locationRepository.save(Location.builder()
                .name(finalName).address(realAddress).lat(lat).lng(lng).type(type)
                .source(source).externalId(externalId).description(finalDesc)
                .build());
        return new LocationWithCost(saved, placeCost);
    }

    /**
     * Google Places priceLevel → 1인 예상 KRW 비용.
     * 교통비(estimatedCost)와는 별개로 해당 장소에서 소비하는 금액.
     */
    /**
     * 타입별 평균 소비 비용 (Google priceLevel 없을 때 fallback).
     * RESTAURANT·CAFE·SHOPPING 등 소비성 장소에는 평균값을 적용한다.
     */
    private int defaultCostByType(LocationType type) {
        return switch (type) {
            case RESTAURANT -> 15_000;   // 한끼 평균 (편의점~고급 중간값)
            case CAFE       ->  6_500;   // 음료+디저트 평균
            case SHOPPING   -> 30_000;   // 기념품·쇼핑 평균
            case MUSEUM     -> 12_000;   // 입장료 평균
            default         ->  0;       // 공원·역·공항·호텔 = 무료 or 별도 계산
        };
    }

    private int priceLevelToKrw(LocationType type, String priceLevel) {
        if (priceLevel == null) {
            // priceLevel 없는 장소: 타입별 평균값 사용
            return defaultCostByType(type);
        }
        return switch (priceLevel) {
            case "PRICE_LEVEL_FREE"        -> 0;
            case "PRICE_LEVEL_INEXPENSIVE" -> switch (type) {
                case RESTAURANT -> 10_000;
                case CAFE       -> 5_000;
                case SHOPPING   -> 15_000;
                case MUSEUM     -> 5_000;
                default         -> 5_000;
            };
            case "PRICE_LEVEL_MODERATE"    -> switch (type) {
                case RESTAURANT -> 22_000;
                case CAFE       -> 9_000;
                case SHOPPING   -> 35_000;
                case MUSEUM     -> 15_000;
                default         -> 10_000;
            };
            case "PRICE_LEVEL_EXPENSIVE"   -> switch (type) {
                case RESTAURANT -> 55_000;
                case CAFE       -> 18_000;
                case SHOPPING   -> 60_000;
                case MUSEUM     -> 25_000;
                default         -> 25_000;
            };
            case "PRICE_LEVEL_VERY_EXPENSIVE" -> switch (type) {
                case RESTAURANT -> 120_000;
                case CAFE       -> 30_000;
                case SHOPPING   -> 100_000;
                default         -> 50_000;
            };
            default -> 0;
        };
    }

    private String getAccommodationTypeLabel(String countryCode, int score) {
        return promptRule(countryCode).accommodationLabel(score);
    }

    private boolean containsAny(String input, String... keywords) {
        for (String kw : keywords) {
            if (input.contains(kw)) return true;
        }
        return false;
    }

    private Tendency parseTendency(String raw) {
        try { return Tendency.valueOf(raw.toUpperCase()); }
        catch (Exception e) { return Tendency.BALANCED; }
    }

    private LocationType parseLocationType(String raw) {
        try { return LocationType.valueOf(raw.toUpperCase()); }
        catch (IllegalArgumentException e) { return LocationType.ETC; }
    }

    private TransportType parseTransport(String raw) {
        try { return TransportType.valueOf(raw.toUpperCase()); }
        catch (IllegalArgumentException e) { return TransportType.WALK; }
    }

    private LocalDateTime parseDepartureTime(LocalDate date, String timeStr) {
        try { return date.atTime(LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"))); }
        catch (Exception e) { return date.atTime(9, 0); }
    }

    private long daysBetween(LocalDate start, LocalDate end) {
        return java.time.temporal.ChronoUnit.DAYS.between(start, end) + 1;
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

    // ── TODO: 하드코딩 fallback 일정 (나중에 제거) ──────────────────────
    /**
     * Claude/파싱 실패 시 사용하는 하드코딩 fallback 일정.
     * 여행지별로 실제 존재하는 장소 + 실제 좌표를 사용.
     * 나중에 제거 예정 (사용자 요청 시).
     */
    private String buildFallbackDayJson(String destination, String countryCode, int dayNumber, LocalDate date) {
        log.warn("[Fallback] 하드코딩 일정 반환: dest={}, day={}", destination, dayNumber);
        String d = date.toString();
        boolean isJp = "JP".equalsIgnoreCase(countryCode);

        // 도쿄
        if (destination != null && (destination.contains("도쿄") || destination.contains("Tokyo"))) {
            return switch (((dayNumber - 1) % 3)) {
                case 0 -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"신주쿠역 (新宿駅)","address":"Shinjuku, Tokyo, Japan","lat":35.6896,"lng":139.7006,"type":"STATION","description":"도쿄 최대 환승역"},"toLocation":{"name":"신주쿠 교엔 (新宿御苑)","address":"11 Naitomachi, Shinjuku City, Tokyo","lat":35.6852,"lng":139.7100,"type":"PARK","description":"도쿄 도심 대형 정원"},"transport":"WALK","departureTime":"09:00","durationMinutes":15,"estimatedCost":500,"note":"신주쿠역 남쪽 출구에서 도보 15분"},
                      {"fromLocation":{"name":"신주쿠 교엔 (新宿御苑)","address":"11 Naitomachi, Shinjuku City, Tokyo","lat":35.6852,"lng":139.7100,"type":"PARK","description":"도쿄 도심 대형 정원"},"toLocation":{"name":"이치란 라멘 신주쿠점 (一蘭 新宿店)","address":"3-34-11 Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.7024,"type":"RESTAURANT","description":"유명 1인 돈코츠 라멘 전문점"},"transport":"WALK","departureTime":"11:30","durationMinutes":20,"estimatedCost":1800,"note":"도보 이동 후 점심"},
                      {"fromLocation":{"name":"이치란 라멘 신주쿠점 (一蘭 新宿店)","address":"3-34-11 Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.7024,"type":"RESTAURANT","description":"유명 1인 돈코츠 라멘 전문점"},"toLocation":{"name":"시부야 스크램블 교차로 (渋谷スクランブル交差点)","address":"2 Dogenzaka, Shibuya City, Tokyo","lat":35.6598,"lng":139.7004,"type":"ETC","description":"세계 최대 교차로"},"transport":"SUBWAY","departureTime":"13:00","durationMinutes":20,"estimatedCost":210,"note":"JR 야마노테선 시부야 방향"},
                      {"fromLocation":{"name":"시부야 스크램블 교차로 (渋谷スクランブル交差点)","address":"2 Dogenzaka, Shibuya City, Tokyo","lat":35.6598,"lng":139.7004,"type":"ETC","description":"세계 최대 교차로"},"toLocation":{"name":"시부야 히카리에 (渋谷ヒカリエ)","address":"2-21-1 Shibuya, Shibuya City, Tokyo","lat":35.6590,"lng":139.7028,"type":"SHOPPING","description":"시부야역 직결 복합 쇼핑몰"},"transport":"WALK","departureTime":"13:30","durationMinutes":10,"estimatedCost":0,"note":"스크램블 교차로 바로 옆"},
                      {"fromLocation":{"name":"시부야 히카리에 (渋谷ヒカリエ)","address":"2-21-1 Shibuya, Shibuya City, Tokyo","lat":35.6590,"lng":139.7028,"type":"SHOPPING","description":"시부야역 직결 복합 쇼핑몰"},"toLocation":{"name":"하라주쿠 타케시타 거리 (竹下通り)","address":"1-17-5 Jingumae, Shibuya City, Tokyo","lat":35.6701,"lng":139.7037,"type":"SHOPPING","description":"패션·먹거리 명소"},"transport":"SUBWAY","departureTime":"15:30","durationMinutes":10,"estimatedCost":180,"note":"JR 하라주쿠역 하차"},
                      {"fromLocation":{"name":"하라주쿠 타케시타 거리 (竹下通り)","address":"1-17-5 Jingumae, Shibuya City, Tokyo","lat":35.6701,"lng":139.7037,"type":"SHOPPING","description":"패션·먹거리 명소"},"toLocation":{"name":"신주쿠 워싱턴 호텔 (Shinjuku Washington Hotel)","address":"3-2-9 Nishi-Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.6948,"type":"HOTEL","description":"신주쿠 비즈니스 호텔"},"transport":"SUBWAY","departureTime":"19:00","durationMinutes":20,"estimatedCost":200,"note":"JR 야마노테선 신주쿠 방향"}
                    ]}""".formatted(dayNumber, d);
                case 1 -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"신주쿠 워싱턴 호텔 (Shinjuku Washington Hotel)","address":"3-2-9 Nishi-Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.6948,"type":"HOTEL","description":"신주쿠 비즈니스 호텔"},"toLocation":{"name":"아사쿠사 센소지 (浅草寺)","address":"2-3-1 Asakusa, Taito City, Tokyo","lat":35.7148,"lng":139.7967,"type":"MUSEUM","description":"도쿄 최고(最古) 사원"},"transport":"SUBWAY","departureTime":"09:00","durationMinutes":40,"estimatedCost":260,"note":"지하철 긴자선 아사쿠사 방향"},
                      {"fromLocation":{"name":"아사쿠사 센소지 (浅草寺)","address":"2-3-1 Asakusa, Taito City, Tokyo","lat":35.7148,"lng":139.7967,"type":"MUSEUM","description":"도쿄 최고(最古) 사원"},"toLocation":{"name":"나카미세 상점가 (仲見世通り)","address":"1-36-3 Asakusa, Taito City, Tokyo","lat":35.7128,"lng":139.7958,"type":"SHOPPING","description":"센소지 앞 전통 상점가"},"transport":"WALK","departureTime":"11:00","durationMinutes":10,"estimatedCost":0,"note":"센소지 경내 도보"},
                      {"fromLocation":{"name":"나카미세 상점가 (仲見世通り)","address":"1-36-3 Asakusa, Taito City, Tokyo","lat":35.7128,"lng":139.7958,"type":"SHOPPING","description":"센소지 앞 전통 상점가"},"toLocation":{"name":"카페 도니아 아사쿠사 (Cafe Donia Asakusa)","address":"1-14-10 Asakusa, Taito City, Tokyo","lat":35.7120,"lng":139.7935,"type":"CAFE","description":"아사쿠사 로컬 카페"},"transport":"WALK","departureTime":"12:00","durationMinutes":20,"estimatedCost":800,"note":"점심 전 카페 휴식"},
                      {"fromLocation":{"name":"카페 도니아 아사쿠사 (Cafe Donia Asakusa)","address":"1-14-10 Asakusa, Taito City, Tokyo","lat":35.7120,"lng":139.7935,"type":"CAFE","description":"아사쿠사 로컬 카페"},"toLocation":{"name":"우에노 공원 (上野公園)","address":"Uenokoen, Taito City, Tokyo","lat":35.7147,"lng":139.7740,"type":"PARK","description":"도쿄 최대 공원·박물관 집적지"},"transport":"SUBWAY","departureTime":"13:30","durationMinutes":15,"estimatedCost":180,"note":"지하철 긴자선 우에노 방향"},
                      {"fromLocation":{"name":"우에노 공원 (上野公園)","address":"Uenokoen, Taito City, Tokyo","lat":35.7147,"lng":139.7740,"type":"PARK","description":"도쿄 최대 공원·박물관 집적지"},"toLocation":{"name":"아키하바라 전자상가 (秋葉原電気街)","address":"1-1 Sotokanda, Chiyoda City, Tokyo","lat":35.7022,"lng":139.7741,"type":"SHOPPING","description":"전자제품·피규어 쇼핑 명소"},"transport":"SUBWAY","departureTime":"15:30","durationMinutes":15,"estimatedCost":180,"note":"JR 야마노테선 아키하바라 방향"},
                      {"fromLocation":{"name":"아키하바라 전자상가 (秋葉原電気街)","address":"1-1 Sotokanda, Chiyoda City, Tokyo","lat":35.7022,"lng":139.7741,"type":"SHOPPING","description":"전자제품·피규어 쇼핑 명소"},"toLocation":{"name":"신주쿠 워싱턴 호텔 (Shinjuku Washington Hotel)","address":"3-2-9 Nishi-Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.6948,"type":"HOTEL","description":"신주쿠 비즈니스 호텔"},"transport":"SUBWAY","departureTime":"19:00","durationMinutes":30,"estimatedCost":260,"note":"JR 츄오선 신주쿠 방향"}
                    ]}""".formatted(dayNumber, d);
                default -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"신주쿠 워싱턴 호텔 (Shinjuku Washington Hotel)","address":"3-2-9 Nishi-Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.6948,"type":"HOTEL","description":"신주쿠 비즈니스 호텔"},"toLocation":{"name":"츠키지 시장 (築地市場)","address":"4-16-2 Tsukiji, Chuo City, Tokyo","lat":35.6654,"lng":139.7706,"type":"RESTAURANT","description":"도쿄 유명 해산물 시장"},"transport":"SUBWAY","departureTime":"08:00","durationMinutes":30,"estimatedCost":230,"note":"지하철 히비야선 츠키지 방향"},
                      {"fromLocation":{"name":"츠키지 시장 (築地市場)","address":"4-16-2 Tsukiji, Chuo City, Tokyo","lat":35.6654,"lng":139.7706,"type":"RESTAURANT","description":"도쿄 유명 해산물 시장"},"toLocation":{"name":"도쿄 타워 (東京タワー)","address":"4-2-8 Shibakoen, Minato City, Tokyo","lat":35.6586,"lng":139.7454,"type":"ETC","description":"도쿄 랜드마크 전망대"},"transport":"SUBWAY","departureTime":"10:00","durationMinutes":20,"estimatedCost":180,"note":"지하철 오에도선 아카바네바시 방향"},
                      {"fromLocation":{"name":"도쿄 타워 (東京タワー)","address":"4-2-8 Shibakoen, Minato City, Tokyo","lat":35.6586,"lng":139.7454,"type":"ETC","description":"도쿄 랜드마크 전망대"},"toLocation":{"name":"오다이바 (お台場)","address":"1-chome Daiba, Minato City, Tokyo","lat":35.6252,"lng":139.7751,"type":"SHOPPING","description":"도쿄만 인공섬 쇼핑·관광지"},"transport":"BUS","departureTime":"12:30","durationMinutes":30,"estimatedCost":400,"note":"직행 버스 이용"},
                      {"fromLocation":{"name":"오다이바 (お台場)","address":"1-chome Daiba, Minato City, Tokyo","lat":35.6252,"lng":139.7751,"type":"SHOPPING","description":"도쿄만 인공섬 쇼핑·관광지"},"toLocation":{"name":"디버시티 도쿄 플라자 (DiverCity Tokyo Plaza)","address":"1-1-10 Aomi, Koto City, Tokyo","lat":35.6257,"lng":139.7760,"type":"SHOPPING","description":"건담 실물 크기 조형물 있는 쇼핑몰"},"transport":"WALK","departureTime":"14:00","durationMinutes":10,"estimatedCost":0,"note":"오다이바 내 도보"},
                      {"fromLocation":{"name":"디버시티 도쿄 플라자 (DiverCity Tokyo Plaza)","address":"1-1-10 Aomi, Koto City, Tokyo","lat":35.6257,"lng":139.7760,"type":"SHOPPING","description":"건담 실물 크기 조형물 있는 쇼핑몰"},"toLocation":{"name":"신주쿠 워싱턴 호텔 (Shinjuku Washington Hotel)","address":"3-2-9 Nishi-Shinjuku, Shinjuku City, Tokyo","lat":35.6906,"lng":139.6948,"type":"HOTEL","description":"신주쿠 비즈니스 호텔"},"transport":"TRAIN","departureTime":"18:30","durationMinutes":40,"estimatedCost":380,"note":"유리카모메 → JR 신주쿠 방향"}
                    ]}""".formatted(dayNumber, d);
            };
        }

        // 오사카
        if (destination != null && (destination.contains("오사카") || destination.contains("Osaka"))) {
            return switch (((dayNumber - 1) % 3)) {
                case 0 -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"난바역 (難波駅)","address":"Namba, Chuo Ward, Osaka","lat":34.6659,"lng":135.5010,"type":"STATION","description":"오사카 최대 번화가 역"},"toLocation":{"name":"도톤보리 (道頓堀)","address":"Dotonbori, Chuo Ward, Osaka","lat":34.6687,"lng":135.5013,"type":"ETC","description":"오사카 대표 먹자골목"},"transport":"WALK","departureTime":"09:30","durationMinutes":10,"estimatedCost":0,"note":"난바역에서 도보 5분"},
                      {"fromLocation":{"name":"도톤보리 (道頓堀)","address":"Dotonbori, Chuo Ward, Osaka","lat":34.6687,"lng":135.5013,"type":"ETC","description":"오사카 대표 먹자골목"},"toLocation":{"name":"구로몬 시장 (黒門市場)","address":"2-4-1 Nipponbashi, Chuo Ward, Osaka","lat":34.6679,"lng":135.5063,"type":"RESTAURANT","description":"오사카의 부엌 재래시장"},"transport":"WALK","departureTime":"11:00","durationMinutes":15,"estimatedCost":2000,"note":"도보로 이동, 시장 먹거리 즐기기"},
                      {"fromLocation":{"name":"구로몬 시장 (黒門市場)","address":"2-4-1 Nipponbashi, Chuo Ward, Osaka","lat":34.6679,"lng":135.5063,"type":"RESTAURANT","description":"오사카의 부엌 재래시장"},"toLocation":{"name":"신사이바시 쇼핑 거리 (心斎橋筋商店街)","address":"Shinsaibashisuji, Chuo Ward, Osaka","lat":34.6726,"lng":135.5005,"type":"SHOPPING","description":"오사카 최대 쇼핑 아케이드"},"transport":"SUBWAY","departureTime":"13:00","durationMinutes":10,"estimatedCost":230,"note":"지하철 사카이스지선 이용"},
                      {"fromLocation":{"name":"신사이바시 쇼핑 거리 (心斎橋筋商店街)","address":"Shinsaibashisuji, Chuo Ward, Osaka","lat":34.6726,"lng":135.5005,"type":"SHOPPING","description":"오사카 최대 쇼핑 아케이드"},"toLocation":{"name":"오사카성 (大阪城)","address":"1-1 Osakajo, Chuo Ward, Osaka","lat":34.6873,"lng":135.5262,"type":"MUSEUM","description":"오사카 대표 역사 유적"},"transport":"SUBWAY","departureTime":"15:00","durationMinutes":20,"estimatedCost":230,"note":"지하철 나가호리 츠루미료쿠치선 이용"},
                      {"fromLocation":{"name":"오사카성 (大阪城)","address":"1-1 Osakajo, Chuo Ward, Osaka","lat":34.6873,"lng":135.5262,"type":"MUSEUM","description":"오사카 대표 역사 유적"},"toLocation":{"name":"오사카 크로스 호텔 (Cross Hotel Osaka)","address":"2-5-15 Shinsaibashisuji, Chuo Ward, Osaka","lat":34.6706,"lng":135.5014,"type":"HOTEL","description":"신사이바시 인근 호텔"},"transport":"SUBWAY","departureTime":"19:00","durationMinutes":25,"estimatedCost":230,"note":"지하철 나가호리선 신사이바시 방향"}
                    ]}""".formatted(dayNumber, d);
                default -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"오사카 크로스 호텔 (Cross Hotel Osaka)","address":"2-5-15 Shinsaibashisuji, Chuo Ward, Osaka","lat":34.6706,"lng":135.5014,"type":"HOTEL","description":"신사이바시 인근 호텔"},"toLocation":{"name":"유니버설 스튜디오 재팬 (USJ)","address":"2-1-33 Sakurajima, Konohana Ward, Osaka","lat":34.6654,"lng":135.4323,"type":"ETC","description":"오사카 대형 테마파크"},"transport":"TRAIN","departureTime":"08:30","durationMinutes":30,"estimatedCost":490,"note":"JR 유메사키선 유니버설시티 방향"},
                      {"fromLocation":{"name":"유니버설 스튜디오 재팬 (USJ)","address":"2-1-33 Sakurajima, Konohana Ward, Osaka","lat":34.6654,"lng":135.4323,"type":"ETC","description":"오사카 대형 테마파크"},"toLocation":{"name":"오사카 크로스 호텔 (Cross Hotel Osaka)","address":"2-5-15 Shinsaibashisuji, Chuo Ward, Osaka","lat":34.6706,"lng":135.5014,"type":"HOTEL","description":"신사이바시 인근 호텔"},"transport":"TRAIN","departureTime":"19:00","durationMinutes":30,"estimatedCost":490,"note":"JR 유메사키선 복귀"}
                    ]}""".formatted(dayNumber, d);
            };
        }

        // 교토
        if (destination != null && (destination.contains("교토") || destination.contains("Kyoto"))) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"교토역 (京都駅)","address":"Karasuma-dori, Shimogyo Ward, Kyoto","lat":34.9858,"lng":135.7588,"type":"STATION","description":"교토 관문"},"toLocation":{"name":"후시미 이나리 신사 (伏見稲荷大社)","address":"68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto","lat":34.9671,"lng":135.7727,"type":"MUSEUM","description":"천 개의 도리이 명소"},"transport":"TRAIN","departureTime":"09:00","durationMinutes":15,"estimatedCost":150,"note":"JR 나라선 이나리역 하차"},
                  {"fromLocation":{"name":"후시미 이나리 신사 (伏見稲荷大社)","address":"68 Fukakusa Yabunouchicho, Fushimi Ward, Kyoto","lat":34.9671,"lng":135.7727,"type":"MUSEUM","description":"천 개의 도리이 명소"},"toLocation":{"name":"기온 거리 (祇園)","address":"Gion, Higashiyama Ward, Kyoto","lat":35.0036,"lng":135.7788,"type":"ETC","description":"마이코·게이샤 문화 거리"},"transport":"TRAIN","departureTime":"11:30","durationMinutes":20,"estimatedCost":200,"note":"JR 나라선 → 버스 이용"},
                  {"fromLocation":{"name":"기온 거리 (祇園)","address":"Gion, Higashiyama Ward, Kyoto","lat":35.0036,"lng":135.7788,"type":"ETC","description":"마이코·게이샤 문화 거리"},"toLocation":{"name":"기요미즈데라 (清水寺)","address":"1-294 Kiyomizu, Higashiyama Ward, Kyoto","lat":34.9949,"lng":135.7850,"type":"MUSEUM","description":"교토 세계문화유산 사원"},"transport":"WALK","departureTime":"13:00","durationMinutes":20,"estimatedCost":500,"note":"기온에서 도보 이동, 입장료 포함"},
                  {"fromLocation":{"name":"기요미즈데라 (清水寺)","address":"1-294 Kiyomizu, Higashiyama Ward, Kyoto","lat":34.9949,"lng":135.7850,"type":"MUSEUM","description":"교토 세계문화유산 사원"},"toLocation":{"name":"아라시야마 (嵐山)","address":"Arashiyama, Nishikyo Ward, Kyoto","lat":35.0094,"lng":135.6761,"type":"PARK","description":"대나무 숲·강변 명소"},"transport":"BUS","departureTime":"15:00","durationMinutes":45,"estimatedCost":230,"note":"시내버스 이용"},
                  {"fromLocation":{"name":"아라시야마 (嵐山)","address":"Arashiyama, Nishikyo Ward, Kyoto","lat":35.0094,"lng":135.6761,"type":"PARK","description":"대나무 숲·강변 명소"},"toLocation":{"name":"교토 더 서울 호텔 (Hotel The Celestine Kyoto Gion)","address":"Minamigawa, Yamatooji-dori, Higashiyama Ward, Kyoto","lat":35.0015,"lng":135.7775,"type":"HOTEL","description":"기온 인근 호텔"},"transport":"TRAIN","departureTime":"18:30","durationMinutes":40,"estimatedCost":310,"note":"사가노선 → 지하철 이용"}
                ]}""".formatted(dayNumber, d);
        }

        // 제주
        if (destination != null && (destination.contains("제주"))) {
            return switch (((dayNumber - 1) % 2)) {
                case 0 -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"제주국제공항","address":"2 Gonghangnamseo-ro, Jeju-si, Jeju-do","lat":33.5113,"lng":126.4928,"type":"AIRPORT","description":"제주 관문"},"toLocation":{"name":"한림공원","address":"300 Hallim-ro, Hallim-eup, Jeju-si","lat":33.4097,"lng":126.2479,"type":"PARK","description":"아열대 식물원·동굴 명소"},"transport":"CAR","departureTime":"10:00","durationMinutes":40,"estimatedCost":5000,"note":"렌터카 서쪽 방향"},
                      {"fromLocation":{"name":"한림공원","address":"300 Hallim-ro, Hallim-eup, Jeju-si","lat":33.4097,"lng":126.2479,"type":"PARK","description":"아열대 식물원·동굴 명소"},"toLocation":{"name":"협재해수욕장","address":"Hyeopjaehaebyeon-gil, Hallim-eup, Jeju-si","lat":33.3944,"lng":126.2394,"type":"PARK","description":"에메랄드빛 제주 해수욕장"},"transport":"CAR","departureTime":"12:00","durationMinutes":10,"estimatedCost":2000,"note":"렌터카 이동"},
                      {"fromLocation":{"name":"협재해수욕장","address":"Hyeopjaehaebyeon-gil, Hallim-eup, Jeju-si","lat":33.3944,"lng":126.2394,"type":"PARK","description":"에메랄드빛 제주 해수욕장"},"toLocation":{"name":"오설록 티 뮤지엄","address":"15 Sinhwayeoksa-ro, Andeok-myeon, Seogwipo-si","lat":33.3057,"lng":126.2897,"type":"MUSEUM","description":"국내 최대 녹차밭·티 박물관"},"transport":"CAR","departureTime":"14:30","durationMinutes":35,"estimatedCost":5000,"note":"렌터카 남쪽 방향"},
                      {"fromLocation":{"name":"오설록 티 뮤지엄","address":"15 Sinhwayeoksa-ro, Andeok-myeon, Seogwipo-si","lat":33.3057,"lng":126.2897,"type":"MUSEUM","description":"국내 최대 녹차밭·티 박물관"},"toLocation":{"name":"제주 신화월드 내 호텔 (Jeju Shinhwa World Hotels)","address":"2889-1 Sanrokbuk-ro, Andeok-myeon, Seogwipo-si","lat":33.3103,"lng":126.2992,"type":"HOTEL","description":"제주 서쪽 리조트 호텔"},"transport":"CAR","departureTime":"17:00","durationMinutes":10,"estimatedCost":2000,"note":"렌터카 이동, 체크인"}
                    ]}""".formatted(dayNumber, d);
                default -> """
                    {"dayNumber":%d,"date":"%s","routes":[
                      {"fromLocation":{"name":"제주 신화월드 내 호텔 (Jeju Shinhwa World Hotels)","address":"2889-1 Sanrokbuk-ro, Andeok-myeon, Seogwipo-si","lat":33.3103,"lng":126.2992,"type":"HOTEL","description":"제주 서쪽 리조트 호텔"},"toLocation":{"name":"성산일출봉 (Seongsan Ilchulbong)","address":"284-12 Seongsan-ri, Seongsan-eup, Seogwipo-si","lat":33.4584,"lng":126.9425,"type":"PARK","description":"유네스코 세계자연유산"},"transport":"CAR","departureTime":"07:00","durationMinutes":70,"estimatedCost":8000,"note":"렌터카 동쪽 방향, 일출 명소"},
                      {"fromLocation":{"name":"성산일출봉 (Seongsan Ilchulbong)","address":"284-12 Seongsan-ri, Seongsan-eup, Seogwipo-si","lat":33.4584,"lng":126.9425,"type":"PARK","description":"유네스코 세계자연유산"},"toLocation":{"name":"제주 해녀박물관","address":"26 Haenyeo-ro, Gujwa-eup, Jeju-si","lat":33.5477,"lng":126.8627,"type":"MUSEUM","description":"제주 해녀 문화 박물관"},"transport":"CAR","departureTime":"10:00","durationMinutes":30,"estimatedCost":5000,"note":"렌터카 이동"},
                      {"fromLocation":{"name":"제주 해녀박물관","address":"26 Haenyeo-ro, Gujwa-eup, Jeju-si","lat":33.5477,"lng":126.8627,"type":"MUSEUM","description":"제주 해녀 문화 박물관"},"toLocation":{"name":"함덕해수욕장","address":"791 Hamdeok-ri, Jocheon-eup, Jeju-si","lat":33.5431,"lng":126.6694,"type":"PARK","description":"제주 동쪽 에메랄드 해수욕장"},"transport":"CAR","departureTime":"12:30","durationMinutes":25,"estimatedCost":4000,"note":"렌터카 이동"},
                      {"fromLocation":{"name":"함덕해수욕장","address":"791 Hamdeok-ri, Jocheon-eup, Jeju-si","lat":33.5431,"lng":126.6694,"type":"PARK","description":"제주 동쪽 에메랄드 해수욕장"},"toLocation":{"name":"제주 신화월드 내 호텔 (Jeju Shinhwa World Hotels)","address":"2889-1 Sanrokbuk-ro, Andeok-myeon, Seogwipo-si","lat":33.3103,"lng":126.2992,"type":"HOTEL","description":"제주 서쪽 리조트 호텔"},"transport":"CAR","departureTime":"17:00","durationMinutes":60,"estimatedCost":8000,"note":"렌터카 서쪽 방향"}
                    ]}""".formatted(dayNumber, d);
            };
        }

        // 부산
        if (destination != null && (destination.contains("부산") || destination.contains("Busan"))) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"부산역","address":"206 Chungjang-daero, Dong-gu, Busan","lat":35.1151,"lng":129.0416,"type":"STATION","description":"부산 KTX 터미널역"},"toLocation":{"name":"자갈치 시장","address":"52 Jagalchihaean-ro, Jung-gu, Busan","lat":35.0972,"lng":129.0300,"type":"RESTAURANT","description":"부산 대표 수산물 시장"},"transport":"SUBWAY","departureTime":"09:30","durationMinutes":20,"estimatedCost":1600,"note":"지하철 1호선 남포역 하차"},
                  {"fromLocation":{"name":"자갈치 시장","address":"52 Jagalchihaean-ro, Jung-gu, Busan","lat":35.0972,"lng":129.0300,"type":"RESTAURANT","description":"부산 대표 수산물 시장"},"toLocation":{"name":"감천문화마을","address":"203 Gamnae 2-ro, Saha-gu, Busan","lat":35.0972,"lng":129.0106,"type":"ETC","description":"부산 색깔마을 벽화골목"},"transport":"BUS","departureTime":"11:30","durationMinutes":20,"estimatedCost":1600,"note":"마을버스 이용"},
                  {"fromLocation":{"name":"감천문화마을","address":"203 Gamnae 2-ro, Saha-gu, Busan","lat":35.0972,"lng":129.0106,"type":"ETC","description":"부산 색깔마을 벽화골목"},"toLocation":{"name":"해운대 해수욕장","address":"264 Haeundaehaebyeon-ro, Haeundae-gu, Busan","lat":35.1587,"lng":129.1604,"type":"PARK","description":"부산 대표 해수욕장"},"transport":"SUBWAY","departureTime":"14:00","durationMinutes":45,"estimatedCost":2000,"note":"지하철 2호선 해운대역 방향"},
                  {"fromLocation":{"name":"해운대 해수욕장","address":"264 Haeundaehaebyeon-ro, Haeundae-gu, Busan","lat":35.1587,"lng":129.1604,"type":"PARK","description":"부산 대표 해수욕장"},"toLocation":{"name":"광안리 해수욕장","address":"219 Gwanganhaebyeon-ro, Suyeong-gu, Busan","lat":35.1532,"lng":129.1182,"type":"PARK","description":"광안대교 야경 명소"},"transport":"BUS","departureTime":"16:30","durationMinutes":20,"estimatedCost":1600,"note":"버스 이동"},
                  {"fromLocation":{"name":"광안리 해수욕장","address":"219 Gwanganhaebyeon-ro, Suyeong-gu, Busan","lat":35.1532,"lng":129.1182,"type":"PARK","description":"광안대교 야경 명소"},"toLocation":{"name":"파라다이스 호텔 부산 (Paradise Hotel Busan)","address":"296 Haeundaehaebyeon-ro, Haeundae-gu, Busan","lat":35.1621,"lng":129.1660,"type":"HOTEL","description":"해운대 특급 호텔"},"transport":"BUS","departureTime":"20:00","durationMinutes":20,"estimatedCost":1600,"note":"버스 이동 후 체크인"}
                ]}""".formatted(dayNumber, d);
        }

        // 삿포로
        if (destination != null && (destination.contains("삿포로") || destination.contains("Sapporo"))) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"삿포로역 (札幌駅)","address":"Kita 6 Jonishi, Kita-ku, Sapporo","lat":43.0686,"lng":141.3506,"type":"STATION","description":"삿포로 중앙역"},"toLocation":{"name":"오도리 공원 (大通公園)","address":"Odori Nishi, Chuo-ku, Sapporo","lat":43.0600,"lng":141.3530,"type":"PARK","description":"삿포로 중심 공원"},"transport":"WALK","departureTime":"09:30","durationMinutes":15,"estimatedCost":0,"note":"삿포로역 남쪽 방향 도보"},
                  {"fromLocation":{"name":"오도리 공원 (大通公園)","address":"Odori Nishi, Chuo-ku, Sapporo","lat":43.0600,"lng":141.3530,"type":"PARK","description":"삿포로 중심 공원"},"toLocation":{"name":"삿포로 시계탑 (時計台)","address":"1 Kita Ichijo Nishi, Chuo-ku, Sapporo","lat":43.0644,"lng":141.3535,"type":"MUSEUM","description":"삿포로 대표 랜드마크"},"transport":"WALK","departureTime":"10:30","durationMinutes":10,"estimatedCost":200,"note":"오도리 공원에서 도보"},
                  {"fromLocation":{"name":"삿포로 시계탑 (時計台)","address":"1 Kita Ichijo Nishi, Chuo-ku, Sapporo","lat":43.0644,"lng":141.3535,"type":"MUSEUM","description":"삿포로 대표 랜드마크"},"toLocation":{"name":"스프카레 가라쿠 삿포로점 (スープカレーGARAKU)","address":"1F, South 1, West 4, Chuo-ku, Sapporo","lat":43.0579,"lng":141.3531,"type":"RESTAURANT","description":"삿포로 명물 스프카레 원조 맛집"},"transport":"WALK","departureTime":"11:30","durationMinutes":20,"estimatedCost":1200,"note":"도보 이동 후 점심"},
                  {"fromLocation":{"name":"스프카레 가라쿠 삿포로점 (スープカレーGARAKU)","address":"1F, South 1, West 4, Chuo-ku, Sapporo","lat":43.0579,"lng":141.3531,"type":"RESTAURANT","description":"삿포로 명물 스프카레 원조 맛집"},"toLocation":{"name":"삿포로 맥주 박물관 (サッポロビール博物館)","address":"9-2-10 Kita 7 Johigashi, Higashi-ku, Sapporo","lat":43.0719,"lng":141.3694,"type":"MUSEUM","description":"일본 최초 맥주 박물관·시음 가능"},"transport":"SUBWAY","departureTime":"13:00","durationMinutes":20,"estimatedCost":200,"note":"지하철 도자이선 이용"},
                  {"fromLocation":{"name":"삿포로 맥주 박물관 (サッポロビール博物館)","address":"9-2-10 Kita 7 Johigashi, Higashi-ku, Sapporo","lat":43.0719,"lng":141.3694,"type":"MUSEUM","description":"일본 최초 맥주 박물관·시음 가능"},"toLocation":{"name":"스스키노 (ススキノ)","address":"Minami 5 Jonishi, Chuo-ku, Sapporo","lat":43.0548,"lng":141.3561,"type":"ETC","description":"홋카이도 최대 환락가·맛집 밀집"},"transport":"SUBWAY","departureTime":"16:00","durationMinutes":20,"estimatedCost":200,"note":"지하철 이용"},
                  {"fromLocation":{"name":"스스키노 (ススキノ)","address":"Minami 5 Jonishi, Chuo-ku, Sapporo","lat":43.0548,"lng":141.3561,"type":"ETC","description":"홋카이도 최대 환락가·맛집 밀집"},"toLocation":{"name":"JR 타워 호텔 닛코 삿포로 (JR Tower Hotel Nikko Sapporo)","address":"2 Kita 5 Jonishi, Chuo-ku, Sapporo","lat":43.0683,"lng":141.3503,"type":"HOTEL","description":"삿포로역 직결 특급 호텔"},"transport":"SUBWAY","departureTime":"20:00","durationMinutes":15,"estimatedCost":200,"note":"지하철 이용 복귀"}
                ]}""".formatted(dayNumber, d);
        }

        // 후쿠오카
        if (destination != null && (destination.contains("후쿠오카") || destination.contains("Fukuoka"))) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"하카타역 (博多駅)","address":"1-1 Hakataekichuogai, Hakata-ku, Fukuoka","lat":33.5902,"lng":130.4207,"type":"STATION","description":"후쿠오카 중앙역"},"toLocation":{"name":"카와바타 상점가 (川端商店街)","address":"1-Chome Kawabata-machi, Hakata-ku, Fukuoka","lat":33.5985,"lng":130.4161,"type":"SHOPPING","description":"후쿠오카 전통 아케이드 상점가"},"transport":"SUBWAY","departureTime":"09:30","durationMinutes":10,"estimatedCost":210,"note":"지하철 공항선 나카스카와바타 방향"},
                  {"fromLocation":{"name":"카와바타 상점가 (川端商店街)","address":"1-Chome Kawabata-machi, Hakata-ku, Fukuoka","lat":33.5985,"lng":130.4161,"type":"SHOPPING","description":"후쿠오카 전통 아케이드 상점가"},"toLocation":{"name":"이치란 라멘 본점 (一蘭 総本店)","address":"1-3-6 Daimyo, Chuo-ku, Fukuoka","lat":33.5914,"lng":130.3977,"type":"RESTAURANT","description":"이치란 라멘 발상지 본점"},"transport":"SUBWAY","departureTime":"11:00","durationMinutes":10,"estimatedCost":210,"note":"지하철 공항선 텐진 방향"},
                  {"fromLocation":{"name":"이치란 라멘 본점 (一蘭 総本店)","address":"1-3-6 Daimyo, Chuo-ku, Fukuoka","lat":33.5914,"lng":130.3977,"type":"RESTAURANT","description":"이치란 라멘 발상지 본점"},"toLocation":{"name":"다이묘 거리 (大名エリア)","address":"Daimyo, Chuo-ku, Fukuoka","lat":33.5920,"lng":130.3970,"type":"SHOPPING","description":"후쿠오카 트렌디 쇼핑·카페 거리"},"transport":"WALK","departureTime":"12:30","durationMinutes":5,"estimatedCost":0,"note":"이치란 본점 바로 근처"},
                  {"fromLocation":{"name":"다이묘 거리 (大名エリア)","address":"Daimyo, Chuo-ku, Fukuoka","lat":33.5920,"lng":130.3970,"type":"SHOPPING","description":"후쿠오카 트렌디 쇼핑·카페 거리"},"toLocation":{"name":"오호리 공원 (大濠公園)","address":"1-2 Ohori Park, Chuo-ku, Fukuoka","lat":33.5882,"lng":130.3752,"type":"PARK","description":"후쿠오카 최대 호수 공원"},"transport":"SUBWAY","departureTime":"14:30","durationMinutes":15,"estimatedCost":210,"note":"지하철 공항선 → 나나쿠마선 이용"},
                  {"fromLocation":{"name":"오호리 공원 (大濠公園)","address":"1-2 Ohori Park, Chuo-ku, Fukuoka","lat":33.5882,"lng":130.3752,"type":"PARK","description":"후쿠오카 최대 호수 공원"},"toLocation":{"name":"캐널 시티 하카타 (Canal City Hakata)","address":"1-2 Sumiyoshi, Hakata-ku, Fukuoka","lat":33.5887,"lng":130.4115,"type":"SHOPPING","description":"후쿠오카 대형 쇼핑몰"},"transport":"SUBWAY","departureTime":"16:30","durationMinutes":20,"estimatedCost":210,"note":"지하철 이용"},
                  {"fromLocation":{"name":"캐널 시티 하카타 (Canal City Hakata)","address":"1-2 Sumiyoshi, Hakata-ku, Fukuoka","lat":33.5887,"lng":130.4115,"type":"SHOPPING","description":"후쿠오카 대형 쇼핑몰"},"toLocation":{"name":"하카타 엑셀 호텔 토큐 (Hakata Excel Hotel Tokyu)","address":"1-17 Hakata-Ekimae, Hakata-ku, Fukuoka","lat":33.5901,"lng":130.4179,"type":"HOTEL","description":"하카타역 인근 호텔"},"transport":"WALK","departureTime":"20:00","durationMinutes":10,"estimatedCost":0,"note":"도보 이동 후 체크인"}
                ]}""".formatted(dayNumber, d);
        }

        // 나고야
        if (destination != null && (destination.contains("나고야") || destination.contains("Nagoya"))) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"나고야역 (名古屋駅)","address":"1-1-4 Meieki, Nakamura-ku, Nagoya","lat":35.1706,"lng":136.8816,"type":"STATION","description":"나고야 중앙역"},"toLocation":{"name":"나고야성 (名古屋城)","address":"1-1 Honmaru, Naka-ku, Nagoya","lat":35.1856,"lng":136.8994,"type":"MUSEUM","description":"나고야 대표 성곽"},"transport":"SUBWAY","departureTime":"09:30","durationMinutes":20,"estimatedCost":270,"note":"지하철 메이조선 시야쿠쇼 방향"},
                  {"fromLocation":{"name":"나고야성 (名古屋城)","address":"1-1 Honmaru, Naka-ku, Nagoya","lat":35.1856,"lng":136.8994,"type":"MUSEUM","description":"나고야 대표 성곽"},"toLocation":{"name":"오스 상점가 (大須商店街)","address":"2-21-47 Osu, Naka-ku, Nagoya","lat":35.1601,"lng":136.9001,"type":"SHOPPING","description":"나고야 최대 전통 쇼핑 아케이드"},"transport":"SUBWAY","departureTime":"12:00","durationMinutes":20,"estimatedCost":270,"note":"지하철 메이조선 이용"},
                  {"fromLocation":{"name":"오스 상점가 (大須商店街)","address":"2-21-47 Osu, Naka-ku, Nagoya","lat":35.1601,"lng":136.9001,"type":"SHOPPING","description":"나고야 최대 전통 쇼핑 아케이드"},"toLocation":{"name":"야바초 코리안 거리 (矢場町)","address":"Yabamachi, Naka-ku, Nagoya","lat":35.1614,"lng":136.9046,"type":"RESTAURANT","description":"히츠마부시·미소카츠 맛집 밀집"},"transport":"WALK","departureTime":"14:00","durationMinutes":10,"estimatedCost":1500,"note":"도보 이동 후 점심"},
                  {"fromLocation":{"name":"야바초 코리안 거리 (矢場町)","address":"Yabamachi, Naka-ku, Nagoya","lat":35.1614,"lng":136.9046,"type":"RESTAURANT","description":"히츠마부시·미소카츠 맛집 밀집"},"toLocation":{"name":"나고야 매리어트 어소시아 호텔 (Nagoya Marriott Associa Hotel)","address":"1-1-4 Meieki, Nakamura-ku, Nagoya","lat":35.1706,"lng":136.8816,"type":"HOTEL","description":"나고야역 직결 특급 호텔"},"transport":"SUBWAY","departureTime":"19:00","durationMinutes":20,"estimatedCost":270,"note":"지하철 이용 복귀"}
                ]}""".formatted(dayNumber, d);
        }

        // 기본 fallback (여행지 불명)
        if (isJp) {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"호텔","address":"Japan","lat":35.6762,"lng":139.6503,"type":"HOTEL","description":"숙박지"},"toLocation":{"name":"지역 관광지","address":"Japan","lat":35.6762,"lng":139.6503,"type":"ETC","description":"지역 유명 관광지"},"transport":"WALK","departureTime":"09:30","durationMinutes":30,"estimatedCost":500,"note":"도보 이동"},
                  {"fromLocation":{"name":"지역 관광지","address":"Japan","lat":35.6762,"lng":139.6503,"type":"ETC","description":"지역 유명 관광지"},"toLocation":{"name":"지역 맛집","address":"Japan","lat":35.6762,"lng":139.6503,"type":"RESTAURANT","description":"지역 맛집"},"transport":"WALK","departureTime":"12:00","durationMinutes":30,"estimatedCost":1500,"note":"점심 식사"},
                  {"fromLocation":{"name":"지역 맛집","address":"Japan","lat":35.6762,"lng":139.6503,"type":"RESTAURANT","description":"지역 맛집"},"toLocation":{"name":"호텔","address":"Japan","lat":35.6762,"lng":139.6503,"type":"HOTEL","description":"숙박지"},"transport":"WALK","departureTime":"19:00","durationMinutes":20,"estimatedCost":200,"note":"저녁 복귀"}
                ]}""".formatted(dayNumber, d);
        } else {
            return """
                {"dayNumber":%d,"date":"%s","routes":[
                  {"fromLocation":{"name":"호텔","address":"Korea","lat":37.5665,"lng":126.9780,"type":"HOTEL","description":"숙박지"},"toLocation":{"name":"지역 관광지","address":"Korea","lat":37.5665,"lng":126.9780,"type":"ETC","description":"지역 유명 관광지"},"transport":"WALK","departureTime":"09:30","durationMinutes":30,"estimatedCost":5000,"note":"도보 이동"},
                  {"fromLocation":{"name":"지역 관광지","address":"Korea","lat":37.5665,"lng":126.9780,"type":"ETC","description":"지역 유명 관광지"},"toLocation":{"name":"지역 맛집","address":"Korea","lat":37.5665,"lng":126.9780,"type":"RESTAURANT","description":"지역 맛집"},"transport":"WALK","departureTime":"12:00","durationMinutes":30,"estimatedCost":12000,"note":"점심 식사"},
                  {"fromLocation":{"name":"지역 맛집","address":"Korea","lat":37.5665,"lng":126.9780,"type":"RESTAURANT","description":"지역 맛집"},"toLocation":{"name":"호텔","address":"Korea","lat":37.5665,"lng":126.9780,"type":"HOTEL","description":"숙박지"},"transport":"WALK","departureTime":"19:00","durationMinutes":20,"estimatedCost":1500,"note":"저녁 복귀"}
                ]}""".formatted(dayNumber, d);
        }
    }
    // ── 하드코딩 fallback 끝 ─────────────────────────────────────────

    private void validateDateRange(LocalDate start, LocalDate end) {
        if (start == null || end == null) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "출발일과 귀국일을 입력해주세요");
        }
        if (!end.isAfter(start)) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "귀국일은 출발일보다 늦어야 합니다");
        }
        long nights = java.time.temporal.ChronoUnit.DAYS.between(start, end);
        if (nights > 30) {
            throw new BusinessException(ErrorCode.INVALID_REQUEST, "여행 기간은 최대 30박까지 가능합니다");
        }
    }

    private Integer nodeIntOrNull(JsonNode node, String field) {
        JsonNode n = node.path(field);
        return (n.isMissingNode() || n.isNull()) ? null : n.asInt();
    }
}
