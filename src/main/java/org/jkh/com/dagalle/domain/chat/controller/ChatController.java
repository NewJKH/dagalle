package org.jkh.com.dagalle.domain.chat.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.response.ApiResponse;
import org.jkh.com.dagalle.common.security.UserPrincipal;
import org.jkh.com.dagalle.domain.chat.dto.ChatMessageResponse;
import org.jkh.com.dagalle.domain.chat.dto.ChatSendRequest;
import org.jkh.com.dagalle.domain.chat.service.ChatService;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@Tag(name = "채팅", description = "그룹 채팅 메시지 전송 및 히스토리 조회")
@RestController
@RequestMapping("/api/v1/travels/{travelId}/chat")
@RequiredArgsConstructor
public class ChatController {

    private final ChatService chatService;

    @Operation(summary = "메시지 전송", description = "메시지를 전송하고 WebSocket으로 실시간 브로드캐스트합니다.")
    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    public ApiResponse<ChatMessageResponse> send(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @Valid @RequestBody ChatSendRequest request) {
        return ApiResponse.ok(chatService.send(principal.getId(), travelId, request.getContent()));
    }

    @Operation(summary = "채팅 히스토리", description = "최근 메시지를 최대 limit개 조회합니다 (기본 50).")
    @GetMapping
    public ApiResponse<List<ChatMessageResponse>> history(
            @AuthenticationPrincipal UserPrincipal principal,
            @PathVariable Long travelId,
            @RequestParam(defaultValue = "50") int limit) {
        return ApiResponse.ok(chatService.getHistory(principal.getId(), travelId, limit));
    }
}
