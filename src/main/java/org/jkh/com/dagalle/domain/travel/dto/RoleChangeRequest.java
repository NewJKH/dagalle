package org.jkh.com.dagalle.domain.travel.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;

@Getter
@Setter
public class RoleChangeRequest {
    @NotNull
    private MemberRole role;
}
