package org.jkh.com.dagalle.domain.user.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.user.dto.UserResponse;
import org.jkh.com.dagalle.domain.user.dto.UserUpdateRequest;
import org.jkh.com.dagalle.domain.user.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@Tag(name = "사용자", description = "내 프로필 조회 / 수정 / 탈퇴")
@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @Operation(summary = "내 정보 조회")
    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(userService.getMe(principal.getId()));
    }

    @Operation(summary = "내 정보 수정", description = "username, tendency 수정 가능")
    @PatchMapping("/me")
    public ApiResponse<UserResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                            @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok(userService.update(principal.getId(), request));
    }

    @Operation(summary = "회원 탈퇴", description = "계정을 삭제합니다. 복구 불가")
    @DeleteMapping("/me")
    public ApiResponse<Void> delete(@AuthenticationPrincipal UserPrincipal principal) {
        userService.delete(principal.getId());
        return ApiResponse.ok();
    }
}
