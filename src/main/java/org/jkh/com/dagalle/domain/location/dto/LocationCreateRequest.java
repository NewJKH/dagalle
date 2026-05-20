package org.jkh.com.dagalle.domain.location.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import org.jkh.com.dagalle.domain.location.entity.LocationType;

@Getter
public class LocationCreateRequest {

    @NotBlank
    private String name;

    private String address;

    @NotNull
    private Double lat;

    @NotNull
    private Double lng;

    private LocationType type;
}
