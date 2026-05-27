package org.jkh.com.dagalle.domain.chat.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.user.entity.User;

import java.time.LocalDateTime;

@Entity
@Table(name = "chat_messages",
       indexes = @Index(name = "idx_chat_travel_sent", columnList = "travel_plan_id, sent_at"))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class ChatMessage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "sender_id", nullable = false)
    private User sender;

    @Column(nullable = false, length = 1000)
    private String content;

    @Column(name = "sent_at", nullable = false)
    private LocalDateTime sentAt;

    @Builder
    public ChatMessage(TravelPlan travelPlan, User sender, String content) {
        this.travelPlan = travelPlan;
        this.sender = sender;
        this.content = content;
        this.sentAt = LocalDateTime.now();
    }
}
