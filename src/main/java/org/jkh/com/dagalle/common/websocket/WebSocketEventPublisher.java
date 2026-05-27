package org.jkh.com.dagalle.common.websocket;

import lombok.RequiredArgsConstructor;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.stereotype.Component;

/**
 * REST API 처리 후 WebSocket으로 실시간 이벤트 브로드캐스트.
 * 일정 변경 사항이 발생하면 같은 travel의 모든 구독자에게 전파.
 */
@Component
@RequiredArgsConstructor
public class WebSocketEventPublisher {

    private final SimpMessagingTemplate messagingTemplate;

    /** 일정 변경 이벤트 브로드캐스트 (route 추가/수정/삭제) */
    public void publishScheduleUpdate(Long travelId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/travels/" + travelId + "/schedule", payload);
    }

    /** 멤버 변경 이벤트 (초대/강퇴/역할변경) */
    public void publishMemberUpdate(Long travelId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/travels/" + travelId + "/members", payload);
    }

    /** 채팅 메시지 브로드캐스트 */
    public void publishChatMessage(Long travelId, Object payload) {
        messagingTemplate.convertAndSend(
                "/topic/travels/" + travelId + "/chat", payload);
    }
}
