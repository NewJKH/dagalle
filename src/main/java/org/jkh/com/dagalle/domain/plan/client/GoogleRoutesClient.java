package org.jkh.com.dagalle.domain.plan.client;

import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.time.LocalDateTime;
import java.time.ZoneId;
import java.time.format.DateTimeFormatter;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/**
 * Google Routes API v2 호출 전담 컴포넌트.
 * <p>
 * POST https://routes.googleapis.com/directions/v2:computeRoutes
 * Header: X-Goog-Api-Key, X-Goog-FieldMask
 */
@Slf4j
@Component
public class GoogleRoutesClient {

    private static final String ROUTES_BASE_URL = "https://routes.googleapis.com";
    private static final String ROUTES_URI = "/directions/v2:computeRoutes";
    private static final String FIELD_MASK = "routes.duration,routes.distanceMeters";

    private final RestClient restClient;
    private final String apiKey;

    public GoogleRoutesClient(@Value("${external-api.google.key}") String apiKey) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl(ROUTES_BASE_URL)
                .build();
    }

    /**
     * 두 좌표 간 이동 정보를 반환합니다.
     *
     * @param fromLat       출발지 위도
     * @param fromLng       출발지 경도
     * @param toLat         도착지 위도
     * @param toLng         도착지 경도
     * @param transport     이동수단
     * @param departureTime 출발 시각 (TRANSIT일 때 필수, null이면 현재 시각 사용)
     * @return 거리(km)와 이동시간(분). API 실패 시 null 반환.
     */
    public RouteResult computeRoute(double fromLat, double fromLng,
                                    double toLat, double toLng,
                                    TransportType transport,
                                    LocalDateTime departureTime) {
        try {
            String travelMode = toTravelMode(transport);
            Map<String, Object> body = buildBody(fromLat, fromLng, toLat, toLng, travelMode, transport, departureTime);

            Map<String, Object> response = restClient.post()
                    .uri(ROUTES_URI)
                    .header("X-Goog-Api-Key", apiKey)
                    .header("X-Goog-FieldMask", FIELD_MASK)
                    .contentType(MediaType.APPLICATION_JSON)
                    .body(body)
                    .retrieve()
                    .body(Map.class);

            return parseResponse(response);

        } catch (Exception e) {
            log.warn("Google Routes API 호출 실패: {}", e.getMessage());
            return null;
        }
    }

    @SuppressWarnings("unchecked")
    private RouteResult parseResponse(Map<String, Object> response) {
        if (response == null) return null;
        List<Map<String, Object>> routes = (List<Map<String, Object>>) response.get("routes");
        if (routes == null || routes.isEmpty()) return null;

        Map<String, Object> route = routes.get(0);

        // distanceMeters → km
        Number distMeters = (Number) route.get("distanceMeters");
        double distanceKm = distMeters != null ? distMeters.doubleValue() / 1000.0 : 0;

        // duration: "123s" 형태 → 분
        String durationStr = (String) route.get("duration");
        int durationMinutes = 0;
        if (durationStr != null && durationStr.endsWith("s")) {
            int seconds = Integer.parseInt(durationStr.replace("s", ""));
            durationMinutes = (int) Math.ceil(seconds / 60.0);
        }

        return new RouteResult(distanceKm, durationMinutes);
    }

    private Map<String, Object> buildBody(double fromLat, double fromLng,
                                          double toLat, double toLng,
                                          String travelMode, TransportType transport,
                                          LocalDateTime departureTime) {
        Map<String, Object> origin = Map.of(
                "location", Map.of("latLng", Map.of("latitude", fromLat, "longitude", fromLng))
        );
        Map<String, Object> destination = Map.of(
                "location", Map.of("latLng", Map.of("latitude", toLat, "longitude", toLng))
        );

        Map<String, Object> body = new HashMap<>();
        body.put("origin", origin);
        body.put("destination", destination);
        body.put("travelMode", travelMode);

        // TRANSIT: departureTime 필수 (없으면 현재 시각 사용)
        if ("TRANSIT".equals(travelMode)) {
            LocalDateTime dt = departureTime != null ? departureTime : LocalDateTime.now();
            String rfc3339 = dt.atZone(ZoneId.of("Asia/Tokyo"))
                    .format(DateTimeFormatter.ISO_OFFSET_DATE_TIME);
            body.put("departureTime", rfc3339);
            // allowedTravelModes 제한 없이 모든 대중교통 허용 (지하철/버스/기차 통합)
        }

        return body;
    }

    /** TransportType → Google Routes API travelMode 매핑 */
    private String toTravelMode(TransportType transport) {
        return switch (transport) {
            case CAR -> "DRIVE";
            case WALK -> "WALK";
            case SUBWAY, BUS, TRAIN -> "TRANSIT";
        };
    }

    /** 대중교통 세부 수단 선호도 설정 */
    private Map<String, Object> transitPreferences(TransportType transport) {
        List<String> modes = switch (transport) {
            case SUBWAY -> List.of("SUBWAY", "RAIL");
            case BUS -> List.of("BUS");
            case TRAIN -> List.of("RAIL", "HIGH_SPEED_RAIL");
            default -> List.of();
        };
        if (modes.isEmpty()) return Map.of();
        return Map.of("allowedTravelModes", modes);
    }

    public record RouteResult(double distanceKm, int durationMinutes) {}
}
