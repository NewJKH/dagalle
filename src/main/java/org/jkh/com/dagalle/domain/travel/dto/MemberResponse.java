package org.jkh.com.dagalle.domain.travel.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.travel.entity.MemberRole;
import org.jkh.com.dagalle.domain.travel.entity.TravelMember;

@Getter
@Builder
public class MemberResponse {
    private Long memberId;      // TravelMember PK
    private Long userId;
    private String username;
    private String email;
    private MemberRole role;
    private String roleDisplay; // "리더" / "팀원" / "관찰자"

    public static MemberResponse from(TravelMember m) {
        return MemberResponse.builder()
                .memberId(m.getId())
                .userId(m.getUser().getId())
                .username(m.getUser().getUsername())
                .email(m.getUser().getEmail())
                .role(m.getRole())
                .roleDisplay(m.getRole().displayName())
                .build();
    }
}
