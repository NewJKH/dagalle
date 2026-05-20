package org.jkh.com.dagalle.domain.location.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.domain.location.dto.LocationCreateRequest;
import org.jkh.com.dagalle.domain.location.dto.LocationResponse;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;
import org.jkh.com.dagalle.domain.location.repository.LocationRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class LocationService {

    private final LocationRepository locationRepository;

    /** 키워드 + 현재 위치 기준으로 DB 내 캐시 장소 검색 */
    @Transactional(readOnly = true)
    public List<LocationResponse> search(String keyword, Double lat, Double lng, int limit) {
        return locationRepository.searchByKeywordNearby(keyword, lat, lng, limit).stream()
                .map(LocationResponse::from)
                .toList();
    }

    /** 수동으로 장소를 등록 (루트 추가 시 locationId 필요할 때 사용) */
    @Transactional
    public LocationResponse create(LocationCreateRequest request) {
        Location location = Location.builder()
                .name(request.getName())
                .address(request.getAddress() != null ? request.getAddress() : "")
                .lat(request.getLat())
                .lng(request.getLng())
                .type(request.getType() != null ? request.getType() : LocationType.ETC)
                .source(LocationSource.AI)   // 수동 입력도 AI 소스로 구분
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
}
