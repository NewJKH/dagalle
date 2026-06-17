package org.jkh.com.dagalle.domain.ai.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Getter
@NoArgsConstructor
public class DayModifyRequest {

    @NotBlank(message = "수정 요청 내용을 입력해주세요")
    @Size(max = 500, message = "수정 요청은 500자 이내로 입력해주세요")
    private String prompt;
}
