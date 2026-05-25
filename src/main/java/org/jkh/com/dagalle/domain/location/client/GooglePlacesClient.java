package org.jkh.com.dagalle.domain.location.client;

import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClient;

import java.util.List;
import java.util.Map;

/**
 * Google Places API (New) 호출 전담 컴포넌트.
 * <p>
 * POST https://places.googleapis.com/v1/places:searchText
 * Header: X-Goog-Api-Key, X-Goog-FieldMask
 */
@Slf4j
@Component
public class GooglePlacesClient {

    private static final String PLACES_SEARCH_URI = "/places:searchText";
    private static final String FIELD_MASK =
            "places.id,places.displayName,places.formattedAddress," +
            "places.location,places.types,places.rating,places.userRatingCount," +
            "places.currentOpeningHours.openNow";

    private final RestClient restClient;
    private final String apiKey;

    public GooglePlacesClient(
            @Value("${external-api.google.key}") String apiKey,
            @Value("${external-api.google.places-url}") String placesUrl
    ) {
        this.apiKey = apiKey;
        this.restClient = RestClient.builder()
                .baseUrl(placesUrl)
                .build();
    }

    /**
     * 텍스트 검색으로 장소 목록을 반환합니다.
     *
     * @param query  검색어 (예: "신주쿠 라멘")
     * @param lat    현재 위도 (검색 편향용)
     * @param lng    현재 경도 (검색 편향용)
     * @param limit  최대 결과 수 (최대 20)
     * @return Google Places 응답 파싱 결과
     */
    @SuppressWarnings("unchecked")
    public List<GooglePlaceResult> searchText(String query, Double lat, Double lng, int limit) {
        Map<String, Object> body = buildRequestBody(query, lat, lng, limit);

        Map<String, Object> response = restClient.post()
                .uri(PLACES_SEARCH_URI)
                .header("X-Goog-Api-Key", apiKey)
                .header("X-Goog-FieldMask", FIELD_MASK)
                .contentType(MediaType.APPLICATION_JSON)
                .body(body)
                .retrieve()
                .body(Map.class);

        if (response == null || !response.containsKey("places")) {
            return List.of();
        }

        List<Map<String, Object>> places = (List<Map<String, Object>>) response.get("places");
        return places.stream()
                .map(this::toResult)
                .toList();
    }

    private Map<String, Object> buildRequestBody(String query, Double lat, Double lng, int limit) {
        if (lat != null && lng != null) {
            // 위치 편향 적용 (반경 50km)
            return Map.of(
                    "textQuery", query,
                    "pageSize", Math.min(limit, 20),
                    "locationBias", Map.of(
                            "circle", Map.of(
                                    "center", Map.of("latitude", lat, "longitude", lng),
                                    "radius", 50000.0
                            )
                    )
            );
        }
        return Map.of(
                "textQuery", query,
                "pageSize", Math.min(limit, 20)
        );
    }

    @SuppressWarnings("unchecked")
    private GooglePlaceResult toResult(Map<String, Object> place) {
        String placeId = (String) place.getOrDefault("id", "");

        Map<String, Object> displayName = (Map<String, Object>) place.get("displayName");
        String name = displayName != null ? (String) displayName.get("text") : "알 수 없음";

        Map<String, Object> location = (Map<String, Object>) place.get("location");
        double lat = location != null ? ((Number) location.get("latitude")).doubleValue() : 0;
        double lng = location != null ? ((Number) location.get("longitude")).doubleValue() : 0;

        String address = (String) place.getOrDefault("formattedAddress", "");

        Double rating = place.get("rating") != null
                ? ((Number) place.get("rating")).doubleValue() : null;

        Integer reviewCount = place.get("userRatingCount") != null
                ? ((Number) place.get("userRatingCount")).intValue() : null;

        Boolean isOpenNow = null;
        Map<String, Object> hours = (Map<String, Object>) place.get("currentOpeningHours");
        if (hours != null) {
            isOpenNow = (Boolean) hours.get("openNow");
        }

        List<String> types = (List<String>) place.getOrDefault("types", List.of());

        return new GooglePlaceResult(placeId, name, address, lat, lng, rating, reviewCount, isOpenNow, types);
    }

    public record GooglePlaceResult(
            String placeId,
            String name,
            String address,
            double lat,
            double lng,
            Double rating,
            Integer reviewCount,
            Boolean isOpenNow,
            List<String> types
    ) {}
}
