package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;

@Getter
public class InviteRequest {

    @NotBlank
    @Email
    private String email;
}
