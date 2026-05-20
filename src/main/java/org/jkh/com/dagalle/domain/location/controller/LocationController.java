package org.jkh.com.dagalle.domain.location.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.domain.location.dto.LocationCreateRequest;
import org.jkh.com.dagalle.domain.location.dto.LocationResponse;
import org.jkh.com.dagalle.domain.location.service.LocationService;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "장소", description = "장소 검색 / 등록. 루트 추가 시 locationId를 여기서 얻습니다.")
@RestController
@RequestMapping("/api/v1/locations")
@RequiredArgsConstructor
public class LocationController {

    private final LocationService locationService;

    @Operation(summary = "장소 검색",
            description = "키워드로 DB 내 캐시 장소를 검색합니다. 현재 위치(lat, lng)에 가까운 순으로 정렬됩니다.")
    @GetMapping("/search")
    public ApiResponse<List<LocationResponse>> search(
            @Parameter(description = "검색 키워드 (예: 해운대)") @RequestParam String keyword,
            @Parameter(description = "현재 위도 (기본: 서울시청)") @RequestParam(defaultValue = "37.5665") Double lat,
            @Parameter(description = "현재 경도") @RequestParam(defaultValue = "126.9780") Double lng,
            @Parameter(description = "최대 결과 수") @RequestParam(defaultValue = "10") int limit) {
        return ApiResponse.ok(locationService.search(keyword, lat, lng, limit));
    }

    @Operation(summary = "장소 수동 등록",
            description = "이름, 주소, 위도/경도를 입력해 장소를 직접 등록합니다. 반환된 locationId를 루트 추가 시 사용합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<LocationResponse> create(@Valid @RequestBody LocationCreateRequest request) {
        return ApiResponse.ok(locationService.create(request));
    }

    @Operation(summary = "장소 단건 조회")
    @GetMapping("/{id}")
    public ApiResponse<LocationResponse> get(
            @Parameter(description = "장소 ID") @PathVariable Long id) {
        return ApiResponse.ok(locationService.getById(id));
    }
}
