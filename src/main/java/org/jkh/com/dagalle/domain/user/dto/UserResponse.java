package org.jkh.com.dagalle.domain.user.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;
import org.jkh.com.dagalle.domain.user.entity.User;

@Getter
@Builder
public class UserResponse {
    private Long id;
    private String username;
    private String email;
    private Tendency tendency;

    public static UserResponse from(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .username(user.getUsername())
                .email(user.getEmail())
                .tendency(user.getTendency())
                .build();
    }
}
