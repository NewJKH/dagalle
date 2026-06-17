package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DayGenerateRequest {

    /** 사용자가 원하는 여행 스타일/테마 (선택 입력, 최대 300자) */
    @Size(max = 300, message = "여행 희망사항은 300자 이내로 입력해주세요")
    private String userWish;
}
