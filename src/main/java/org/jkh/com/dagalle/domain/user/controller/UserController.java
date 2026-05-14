package org.jkh.com.dagalle.domain.user.controller;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.user.dto.UserResponse;
import org.jkh.com.dagalle.domain.user.dto.UserUpdateRequest;
import org.jkh.com.dagalle.domain.user.service.UserService;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ApiResponse<UserResponse> getMe(@AuthenticationPrincipal UserPrincipal principal) {
        return ApiResponse.ok(userService.getMe(principal.getId()));
    }

    @PatchMapping("/me")
    public ApiResponse<UserResponse> update(@AuthenticationPrincipal UserPrincipal principal,
                                            @RequestBody UserUpdateRequest request) {
        return ApiResponse.ok(userService.update(principal.getId(), request));
    }

    @DeleteMapping("/me")
    public ApiResponse<Void> delete(@AuthenticationPrincipal UserPrincipal principal) {
        userService.delete(principal.getId());
        return ApiResponse.ok();
    }
}
