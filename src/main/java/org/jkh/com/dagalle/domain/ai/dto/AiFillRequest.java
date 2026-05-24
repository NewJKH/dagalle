package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;

import java.time.LocalTime;

@Getter
@Setter
public class AiFillRequest {

    @NotNull
    private LocalTime freeTimeStart;

    @NotNull
    private LocalTime freeTimeEnd;

    @NotBlank
    private String currentLocation;
}
