package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;

@Getter
@Setter
public class InviteRequest {

    @NotBlank
    @Email
    private String email;

    /** 초대 시 역할 지정 (기본 MEMBER) */
    private MemberRole role;
}
