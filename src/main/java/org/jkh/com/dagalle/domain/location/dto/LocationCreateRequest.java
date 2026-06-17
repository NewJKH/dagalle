package org.jkh.com.dagalle.domain.location.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.location.entity.LocationType;

@Getter
@Setter
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
