package org.jkh.com.dagalle.domain.user.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class RefreshRequest {

    @NotBlank
    private String refreshToken;
}
