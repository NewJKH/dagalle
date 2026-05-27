package org.jkh.com.dagalle.domain.chat.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.chat.entity.ChatMessage;

import java.time.LocalDateTime;

@Getter
@Builder
public class ChatMessageResponse {
    private Long id;
    private Long senderId;
    private String senderName;
    private String content;
    private LocalDateTime sentAt;

    public static ChatMessageResponse from(ChatMessage msg) {
        return ChatMessageResponse.builder()
                .id(msg.getId())
                .senderId(msg.getSender().getId())
                .senderName(msg.getSender().getUsername())
                .content(msg.getContent())
                .sentAt(msg.getSentAt())
                .build();
    }
}
