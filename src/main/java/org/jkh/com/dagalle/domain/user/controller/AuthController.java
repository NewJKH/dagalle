package org.jkh.com.dagalle.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.security.SecurityRequirements;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.user.dto.*;
import org.jkh.com.dagalle.domain.user.service.AuthService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "인증", description = "회원가입 / 로그인 / 토큰 갱신")
@RestController
@RequestMapping("/api/v1/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @Operation(summary = "회원가입", description = "이메일, 비밀번호, 여행 성향(tendency)으로 계정을 생성합니다.")
    @SecurityRequirements   // 이 엔드포인트는 토큰 불필요
    @PostMapping("/register")
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        return ApiResponse.ok(authService.register(request));
    }

    @Operation(summary = "로그인", description = "이메일과 비밀번호로 로그인합니다. accessToken / refreshToken을 반환합니다.")
    @SecurityRequirements
    @PostMapping("/login")
    public ApiResponse<LoginResponse> login(@Valid @RequestBody LoginRequest request) {
        return ApiResponse.ok(authService.login(request));
    }

    @Operation(summary = "로그아웃", description = "Redis에서 refreshToken을 삭제합니다. (JWT 자체는 만료 때까지 유효)")
    @PostMapping("/logout")
    public ApiResponse<Void> logout(@AuthenticationPrincipal UserPrincipal principal) {
        authService.logout(principal.getId());
        return ApiResponse.ok();
    }

    @Operation(summary = "토큰 갱신", description = "refreshToken으로 새로운 accessToken을 발급합니다.")
    @SecurityRequirements
    @PostMapping("/refresh")
    public ApiResponse<LoginResponse> refresh(@Valid @RequestBody RefreshRequest request) {
        return ApiResponse.ok(authService.refresh(request));
    }
}
