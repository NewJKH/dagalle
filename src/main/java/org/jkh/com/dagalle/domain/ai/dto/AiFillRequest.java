package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Getter;

import java.time.LocalTime;

@Getter
public class AiFillRequest {

    @NotNull
    private LocalTime freeTimeStart;

    @NotNull
    private LocalTime freeTimeEnd;

    @NotBlank
    private String currentLocation;
}
