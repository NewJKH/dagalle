package org.jkh.com.dagalle.domain.user.dto;

import lombok.Getter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

@Getter
public class UserUpdateRequest {
    private String username;
    private Tendency tendency;
}
