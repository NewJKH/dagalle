package org.jkh.com.dagalle.domain.user.dto;

import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

@Getter
@Setter
public class UserUpdateRequest {
    private String username;
    private Tendency tendency;
}
