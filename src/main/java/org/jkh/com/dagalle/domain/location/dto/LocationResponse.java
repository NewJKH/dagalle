package org.jkh.com.dagalle.domain.location.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.location.entity.LocationSource;
import org.jkh.com.dagalle.domain.location.entity.LocationType;

@Getter
@Builder
public class LocationResponse {
    private Long locationId;
    private String name;
    private String address;
    private Double lat;
    private Double lng;
    private Double rating;
    private Integer reviewCount;
    private Boolean isOpenNow;
    private LocationType type;
    private LocationSource source;

    public static LocationResponse from(Location location) {
        return LocationResponse.builder()
                .locationId(location.getId())
                .name(location.getName())
                .address(location.getAddress())
                .lat(location.getLat())
                .lng(location.getLng())
                .rating(location.getRating())
                .reviewCount(location.getReviewCount())
                .isOpenNow(location.getIsOpenNow())
                .type(location.getType())
                .source(location.getSource())
                .build();
    }
}
