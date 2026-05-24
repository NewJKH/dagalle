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
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

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
    //  Phase 1: 스켈레톤 초기화 (제목 + 렌트카 + 숙박)
    //  프론트에서 호출 → travelId 받아서 Day별 생성 시작
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse initSchedule(Long userId, AiGenerateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        int totalDays = (int) daysBetween(req.getStartDate(), req.getEndDate());
        log.info("[AI init] userId={}, {}→{}, {}~{} ({}일)", userId,
                req.getStartLocation(), req.getEndLocation(), req.getStartDate(), req.getEndDate(), totalDays);

        // 스켈레톤 생성
        String skeletonRaw = claudeApiClient.chat(
                buildSkeletonSystemPrompt(req.getCountryCode()),
                buildSkeletonUserMessage(req, totalDays));
        log.debug("[AI skeleton 응답] {}", skeletonRaw);
        JsonNode skeleton = parseJson(skeletonRaw);

        String title = skeleton.path("title").asText(req.getEndLocation() + " " + totalDays + "일 여행");
        String keywords = String.join(",", req.getKeywords());

        // TravelPlan 저장 (Day는 아직 없음)
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

        // 렌트카 저장
        JsonNode rentalNode = skeleton.path("rentalCar");
        if (req.isWithCar() && !rentalNode.isMissingNode() && !rentalNode.isNull()) {
            carRentalRepository.save(CarRental.builder()
                    .travelPlan(travel)
                    .carType(rentalNode.path("carType").asText(null))
                    .dailyRateKrw(nodeIntOrNull(rentalNode, "dailyRateKrw"))
                    .rentalDays(nodeIntOrNull(rentalNode, "rentalDays"))
                    .estimatedFuelKrw(nodeIntOrNull(rentalNode, "estimatedFuelKrw"))
                    .estimatedTollKrw(nodeIntOrNull(rentalNode, "estimatedTollKrw"))
                    .build());
            log.info("[AI 렌트카 저장] {}", rentalNode.path("carType").asText());
        }

        // 숙박 저장
        JsonNode accsNode = skeleton.path("accommodations");
        if (accsNode.isArray()) {
            for (JsonNode accNode : accsNode) {
                try {
                    accommodationRepository.save(Accommodation.builder()
                            .travelPlan(travel)
                            .hotelName(accNode.path("hotelName").asText("추천 숙소"))
                            .checkIn(LocalDate.parse(accNode.path("checkIn").asText()))
                            .checkOut(LocalDate.parse(accNode.path("checkOut").asText()))
                            .pricePerNightKrw(nodeIntOrNull(accNode, "pricePerNightKrw"))
                            .build());
                    log.info("[AI 숙박 저장] {}", accNode.path("hotelName").asText());
                } catch (Exception e) { log.warn("[AI 숙박 파싱 실패] {}", accNode); }
            }
        }

        log.info("[AI init 완료] travelId={}, title={}", travel.getId(), title);
        return TravelResponse.from(travel);
    }

    // ──────────────────────────────────────────────
    //  자유 입력 → AI 파싱 → 구조화 → initSchedule
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse initFromNaturalInput(Long userId, AiNaturalRequest req) {
        log.info("[AI natural] userId={}, input='{}'", userId, req.getNaturalInput());

        // Step 1: Claude로 자유 텍스트 → 구조화된 여행 정보 추출
        String systemPrompt =
                "반드시 JSON만 응답. 마크다운·코드블록 금지.\n" +
                "스키마: {\"endLocation\":\"여행지(한국어 도시명)\",\"countryCode\":\"JP|KR\"," +
                "\"withCar\":bool,\"theme\":\"테마(2~4단어)\",\"keywords\":[\"키워드\"]," +
                "\"tendency\":\"RELAX|BALANCED|ACTIVE\",\"memberCount\":숫자orNull," +
                "\"departureFlightTime\":\"HH:mm orNull\",\"arrivalAtDestTime\":\"HH:mm orNull\"," +
                "\"returnFlightTime\":\"HH:mm orNull\"}\n\n" +
                "규칙:\n" +
                "• endLocation: 도시/지역명만 (공항명 제외). 예: '벳푸', '오사카', '제주'\n" +
                "• withCar: '렌트카','자차','드라이브' 언급 시 true\n" +
                "• tendency: '빡빡','알차게','많이' → ACTIVE / '여유','천천히','힐링' → RELAX / 기본 BALANCED\n" +
                "• 시간·인원 언급 없으면 null\n" +
                "• keywords: 음식명·활동·키워드 배열 (최대 5개)";

        String userPrompt = String.format(
                "출발지: %s | 기간: %s ~ %s | 인원: %d명\n여행 설명: %s",
                req.getStartLocation(), req.getStartDate(), req.getEndDate(),
                req.getMemberCount(), req.getNaturalInput());

        String raw = claudeApiClient.chat(systemPrompt, userPrompt);
        log.debug("[AI natural 파싱 결과] {}", raw);
        JsonNode parsed = parseJson(raw);

        // Step 2: 파싱된 값 추출
        String endLocation   = parsed.path("endLocation").asText("도쿄");
        String countryCode   = parsed.path("countryCode").asText("JP");
        boolean withCar      = parsed.path("withCar").asBoolean(false);
        String theme         = nullableText(parsed, "theme");
        int memberCount      = parsed.path("memberCount").isMissingNode() || parsed.path("memberCount").isNull()
                ? req.getMemberCount()
                : parsed.path("memberCount").asInt(req.getMemberCount());
        String depTime  = nullableText(parsed, "departureFlightTime");
        String arrTime  = nullableText(parsed, "arrivalAtDestTime");
        String retTime  = nullableText(parsed, "returnFlightTime");

        List<String> keywords = new ArrayList<>();
        JsonNode kwNode = parsed.path("keywords");
        if (kwNode.isArray()) kwNode.forEach(kw -> keywords.add(kw.asText()));
        String tendencyStr = parsed.path("tendency").asText("BALANCED");

        // Step 3: AiGenerateRequest 직접 세팅 후 initSchedule 위임
        Tendency tendency;
        try { tendency = Tendency.valueOf(tendencyStr.toUpperCase()); }
        catch (Exception e) { tendency = Tendency.BALANCED; }

        AiGenerateRequest structuredReq = new AiGenerateRequest();
        structuredReq.setStartLocation(req.getStartLocation() != null ? req.getStartLocation() : "인천국제공항");
        structuredReq.setEndLocation(endLocation);
        structuredReq.setStartDate(req.getStartDate());
        structuredReq.setEndDate(req.getEndDate());
        structuredReq.setCountryCode(countryCode);
        structuredReq.setMemberCount(memberCount);
        structuredReq.setWithCar(withCar);
        structuredReq.setTendency(tendency);
        structuredReq.setTheme(theme);
        structuredReq.setKeywords(keywords);
        structuredReq.setDepartureFlightTime(depTime);
        structuredReq.setArrivalAtDestTime(arrTime);
        structuredReq.setReturnFlightTime(retTime);
        structuredReq.setFoodScore(req.getFoodScore());
        structuredReq.setAccommodationScore(req.getAccommodationScore());
        structuredReq.setExtremeScore(req.getExtremeScore());
        structuredReq.setTransportScore(req.getTransportScore());

        log.info("[AI natural → 구조화] 여행지={}, 렌트카={}, 테마={}, 키워드={}",
                endLocation, withCar, theme, keywords);
        return initSchedule(userId, structuredReq);
    }

    // ──────────────────────────────────────────────
    //  Phase 2: Day 단건 생성 (생성 or 재생성)
    // ──────────────────────────────────────────────

    @Transactional
    public PlanDayResponse generateDay(Long userId, Long travelId, int dayNumber) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        int totalDays = (int) daysBetween(travel.getStartDate(), travel.getEndDate());
        LocalDate date = travel.getStartDate().plusDays(dayNumber - 1);

        // 기존 Day 삭제 (재생성 시)
        planDayRepository.findByTravelPlanAndDayNumber(travel, dayNumber)
                .ifPresent(planDayRepository::delete);
        planDayRepository.flush();

        log.info("[AI generateDay] travelId={}, day={}/{}", travelId, dayNumber, totalDays);

        // 이전 Day 마지막 위치 파악 (동선 연속성)
        String prevLastLocation = resolvePrevLastLocation(travel, dayNumber);

        // 숙소 힌트
        String accommodationHint = accommodationRepository.findByTravelPlan(travel).stream()
                .map(a -> a.getHotelName() + "(" + a.getCheckIn() + "~" + a.getCheckOut() + ")")
                .reduce("", (a, b) -> a + b + " ");

        // 항공편 시간 힌트
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

        // flush + 1차 캐시 clear → JOIN FETCH로 재조회 (routes가 빈 리스트로 반환되는 Hibernate 캐시 버그 방지)
        entityManager.flush();
        entityManager.clear();
        // clear() 후 travel 엔티티가 detached 되므로 재조회
        TravelPlan travelFresh = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        return planDayRepository.findByTravelPlanAndDayNumber(travelFresh, dayNumber)
                .map(PlanDayResponse::from)
                .orElseThrow(() -> new IllegalStateException("Day 저장 후 조회 실패: day=" + dayNumber));
    }

    // ──────────────────────────────────────────────
    //  레거시 호환: 전체 일괄 생성 (구버전 호출 시 fallback)
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse generateSchedule(Long userId, AiGenerateRequest req) {
        TravelResponse init = initSchedule(userId, req);
        int totalDays = (int) daysBetween(req.getStartDate(), req.getEndDate());
        for (int d = 1; d <= totalDays; d++) {
            generateDay(userId, init.getId(), d);
        }
        return init;
    }

    // ──────────────────────────────────────────────
    //  빈 시간 채우기
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
            String note = routeNode.path("note").isMissingNode() ? null : routeNode.path("note").asText(null);
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
        log.info("[AI day{} 저장] {}개 route", dayNumber, seq - 1);
        return planDay;
    }

    // ──────────────────────────────────────────────
    //  프롬프트 빌더
    // ──────────────────────────────────────────────

    private static final String SKELETON_SCHEMA =
            """
            {"title":"여행 제목","rentalCar":{"carType":"차종","dailyRateKrw":숫자,"rentalDays":숫자,"estimatedFuelKrw":숫자,"estimatedTollKrw":숫자},"accommodations":[{"hotelName":"호텔명","checkIn":"YYYY-MM-DD","checkOut":"YYYY-MM-DD","pricePerNightKrw":숫자}]}
            """;

    private static final String DAY_SCHEMA =
            """
            {"dayNumber":숫자,"date":"YYYY-MM-DD","routes":[{"fromLocation":{"name":"장소명","address":"주소","lat":위도,"lng":경도,"type":"RESTAURANT|CAFE|HOTEL|STATION|AIRPORT|SHOPPING|MUSEUM|PARK|ETC","description":"장소설명"},"toLocation":{"name":"장소명","address":"주소","lat":위도,"lng":경도,"type":"...","description":"장소설명"},"transport":"CAR|WALK|SUBWAY|BUS|TRAIN","departureTime":"HH:mm","durationMinutes":숫자,"estimatedCost":숫자,"note":"이동수단 상세설명"}]}
            """;

    private String buildSkeletonSystemPrompt(String countryCode) {
        String base = "반드시 JSON만 응답. 마크다운·코드블록 금지.\n스키마: " + SKELETON_SCHEMA.strip();
        if ("JP".equalsIgnoreCase(countryCode)) {
            return base + "\n일본 렌트카(경차 5000~8000엔/일, 하이브리드 7000~10000엔/일, 1엔=9원), 숙박(도심 8000~15000엔/박, 1엔=9원). withCar=false면 rentalCar=null.";
        }
        return base + "\n한국 렌트카/호텔 시세 기준. withCar=false면 rentalCar=null.";
    }

    private String buildSkeletonUserMessage(AiGenerateRequest req, int totalDays) {
        // 숙박 점수 → 구체적 등급 지시 (스켈레톤에서 숙소 선정 시 반드시 준수)
        int accScore = req.getAccommodationScore();
        String accConstraint;
        if ("JP".equalsIgnoreCase(req.getCountryCode())) {
            if (accScore >= 9)      accConstraint = "최고급 료칸·5성급 호텔 필수(1박 30,000엔 이상)";
            else if (accScore >= 7) accConstraint = "고급 호텔·부티크 료칸(1박 15,000~30,000엔)";
            else if (accScore >= 4) accConstraint = "일반 비즈니스 호텔(1박 8,000~15,000엔)";
            else if (accScore >= 2) accConstraint = "저가 비즈니스 호텔·게스트하우스(1박 4,000~8,000엔)";
            else                    accConstraint = "최저가 캡슐호텔·도미토리(1박 2,000~4,000엔)";
        } else {
            if (accScore >= 9)      accConstraint = "최고급 호텔·리조트(1박 30만원 이상)";
            else if (accScore >= 7) accConstraint = "고급 호텔(1박 15~30만원)";
            else if (accScore >= 4) accConstraint = "일반 호텔(1박 8~15만원)";
            else if (accScore >= 2) accConstraint = "모텔·게스트하우스(1박 4~8만원)";
            else                    accConstraint = "최저가 게스트하우스·도미토리(1박 2~4만원)";
        }
        return String.format(
                "여행지:%s(%s) 기간:%s~%s(%d일) 인원:%d명 테마:%s 이동:%s 예산:%s\n" +
                "【숙박 등급 강제】숙박점수=%d/10 → %s. 이 등급 외 숙소 추천 절대 금지.\n" +
                "제목·렌트카·숙박만 JSON으로. 일정 포함 금지.",
                req.getEndLocation(), req.getCountryCode(),
                req.getStartDate(), req.getEndDate(), totalDays, req.getMemberCount(),
                req.getTheme() != null ? req.getTheme() : "일반관광",
                req.isWithCar() ? "렌트카" : "대중교통",
                req.getBudgetTotal() != null ? req.getBudgetTotal() + "원" : "제한없음",
                accScore, accConstraint);
    }

    private String buildDaySystemPrompt(String countryCode,
                                        int foodScore, int accommodationScore,
                                        int extremeScore, int transportScore) {
        String base = "반드시 JSON만 응답. 마크다운·코드블록 금지.\n스키마: " + DAY_SCHEMA.strip();

        String transportRules =
                "\n\n【교통수단 선택 규칙 - 반드시 준수】\n" +
                "• WALK: 직선거리 1km 이하 OR 도보 15분 이하인 모든 구간. 렌트카 여행이어도 예외 없음.\n" +
                "• CAR: 직선거리 3km 초과 구간, 도시 외곽 이동, 드라이브 코스. 절대 단거리에 사용 금지.\n" +
                "• 렌트카 여행 동선 원칙: 주차장에 차를 세우고 주변 여러 곳을 걸어서 이동 후 다음 지역으로 차로 이동.\n" +
                "• 관광지 밀집 구역(도보 이동 가능 반경) 내 구간은 무조건 WALK.\n" +
                "• WALK: estimatedCost=0, durationMinutes=도보 시간.\n" +
                "• 하루 동선에 WALK 구간 최소 1개 이상 포함.\n" +
                "• BUS/TRAIN: 공항↔도시 간 이동, 렌트카 없는 여행의 도시 간 이동에 사용.";

        String descriptionRules =
                "\n\n【장소 description 작성 규칙 - 반드시 포함】\n" +
                "• RESTAURANT/CAFE: '대표메뉴명(가격대), 특징, 추천포인트' 형식으로 2~3문장.\n" +
                "• MUSEUM/PARK/SHOPPING: 주요 볼거리·체험 내용·입장료 포함 1~2문장.\n" +
                "• HOTEL/STATION/AIRPORT: 간단한 특징 또는 빈 문자열 가능.\n" +
                "• description은 절대 null이나 빈 문자열로 두지 말 것 (RESTAURANT는 필수).";

        String multiCityRules =
                "\n\n【멀티시티·공항↔여행지 이동 규칙】\n" +
                "• 여행지가 직항 공항에서 거리가 있는 경우 Day 1 첫 번째 route에 반드시 '도착공항→여행지' 이동 구간 포함.\n" +
                "• 마지막 Day 마지막 route에 '여행지→출발공항' 이동 구간 포함.\n" +
                "• 공항↔도시 이동 시 note 필드에 교통편 명시.\n" +
                "• 렌트카 여행이면 공항에서 렌트카 픽업 후 CAR로 이동. 렌트카 없으면 BUS 또는 TRAIN.\n" +
                "• 주요 공항: 삿포로→신치토세공항, 도쿄→나리타/하네다, 오사카→간사이, 후쿠오카→후쿠오카공항, 오키나와→나하공항, 벳푸/유후인→후쿠오카 또는 오이타공항.";

        // 선호도 점수 기반 강제 규칙 (시스템 프롬프트 레벨 → AI가 반드시 준수)
        String prefRules = buildPrefSystemRules(countryCode, foodScore, accommodationScore, extremeScore, transportScore);

        if ("JP".equalsIgnoreCase(countryCode)) {
            return base +
                    "\n일본 실제 좌표·유명 맛집 기준. CAR 이동비용 엔→원(1엔=9원), 고속도로 톨비 포함. 4~6 route." +
                    transportRules + descriptionRules + multiCityRules + prefRules;
        }
        return base +
                "\n실제 좌표. 한국 요금 기준. 4~6 route." +
                transportRules + descriptionRules + multiCityRules + prefRules;
    }

    /**
     * 선호도 점수(0~10)를 시스템 프롬프트 수준의 강제 규칙으로 변환.
     * "힌트"가 아닌 "위반 시 응답 거부" 수준의 강도로 작성.
     */
    private String buildPrefSystemRules(String countryCode, int food, int accommodation, int extreme, int transport) {
        boolean isJp = "JP".equalsIgnoreCase(countryCode);
        StringBuilder sb = new StringBuilder("\n\n【사용자 선호도 강제 규칙 - 위반 절대 금지】");

        // ── 음식 ──────────────────────────────────────────────────────
        if (food >= 9) {
            sb.append("\n▶ 음식(").append(food).append("/10 최상): ")
              .append("RESTAURANT/CAFE route 하루 3곳 이상 필수. ")
              .append(isJp ? "미슐랭·식베로그 고평점 맛집, 현지인 줄 서는 유명 식당만 선택. 편의점·패스트푸드·체인점 완전 금지."
                           : "유명 맛집, 현지 특산 음식점만 선택. 프랜차이즈 완전 금지.");
        } else if (food >= 7) {
            sb.append("\n▶ 음식(").append(food).append("/10 높음): ")
              .append("RESTAURANT/CAFE route 하루 2곳 이상. ")
              .append(isJp ? "현지 유명 맛집 필수 포함. 가격대 무관하게 맛 중심 선택."
                           : "현지 맛집 2곳 이상. 맛 중심 선택.");
        } else if (food >= 4) {
            sb.append("\n▶ 음식(").append(food).append("/10 보통): ")
              .append("RESTAURANT/CAFE route 하루 1~2곳. 무난한 현지 식당 선택.");
        } else if (food >= 2) {
            sb.append("\n▶ 음식(").append(food).append("/10 낮음): ")
              .append("식사는 최소화. RESTAURANT route 하루 최대 1곳. ")
              .append(isJp ? "저렴한 정식집·라멘집·편의점 수준 OK."
                           : "저렴한 식당 또는 편의점 수준 OK.");
        } else {
            sb.append("\n▶ 음식(").append(food).append("/10 최하): ")
              .append("RESTAURANT/CAFE type route 생성 금지. 식사는 이동 중 편의점으로 해결하는 것으로 가정. ")
              .append("식당 방문 일정 포함 절대 금지.");
        }

        // ── 숙박 (Day 동선에 hotel 관련 이동이 생기는 경우) ──────────
        if (accommodation >= 8) {
            sb.append("\n▶ 숙박(").append(accommodation).append("/10 높음): ")
              .append(isJp ? "숙소 이동 route에 료칸·5성급 호텔만 언급. 비즈니스 호텔·게스트하우스 언급 금지."
                           : "숙소 이동 route에 고급 리조트·5성급 호텔만 언급.");
        } else if (accommodation <= 2) {
            sb.append("\n▶ 숙박(").append(accommodation).append("/10 낮음): ")
              .append(isJp ? "숙소 이동 route에 게스트하우스·캡슐호텔·저가 비즈니스 호텔만 언급. 고급 호텔·료칸 언급 금지."
                           : "숙소 이동 route에 게스트하우스·모텔·저가 호텔만 언급. 고급 호텔 언급 금지.");
        }

        // ── 익스트림/액티비티 ─────────────────────────────────────────
        if (extreme >= 8) {
            sb.append("\n▶ 액티비티(").append(extreme).append("/10 높음): ")
              .append("하이킹·래프팅·스카이다이빙·스키·서핑·ATV 등 체험형 액티비티 route 1개 이상 필수. ")
              .append("미술관·박물관만 있는 일정은 불가.");
        } else if (extreme >= 5) {
            sb.append("\n▶ 액티비티(").append(extreme).append("/10 보통): ")
              .append("가벼운 체험(온천 체험·쿠킹클래스·자전거 투어 등) 1개 포함 권장.");
        } else if (extreme <= 2) {
            sb.append("\n▶ 액티비티(").append(extreme).append("/10 낮음): ")
              .append("스포츠·어드벤처·체험형 액티비티 route 생성 금지. ")
              .append("관광지·미술관·카페·쇼핑·공원 위주 편안한 일정만 구성.");
        }

        // ── 이동/교통 ────────────────────────────────────────────────
        if (transport >= 8) {
            sb.append("\n▶ 이동(").append(transport).append("/10 높음): ")
              .append(isJp ? "신칸센·특급열차·야간버스·페리 등 이동 자체가 볼거리인 route 포함 권장. 이동 시간이 길어도 OK."
                           : "KTX·관광열차·해상 페리 등 경치 좋은 이동 route 포함 권장.");
        } else if (transport <= 2) {
            sb.append("\n▶ 이동(").append(transport).append("/10 낮음): ")
              .append("이동 최소화 필수. 하루 총 이동시간 합계 90분 이하 목표. ")
              .append("한 구역(반경 2km) 내에서 여러 장소를 도보로 이동하는 동선으로 구성. ")
              .append("먼 거리 이동 route 생성 금지.");
        }

        return sb.toString();
    }

    private String buildDayUserMessage(TravelPlan travel, int dayNum, int totalDays,
                                       LocalDate date, String prevLocation,
                                       String accommodationHint, String flightHint) {
        String keywords = travel.getKeywords() != null ? travel.getKeywords() : "";
        String theme    = travel.getTheme()    != null ? travel.getTheme()    : "일반 관광";
        String transport = travel.isWithCar()
                ? "렌트카(장거리 CAR, 근거리·관광지 내 이동은 WALK 필수)"
                : "대중교통(SUBWAY/BUS/TRAIN, 도보 가능 거리는 WALK)";

        return String.format(
                "여행지:%s | %d일차/%d일 | 날짜:%s | 인원:%d명 | 이동:%s | 테마:%s | 키워드:%s\n" +
                "이전날 마지막 위치:%s | 숙소:%s | %s\n" +
                "선호도점수(시스템규칙참조) 음식:%d 숙박:%d 익스트림:%d 이동:%d\n" +
                "%d일차 하루 동선만 JSON으로. routes만 포함, 4~6개.",
                travel.getEndLocation(), dayNum, totalDays, date,
                travel.getMemberCount() != null ? travel.getMemberCount() : 2,
                transport, theme,
                keywords.isEmpty() ? "없음" : keywords,
                prevLocation.isEmpty() ? "미정" : prevLocation,
                accommodationHint.isEmpty() ? "미정" : accommodationHint,
                flightHint,
                travel.getFoodScore(), travel.getAccommodationScore(),
                travel.getExtremeScore(), travel.getTransportScore(),
                dayNum);
    }

    private String buildFlightHint(TravelPlan travel, int dayNum, int totalDays) {
        if (dayNum == 1) {
            StringBuilder sb = new StringBuilder();
            if (travel.getArrivalAtDestTime() != null) {
                sb.append("현지 공항 도착 시각: ").append(travel.getArrivalAtDestTime()).append(". ");
            }
            sb.append("Day 1 첫 route는 반드시 도착 공항 → 여행지(").append(travel.getEndLocation())
              .append(") 이동 구간 포함. 여행지가 공항에서 멀면 BUS/TRAIN/CAR로 이동 경로 추가.");
            return sb.toString();
        }
        if (dayNum == totalDays && travel.getReturnFlightTime() != null) {
            return "마지막날 " + travel.getReturnFlightTime() + " 이전 공항 도착 필요. " +
                   "마지막 route는 여행지 → 출발 공항 이동 구간 포함.";
        }
        return "";
    }

    private String buildFillSystemPrompt() {
        return "반드시 JSON만 응답.\n스키마:{\"places\":[{\"name\":\"장소명\",\"address\":\"주소\",\"lat\":위도,\"lng\":경도,\"type\":\"RESTAURANT|CAFE|PARK|MUSEUM|SHOPPING|ETC\",\"description\":\"2줄이내\",\"stayMinutes\":숫자}]}\n3~5개, 실제 좌표.";
    }

    private String buildFillUserMessage(AiFillRequest req) {
        return String.format("현재위치:%s | 빈시간:%s~%s\nJSON으로 장소 추천.",
                req.getCurrentLocation(), req.getFreeTimeStart(), req.getFreeTimeEnd());
    }

    // ──────────────────────────────────────────────
    //  헬퍼
    // ──────────────────────────────────────────────

    /** 이전 Day 마지막 도착지 이름 반환 (동선 연속성) */
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
            log.error("[AI JSON 파싱 실패] raw={}", raw, e);
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

        // Google Places API로 실제 좌표 조회 (AI 할루시네이션 방지)
        double lat = aiLat;
        double lng = aiLng;
        String realAddress = address;
        LocationSource source = LocationSource.AI;
        String externalId = "ai-" + name.replaceAll("\\s+", "-") + "-" + date;

        try {
            String query = address.isBlank() ? name : name + " " + address;
            List<GooglePlacesClient.GooglePlaceResult> results =
                    googlePlacesClient.searchText(query, aiLat, aiLng, 1);
            if (!results.isEmpty()) {
                GooglePlacesClient.GooglePlaceResult hit = results.get(0);
                lat         = hit.lat();
                lng         = hit.lng();
                realAddress = hit.address();
                source      = LocationSource.GOOGLE;
                externalId  = "google-" + name.replaceAll("\\s+", "-") + "-" + date;
                log.info("[Places API] '{}' → 실좌표 ({}, {}), 주소: {}", name, lat, lng, realAddress);
            } else {
                log.warn("[Places API] '{}' 검색 결과 없음 → AI 좌표 사용 ({}, {})", name, aiLat, aiLng);
            }
        } catch (Exception e) {
            log.warn("[Places API 실패] '{}' - AI 좌표 사용. 원인: {}", name, e.getMessage());
        }

        return locationRepository.save(Location.builder()
                .name(name).address(realAddress).lat(lat).lng(lng).type(type)
                .source(source)
                .externalId(externalId)
                .description(description)
                .build());
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

    private String nullableText(JsonNode node, String field) {
        JsonNode n = node.path(field);
        if (n.isMissingNode() || n.isNull()) return null;
        String text = n.asText("").trim();
        return text.isEmpty() || "null".equalsIgnoreCase(text) ? null : text;
    }
}
