package org.jkh.com.dagalle.domain.ai.service;

import tools.jackson.core.JacksonException;
import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.domain.ai.client.ClaudeApiClient;
import org.jkh.com.dagalle.domain.ai.dto.AiFillRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiGenerateRequest;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.jkh.com.dagalle.domain.plan.entity.PlanDay;
import org.jkh.com.dagalle.domain.plan.entity.PlanRoute;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.jkh.com.dagalle.domain.plan.repository.PlanDayRepository;
import org.jkh.com.dagalle.domain.plan.repository.PlanRouteRepository;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    private final ClaudeApiClient claudeApiClient;
    private final UserRepository userRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final PlanDayRepository planDayRepository;
    private final PlanRouteRepository planRouteRepository;
    private final LocationRepository locationRepository;
    private final ObjectMapper objectMapper;

    // ──────────────────────────────────────────────
    //  일정 생성
    // ──────────────────────────────────────────────

    @Transactional
    public TravelResponse generateSchedule(Long userId, AiGenerateRequest req) {
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new IllegalArgumentException("사용자를 찾을 수 없습니다. id=" + userId));

        // 1. Claude에게 일정 JSON 요청
        String systemPrompt = buildGenerateSystemPrompt();
        String userMessage  = buildGenerateUserMessage(req);

        log.info("[AI 일정 생성] userId={}, {}→{}, {}~{}",
                userId, req.getStartLocation(), req.getEndLocation(),
                req.getStartDate(), req.getEndDate());

        String rawResponse = claudeApiClient.chat(systemPrompt, userMessage);
        log.debug("[AI 응답 원문] {}", rawResponse);

        // 2. JSON 파싱
        JsonNode schedule = parseJson(rawResponse);

        // 3. TravelPlan 저장
        String title = schedule.path("title").asText(
                req.getEndLocation() + " " + daysBetween(req.getStartDate(), req.getEndDate()) + "일 여행");

        TravelPlan travelPlan = TravelPlan.builder()
                .owner(user)
                .title(title)
                .startLocation(req.getStartLocation())
                .endLocation(req.getEndLocation())
                .startDate(req.getStartDate())
                .endDate(req.getEndDate())
                .build();
        travelPlan.markAiGenerated();
        travelPlanRepository.save(travelPlan);

        // owner를 TravelMember로 등록 — 없으면 이후 권한 체크에서 TRAVEL_ACCESS_DENIED 발생
        TravelMember ownerMember = TravelMember.builder()
                .travelPlan(travelPlan)
                .user(user)
                .role(MemberRole.OWNER)
                .build();
        travelMemberRepository.save(ownerMember);

        // 4. PlanDay + PlanRoute 저장
        JsonNode days = schedule.path("days");
        for (JsonNode dayNode : days) {
            int dayNumber = dayNode.path("dayNumber").asInt(1);
            String dateStr = dayNode.path("date").asText(req.getStartDate().plusDays(dayNumber - 1).toString());
            LocalDate date = LocalDate.parse(dateStr);

            PlanDay planDay = PlanDay.builder()
                    .travelPlan(travelPlan)
                    .dayNumber(dayNumber)
                    .date(date)
                    .build();
            planDayRepository.save(planDay);

            JsonNode routes = dayNode.path("routes");
            int seq = 1;
            for (JsonNode routeNode : routes) {
                Location from = resolveLocation(routeNode.path("fromLocation"), date);
                Location to   = resolveLocation(routeNode.path("toLocation"),   date);

                TransportType transport = parseTransport(routeNode.path("transport").asText("WALK"));
                LocalDateTime departureTime = parseDepartureTime(
                        date, routeNode.path("departureTime").asText("09:00"));
                int durationMinutes = routeNode.path("durationMinutes").asInt(30);
                int estimatedCost   = routeNode.path("estimatedCost").asInt(0);

                PlanRoute planRoute = PlanRoute.builder()
                        .planDay(planDay)
                        .sequence(seq++)
                        .fromLocation(from)
                        .toLocation(to)
                        .transport(transport)
                        .departureTime(departureTime)
                        .durationMinutes(durationMinutes)
                        .estimatedCost(estimatedCost)
                        .build();
                planRouteRepository.save(planRoute);
            }
        }

        return TravelResponse.from(travelPlan);
    }

    // ──────────────────────────────────────────────
    //  빈 시간 채우기
    // ──────────────────────────────────────────────

    public List<Map<String, Object>> fillFreeTime(Long userId, Long travelId,
                                                   Integer dayNumber, AiFillRequest req) {
        String systemPrompt = buildFillSystemPrompt();
        String userMessage  = buildFillUserMessage(req);

        log.info("[AI 빈시간 채우기] travelId={}, day={}, {}~{}",
                travelId, dayNumber, req.getFreeTimeStart(), req.getFreeTimeEnd());

        String rawResponse = claudeApiClient.chat(systemPrompt, userMessage);
        log.debug("[AI 빈시간 응답 원문] {}", rawResponse);

        JsonNode recommendations = parseJson(rawResponse);
        List<Map<String, Object>> result = new ArrayList<>();

        JsonNode places = recommendations.path("places");
        for (JsonNode place : places) {
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
    //  프롬프트 빌더
    // ──────────────────────────────────────────────

    private String buildGenerateSystemPrompt() {
        return """
                당신은 한국 최고의 여행 일정 전문가입니다.
                사용자의 요청을 받아 **반드시 JSON만** 응답하세요. 마크다운, 설명 텍스트, 코드 블록(```) 없이 순수 JSON만 출력하세요.

                응답 JSON 스키마:
                {
                  "title": "여행 제목",
                  "days": [
                    {
                      "dayNumber": 1,
                      "date": "YYYY-MM-DD",
                      "routes": [
                        {
                          "fromLocation": {
                            "name": "장소명",
                            "address": "도로명 주소",
                            "lat": 위도(소수점 4자리),
                            "lng": 경도(소수점 4자리),
                            "type": "BEACH|MOUNTAIN|PARK|MUSEUM|RESTAURANT|CAFE|HOTEL|STATION|AIRPORT|SHOPPING|ETC"
                          },
                          "toLocation": {
                            "name": "장소명",
                            "address": "도로명 주소",
                            "lat": 위도,
                            "lng": 경도,
                            "type": "..."
                          },
                          "transport": "CAR|WALK|SUBWAY|BUS|TRAIN",
                          "departureTime": "HH:mm",
                          "durationMinutes": 이동시간(분),
                          "estimatedCost": 예상비용(원, 숫자만)
                        }
                      ]
                    }
                  ]
                }

                규칙:
                - 위도/경도는 실제 좌표를 사용하세요 (한국 내 관광지 기준).
                - routes 배열에서 첫 번째 route의 fromLocation은 숙소 또는 출발지, toLocation은 첫 방문지입니다.
                - 각 day마다 최소 4개 이상의 route를 포함하세요.
                - 이동 비용은 실제 대중교통/택시 요금 기준으로 책정하세요.
                """;
    }

    private String buildGenerateUserMessage(AiGenerateRequest req) {
        String tendencyDesc = switch (req.getTendency()) {
            case RELAX    -> "여유롭게 (하루 2~3곳, 충분한 휴식 포함)";
            case BALANCED -> "균형있게 (하루 4~5곳, 관광과 휴식 혼합)";
            case ACTIVE   -> "빡빡하게 (하루 6곳 이상, 최대한 많은 명소)";
        };

        return String.format("""
                다음 조건으로 여행 일정을 JSON으로 만들어주세요:
                - 출발지: %s
                - 여행지: %s
                - 시작일: %s
                - 종료일: %s
                - 여행 스타일: %s
                - 인원수: %d명

                실제 존재하는 유명 관광지, 맛집, 카페를 포함해주세요.
                위도/경도는 정확한 실좌표를 사용해주세요.
                JSON만 응답하세요.
                """,
                req.getStartLocation(),
                req.getEndLocation(),
                req.getStartDate(),
                req.getEndDate(),
                tendencyDesc,
                req.getMemberCount()
        );
    }

    private String buildFillSystemPrompt() {
        return """
                당신은 여행지 추천 전문가입니다.
                사용자의 빈 시간대와 현재 위치를 받아 **반드시 JSON만** 응답하세요.

                응답 JSON 스키마:
                {
                  "places": [
                    {
                      "name": "장소명",
                      "address": "도로명 주소",
                      "lat": 위도,
                      "lng": 경도,
                      "type": "BEACH|MOUNTAIN|PARK|MUSEUM|RESTAURANT|CAFE|HOTEL|STATION|AIRPORT|SHOPPING|ETC",
                      "description": "장소 간단 설명 (2줄 이내)",
                      "stayMinutes": 권장 체류 시간(분)
                    }
                  ]
                }

                규칙: 3~5개의 장소를 추천하고, 위도/경도는 실제 좌표를 사용하세요.
                """;
    }

    private String buildFillUserMessage(AiFillRequest req) {
        return String.format("""
                현재 위치: %s
                빈 시간대: %s ~ %s

                이 시간에 방문하기 좋은 장소를 JSON으로 추천해주세요.
                JSON만 응답하세요.
                """,
                req.getCurrentLocation(),
                req.getFreeTimeStart(),
                req.getFreeTimeEnd()
        );
    }

    // ──────────────────────────────────────────────
    //  헬퍼 메서드
    // ──────────────────────────────────────────────

    private JsonNode parseJson(String raw) {
        // Claude가 가끔 ```json ... ``` 마크다운 블록으로 감싸는 경우 제거
        String cleaned = raw.strip();
        if (cleaned.startsWith("```")) {
            int firstNewline = cleaned.indexOf('\n');
            int lastBacktick = cleaned.lastIndexOf("```");
            if (firstNewline > 0 && lastBacktick > firstNewline) {
                cleaned = cleaned.substring(firstNewline + 1, lastBacktick).strip();
            }
        }
        try {
            return objectMapper.readTree(cleaned);
        } catch (JacksonException e) {
            log.error("[AI JSON 파싱 실패] raw={}", raw, e);
            throw new IllegalStateException("Claude 응답을 JSON으로 파싱할 수 없습니다: " + e.getMessage(), e);
        }
    }

    private Location resolveLocation(JsonNode node, LocalDate date) {
        String name    = node.path("name").asText("알 수 없는 장소");
        String address = node.path("address").asText("");
        double lat     = node.path("lat").asDouble(37.5665);   // 기본값: 서울시청
        double lng     = node.path("lng").asDouble(126.9780);
        LocationType type = parseLocationType(node.path("type").asText("ETC"));

        // 중복 저장 방지: 같은 이름+위도+경도면 기존 Location 재사용
        // (간단 구현 — 실서비스에서는 externalId 기반으로 캐싱)
        Location location = Location.builder()
                .name(name)
                .address(address)
                .lat(lat)
                .lng(lng)
                .type(type)
                .source(LocationSource.AI)
                .externalId("ai-" + name.replaceAll("\\s+", "-") + "-" + date)
                .build();
        return locationRepository.save(location);
    }

    private LocationType parseLocationType(String raw) {
        try {
            return LocationType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return LocationType.ETC;
        }
    }

    private TransportType parseTransport(String raw) {
        try {
            return TransportType.valueOf(raw.toUpperCase());
        } catch (IllegalArgumentException e) {
            return TransportType.WALK;
        }
    }

    private LocalDateTime parseDepartureTime(LocalDate date, String timeStr) {
        try {
            LocalTime time = LocalTime.parse(timeStr, DateTimeFormatter.ofPattern("HH:mm"));
            return date.atTime(time);
        } catch (Exception e) {
            return date.atTime(9, 0);
        }
    }

    private long daysBetween(LocalDate start, LocalDate end) {
        return start.until(end).getDays() + 1;
    }
}
