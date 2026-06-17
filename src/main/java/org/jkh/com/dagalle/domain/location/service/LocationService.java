package org.jkh.com.dagalle.domain.location.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.location.client.GooglePlacesClient;
import org.jkh.com.dagalle.domain.location.dto.LocationCreateRequest;
import org.jkh.com.dagalle.domain.location.dto.LocationResponse;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;
    private final GooglePlacesClient googlePlacesClient;

    /**
     * 키워드로 장소 검색.
     * Google Places API 결과를 DB에 캐시 후 반환.
     * API 키 미설정 또는 오류 시 DB 캐시만 반환.
     */
    @Transactional
    public List<LocationResponse> search(String keyword, Double lat, Double lng, int limit) {
        try {
            List<GooglePlacesClient.GooglePlaceResult> results =
                    googlePlacesClient.searchText(keyword, lat, lng, limit);

            return results.stream()
                    .map(r -> upsertFromGoogle(r))
                    .map(LocationResponse::from)
                    .toList();

        } catch (Exception e) {
            log.warn("Google Places API 호출 실패, DB 캐시로 폴백합니다. 사유: {}", e.getMessage());
            return locationRepository.searchByKeywordNearby(keyword, lat, lng, limit).stream()
                    .map(LocationResponse::from)
                    .toList();
        }
    }

    /** 수동으로 장소를 등록 (사용자가 직접 좌표 입력) */
    @Transactional
    public LocationResponse create(LocationCreateRequest request) {
        Location location = Location.builder()
                .name(request.getName())
                .address(request.getAddress() != null ? request.getAddress() : "")
                .lat(request.getLat())
                .lng(request.getLng())
                .type(request.getType() != null ? request.getType() : LocationType.ETC)
                .source(LocationSource.USER)
                .build();
        return LocationResponse.from(locationRepository.save(location));
    }

    /** ID로 단건 조회 */
    @Transactional(readOnly = true)
    public LocationResponse getById(Long id) {
        Location location = locationRepository.findById(id)
                .orElseThrow(() -> new BusinessException(ErrorCode.LOCATION_NOT_FOUND));
        return LocationResponse.from(location);
    }

    /**
     * Google 결과를 DB에 upsert (이미 있으면 rating/isOpenNow 갱신, 없으면 신규 저장).
     * externalId = Google Place ID
     */
    private Location upsertFromGoogle(GooglePlacesClient.GooglePlaceResult r) {
        // Google Place ID는 응답의 "id" 필드가 없어서 name+lat+lng 조합 사용 불가
        // → 위도/경도를 소수점 5자리로 truncate한 값을 externalId로 사용
        String externalId = toExternalId(r.lat(), r.lng());

        return locationRepository.findByExternalIdAndSource(externalId, LocationSource.GOOGLE)
                .map(existing -> {
                    existing.updateOpenStatus(r.isOpenNow() != null && r.isOpenNow());
                    return existing;
                })
                .orElseGet(() -> locationRepository.save(
                        Location.builder()
                                .name(r.name())
                                .address(r.address())
                                .lat(r.lat())
                                .lng(r.lng())
                                .rating(r.rating())
                                .reviewCount(r.reviewCount())
                                .type(inferType(r.types()))
                                .source(LocationSource.GOOGLE)
                                .externalId(externalId)
                                .build()
                ));
    }

    /** Google Place types 목록 → LocationType 매핑 */
    private LocationType inferType(List<String> types) {
        if (types == null || types.isEmpty()) return LocationType.ETC;
        for (String t : types) {
            switch (t) {
                case "restaurant", "food", "meal_takeaway", "meal_delivery" -> { return LocationType.RESTAURANT; }
                case "cafe", "coffee_shop" -> { return LocationType.CAFE; }
                case "lodging", "hotel", "motel", "resort_hotel" -> { return LocationType.HOTEL; }
                case "train_station", "subway_station", "transit_station" -> { return LocationType.STATION; }
                case "airport" -> { return LocationType.AIRPORT; }
                case "museum", "art_gallery", "tourist_attraction" -> { return LocationType.MUSEUM; }
                case "park", "national_park", "campground" -> { return LocationType.PARK; }
                case "shopping_mall", "department_store", "store" -> { return LocationType.SHOPPING; }
                case "beach" -> { return LocationType.BEACH; }
                case "mountain_peak", "hiking_area" -> { return LocationType.MOUNTAIN; }
            }
        }
        return LocationType.ETC;
    }

    private String toExternalId(double lat, double lng) {
        return String.format("%.5f,%.5f", lat, lng);
    }
}
