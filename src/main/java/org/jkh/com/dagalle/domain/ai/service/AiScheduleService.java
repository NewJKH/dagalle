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
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        int totalDays = (int) daysBetween(req.getStartDate(), req.getEndDate());
        log.info("[AI generate] userId={}, {}→{}, {}~{} ({}일)",
                userId, req.getStartLocation(), req.getEndLocation(),
                req.getStartDate(), req.getEndDate(), totalDays);

        // 규칙 기반: TravelPlan 생성 (Claude 호출 없음)
        TravelPlan travel = createTravelByRule(user, req, totalDays);

        // Claude 1회: 1일차만 생성 (나머지는 사용자가 순서대로 생성)
        generateDay(userId, travel.getId(), 1);

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
    public PlanDayResponse generateDay(Long userId, Long travelId, int dayNumber) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        int totalDays = (int) daysBetween(travel.getStartDate(), travel.getEndDate());
        LocalDate date = travel.getStartDate().plusDays(dayNumber - 1);

        planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .ifPresent(planDayRepository::delete);
        planDayRepository.flush();

        log.info("[AI generateDay] travelId={}, day={}/{}", travelId, dayNumber, totalDays);

        String prevLastLocation = resolvePrevLastLocation(travel, dayNumber);
        String accommodationHint = accommodationRepository.findByTravelPlan(travel).stream()
                .map(a -> a.getHotelName() + "(" + a.getCheckIn() + "~" + a.getCheckOut() + ")")
                .reduce("", (a, b) -> a + b + " ");
        String flightHint = buildFlightHint(travel, dayNumber, totalDays);

        String dayRaw = claudeApiClient.chat(
                buildDaySystemPrompt(travel.getCountryCode(),
                        travel.getFoodScore(), travel.getAccommodationScore(),
                        travel.getExtremeScore(), travel.getTransportScore()),
                buildDayUserMessage(travel, dayNumber, totalDays, date,
                        prevLastLocation, accommodationHint.trim(), flightHint));
        log.debug("[AI day{} 응답] {}", dayNumber, dayRaw);

        JsonNode dayNode = parseJson(dayRaw);
        savePlanDay(travel, dayNode, dayNumber, date);

        entityManager.flush();
        entityManager.clear();
        TravelPlan travelFresh = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        return planDayRepository.findByTravelPlanAndDayNumber(travelFresh, dayNumber)
                .map(PlanDayResponse::from)
                .orElseThrow(() -> new IllegalStateException("Day 저장 후 조회 실패: day=" + dayNumber));
    }

    // ──────────────────────────────────────────────
    //  ⑤ 빈 시간 채우기 (Claude 1회, 사용자 요청 시)
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

        // 숙박: 점수 기반 등급/단가 저장
        saveAccommodationByRule(travel, req.getCountryCode(), req.getAccommodationScore(),
                req.getStartDate(), req.getEndDate(), req.getEndLocation());

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

    /** 렌트카 단가 규칙 테이블 (Claude 없이 저장) */
    private void saveRentalCarByRule(TravelPlan travel, String countryCode, int totalDays) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        int dailyRate      = isJp ? 70_000 : 80_000;   // 엔→원 환산 or 원
        int fuelPerDay     = isJp ? 18_000 : 30_000;
        int tollPerDay     = isJp ?  5_000 : 10_000;
        String carType     = isJp ? "경차/하이브리드" : "중형차";

        carRentalRepository.save(CarRental.builder()
                .travelPlan(travel)
                .carType(carType)
                .dailyRateKrw(dailyRate)
                .rentalDays(totalDays)
                .estimatedFuelKrw(fuelPerDay * totalDays)
                .estimatedTollKrw(tollPerDay * totalDays)
                .build());
        log.info("[규칙] 렌트카 저장: {}원/일 × {}일", dailyRate, totalDays);
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
        boolean isJp = "JP".equalsIgnoreCase(countryCode);

        String base = "JSON 배열만 응답. 마크다운 금지.\n" +
                "스키마(배열): [" + DAY_SCHEMA + "]\n" +
                (isJp
                    ? "일본 실제 좌표·유명 장소 기준. CAR 비용=엔화×9원. 고속도로 톨비 포함."
                    : "한국 실제 좌표·원화 요금 기준.") +
                " 하루 4~6개 route.\n" +
                "교통: WALK=1km이하/도보15분이내, CAR=3km초과, BUS/TRAIN=도시간이동. WALK 하루 최소1구간.\n" +
                "동선 최적화 규칙(최우선):\n" +
                "- 하루 방문 장소는 지리적으로 인접한 구역끼리 묶어서 순서 배치. 절대 왔다갔다(A→B→A 방향) 금지.\n" +
                "- 직선 이동 원칙: 하루 동선은 한 방향(북→남, 서→동 등)으로 흐르거나 루프(원형 귀환) 형태.\n" +
                "- 같은 구역 장소는 연속 배치. 멀리 떨어진 장소 사이에 가까운 장소를 끼워 넣지 말 것.\n" +
                "- 숙소 기준: 하루 첫 출발지·마지막 도착지가 숙소 인근이 되도록 루트 설계.\n" +
                "CAR 이동 규칙:\n" +
                "- durationMinutes에 교통 정체 여유 포함(시내 +10분, 고속도로 +15분, 관광지 주차 +20분).\n" +
                "- 하루 CAR 총 이동 3시간 초과 시: 중간에 주유소/휴게소 route 1개 추가(장소명='고속도로 휴게소' 또는 '주유소', type=ETC, durationMinutes=20).\n" +
                "장소 description: RESTAURANT/CAFE=대표메뉴+가격대 2~3문장 필수. 그외=주요볼거리·특징 1~2문장.\n" +
                "공항이동: Day1첫route=도착공항→여행지. 마지막날마지막route=여행지→출발공항.\n" +
                "렌트카여행: 주차장 기점 → 주변 WALK → 다음지역 CAR. 관광지밀집구역 내 이동은 WALK.\n" +
                "시간대 규칙(departureTime 반드시 준수):\n" +
                "- 아침카페/시장: 07:00~09:30 방문. 아침식사 07:00~09:00.\n" +
                "- 오전관광(박물관·미술관·신사·궁): 10:00~13:00.\n" +
                "- 점심식사(RESTAURANT): 11:30~13:30 도착.\n" +
                "- 오후관광(공원·쇼핑): 14:00~17:00.\n" +
                "- 온천(type=ETC 온천): 15:00 이후 또는 07:00 이전 조식 전.\n" +
                "- 저녁식사(RESTAURANT): 18:00~20:30 도착.\n" +
                "- 야경·야시장·루프탑바: 19:00 이후 출발. 분위기 중요한 야간 명소는 반드시 일몰 후.\n" +
                "- 숙소 체크인: 마지막 관광 후 21:00 이전.";

        String prefRules = buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);
        return base + prefRules;
    }

    private String buildAllDaysUserMessage(TravelPlan travel, AiGenerateRequest req, int totalDays) {
        String transport = travel.isWithCar()
                ? "렌트카(장거리CAR, 근거리/관광지내WALK)"
                : "대중교통(SUBWAY/BUS/TRAIN, 도보가능거리WALK)";

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
            sb.append(String.format("Day1: 현지공항 도착 %s → %s로 이동 포함.\n",
                    req.getArrivalAtDestTime(), travel.getEndLocation()));
        } else {
            sb.append(String.format("Day1: 첫route=도착공항→%s 이동 포함.\n", travel.getEndLocation()));
        }
        if (req.getReturnFlightTime() != null) {
            sb.append(String.format("마지막날: %s 이전 공항 도착. 마지막route=%s→공항.\n",
                    req.getReturnFlightTime(), travel.getEndLocation()));
        }

        // 숙박 등급 힌트
        sb.append(String.format("숙박등급: 점수%d/10 → %s.\n",
                travel.getAccommodationScore(),
                getAccommodationTypeLabel(travel.getCountryCode(), travel.getAccommodationScore())));

        sb.append(String.format("전체 %d일 일정을 JSON 배열로 출력.", totalDays));
        return sb.toString();
    }

    // ──────────────────────────────────────────────
    //  단건 Day 프롬프트 (재생성용, 기존 유지)
    // ──────────────────────────────────────────────

    private String buildDaySystemPrompt(String countryCode,
                                        int foodScore, int accommodationScore,
                                        int extremeScore, int transportScore) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);

        String base = "JSON만 응답. 마크다운 금지.\n스키마: " + DAY_SCHEMA + "\n" +
                (isJp
                    ? "일본 실제 좌표·유명 장소. CAR비용=엔×9원. 고속도로 톨비 포함."
                    : "한국 실제 좌표·원화 기준.") +
                " 4~6 route.\n" +
                "교통: WALK=1km이하/15분이내, CAR=3km초과, BUS/TRAIN=도시간. WALK 최소1구간.\n" +
                "동선 최적화(최우선): 인접 구역 묶어서 순서 배치. 왔다갔다 절대 금지. 하루 동선은 한 방향 또는 루프 형태. 숙소 인근 출발·귀환.\n" +
                "CAR: durationMinutes에 정체 여유 포함(시내+10분, 고속도로+15분). 하루 CAR 3시간초과 시 휴게소/주유소 route 추가(type=ETC, 20분).\n" +
                "RESTAURANT/CAFE description=대표메뉴+가격대 필수.\n" +
                "Day1첫route=공항→여행지. 마지막날마지막route=여행지→공항.\n" +
                "시간대 규칙: 아침카페/시장=07:00~09:30. 점심=11:30~13:30. 온천=15:00이후. 저녁=18:00~20:30. 야경·야시장=19:00이후. 박물관·신사=10:00~17:00.";

        return base + buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);
    }

    private String buildDayUserMessage(TravelPlan travel, int dayNum, int totalDays,
                                       LocalDate date, String prevLocation,
                                       String accommodationHint, String flightHint) {
        String transport = travel.isWithCar()
                ? "렌트카(장거리CAR, 근거리WALK)"
                : "대중교통(SUBWAY/BUS/TRAIN, 도보WALK)";
        return String.format(
                "여행지:%s | %d일차/%d일 | %s | 인원:%d명 | %s | 테마:%s | 키워드:%s\n" +
                "이전날마지막위치:%s | 숙소:%s | %s\n%d일차 JSON.",
                travel.getEndLocation(), dayNum, totalDays, date,
                travel.getMemberCount() != null ? travel.getMemberCount() : 2,
                transport,
                travel.getTheme() != null ? travel.getTheme() : "일반관광",
                travel.getKeywords() != null && !travel.getKeywords().isEmpty()
                        ? travel.getKeywords() : "없음",
                prevLocation.isEmpty() ? "미정" : prevLocation,
                accommodationHint.isEmpty() ? "미정" : accommodationHint,
                flightHint,
                dayNum);
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
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        StringBuilder sb = new StringBuilder("\n\n【선호도 강제 규칙 - 위반 금지】");

        // 음식
        if (food >= 9) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 3곳이상. ")
              .append(isJp ? "미슐랭·식베로그 고평점 맛집만. 편의점·체인점 금지." : "유명맛집만. 프랜차이즈 금지.");
        } else if (food >= 7) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 2곳이상. 현지맛집 중심.");
        } else if (food >= 4) {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE 하루 1~2곳. 무난한 현지식당.");
        } else if (food >= 2) {
            sb.append("\n▶음식(").append(food).append("/10): 식사 최소화. RESTAURANT 하루 최대1곳. ")
              .append(isJp ? "저렴한 정식집·편의점 OK." : "저렴한 식당 OK.");
        } else {
            sb.append("\n▶음식(").append(food).append("/10): RESTAURANT/CAFE route 생성 금지. 편의점 이용 가정.");
        }

        // 숙박 (동선 내 호텔 이동 route에 적용)
        if (accommodation >= 8) {
            sb.append("\n▶숙박(").append(accommodation).append("/10): ")
              .append(isJp ? "료칸·5성급 호텔만. 비즈니스호텔 언급 금지." : "고급리조트·5성급만.");
        } else if (accommodation <= 2) {
            sb.append("\n▶숙박(").append(accommodation).append("/10): ")
              .append(isJp ? "게스트하우스·캡슐호텔만. 고급호텔 언급 금지." : "게스트하우스·모텔만.");
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
              .append(isJp ? "신칸센·특급열차·페리 등 경치좋은 이동 route 포함." : "KTX·관광열차·페리 포함.");
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

        int seq = 1;
        for (JsonNode routeNode : dayNode.path("routes")) {
            Location from = resolveLocation(routeNode.path("fromLocation"), date);
            Location to   = resolveLocation(routeNode.path("toLocation"),   date);
            String note   = routeNode.path("note").isMissingNode() ? null : routeNode.path("note").asText(null);
            planRouteRepository.save(PlanRoute.builder()
                    .planDay(planDay)
                    .sequence(seq++)
                    .fromLocation(from).toLocation(to)
                    .transport(parseTransport(routeNode.path("transport").asText("WALK")))
                    .departureTime(parseDepartureTime(date, routeNode.path("departureTime").asText("09:00")))
                    .durationMinutes(routeNode.path("durationMinutes").asInt(30))
                    .estimatedCost(routeNode.path("estimatedCost").asInt(0))
                    .note(note)
                    .build());
        }
        log.info("[저장] day{}({}) {}개 route", dayNumber, date, seq - 1);
        return planDay;
    }

    // ──────────────────────────────────────────────
    //  헬퍼
    // ──────────────────────────────────────────────

    private String resolvePrevLastLocation(TravelPlan travel, int dayNumber) {
        if (dayNumber <= 1) return "";
        return planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber - 1)
                .map(d -> {
                    List<PlanRoute> routes = d.getRoutes();
                    if (routes.isEmpty()) return "";
                    return routes.get(routes.size() - 1).getToLocation().getName();
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
        if (cleaned.startsWith("```")) {
            int first = cleaned.indexOf('\n');
            int last  = cleaned.lastIndexOf("```");
            if (first > 0 && last > first)
                cleaned = cleaned.substring(first + 1, last).strip();
        }
        try { return objectMapper.readTree(cleaned); }
        catch (JacksonException e) {
            log.error("[JSON 파싱 실패] raw={}", raw, e);
            throw new IllegalStateException("Claude 응답 파싱 실패: " + e.getMessage(), e);
        }
    }

    private Location resolveLocation(JsonNode node, LocalDate date) {
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

        try {
            String query = address.isBlank() ? name : name + " " + address;
            List<GooglePlacesClient.GooglePlaceResult> results =
                    googlePlacesClient.searchText(query, aiLat, aiLng, 1);
            if (!results.isEmpty()) {
                GooglePlacesClient.GooglePlaceResult hit = results.get(0);
                lat = hit.lat(); lng = hit.lng(); realAddress = hit.address();
                source = LocationSource.GOOGLE;
                externalId = "google-" + name.replaceAll("\\s+", "-") + "-" + date;
                log.info("[Places] '{}' → ({}, {})", name, lat, lng);
            } else {
                log.warn("[Places] '{}' 결과없음 → AI 좌표 사용", name);
            }
        } catch (Exception e) {
            log.warn("[Places 실패] '{}' - AI 좌표 사용. {}", name, e.getMessage());
        }

        return locationRepository.save(Location.builder()
                .name(name).address(realAddress).lat(lat).lng(lng).type(type)
                .source(source).externalId(externalId).description(description)
                .build());
    }

    private String getAccommodationTypeLabel(String countryCode, int score) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        if (isJp) {
            if      (score >= 9) return "최고급 료칸·5성급";
            else if (score >= 7) return "고급 호텔·부티크 료칸";
            else if (score >= 4) return "비즈니스 호텔";
            else if (score >= 2) return "저가 비즈니스·게스트하우스";
            else                 return "캡슐호텔·도미토리";
        } else {
            if      (score >= 9) return "최고급 호텔·리조트";
            else if (score >= 7) return "고급 호텔";
            else if (score >= 4) return "일반 호텔";
            else if (score >= 2) return "모텔·게스트하우스";
            else                 return "저가 게스트하우스·도미토리";
        }
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
        return start.until(end).getDays() + 1;
    }

    private Integer nodeIntOrNull(JsonNode node, String field) {
        JsonNode n = node.path(field);
        return (n.isMissingNode() || n.isNull()) ? null : n.asInt();
    }
}
