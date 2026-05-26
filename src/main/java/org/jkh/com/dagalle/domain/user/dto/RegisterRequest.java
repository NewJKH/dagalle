package org.jkh.com.dagalle.domain.user.dto;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import lombok.Getter;
import lombok.Setter;
import org.jkh.com.dagalle.domain.user.entity.Tendency;

@Getter
@Setter
public class RegisterRequest {

    @NotBlank(message = "닉네임을 입력해주세요")
    @Size(min = 2, max = 20, message = "닉네임은 2~20자여야 합니다")
    private String username;

    @NotBlank(message = "이메일을 입력해주세요")
    @Email(message = "유효한 이메일 형식이 아닙니다")
    @Size(max = 100, message = "이메일은 100자 이하여야 합니다")
    private String email;

    @NotBlank(message = "비밀번호를 입력해주세요")
    @Size(min = 8, max = 72, message = "비밀번호는 8~72자여야 합니다")
    private String password;

    @NotNull(message = "여행 성향을 선택해주세요")
    private Tendency tendency;
}
