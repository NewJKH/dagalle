package org.jkh.com.dagalle.domain.user.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

@Getter
@Setter
public class UserUpdateRequest {

    @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다")
    private String username;

    private Tendency tendency;
}
