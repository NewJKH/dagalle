package org.jkh.com.dagalle.domain.chat.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.common.websocket.WebSocketEventPublisher;
import org.jkh.com.dagalle.domain.chat.dto.ChatMessageResponse;
import org.jkh.com.dagalle.domain.chat.entity.ChatMessage;
import org.jkh.com.dagalle.domain.chat.repository.ChatMessageRepository;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.jkh.com.dagalle.domain.travel.repository.TravelMemberRepository;
import org.jkh.com.dagalle.domain.travel.repository.TravelPlanRepository;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Service
@RequiredArgsConstructor
public class ChatService {

    private final ChatMessageRepository chatMessageRepository;
    private final TravelPlanRepository travelPlanRepository;
    private final TravelMemberRepository travelMemberRepository;
    private final UserRepository userRepository;
    private final WebSocketEventPublisher publisher;

    /** 메시지 전송 + 실시간 브로드캐스트 */
    @Transactional
    public ChatMessageResponse send(Long userId, Long travelId, String content) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        User sender = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));

        ChatMessage msg = chatMessageRepository.save(
                ChatMessage.builder().travelPlan(travel).sender(sender).content(content).build());

        ChatMessageResponse response = ChatMessageResponse.from(msg);
        publisher.publishChatMessage(travelId, response);
        return response;
    }

    /** 최근 메시지 히스토리 (최신순, 기본 50개) */
    @Transactional(readOnly = true)
    public List<ChatMessageResponse> getHistory(Long userId, Long travelId, int limit) {
        TravelPlan travel = getAccessibleTravel(userId, travelId);
        List<ChatMessageResponse> desc = chatMessageRepository
                .findByTravelPlanOrderBySentAtDesc(travel, PageRequest.of(0, limit))
                .stream().map(ChatMessageResponse::from).toList();
        // 시간 오름차순으로 reverse
        java.util.ArrayList<ChatMessageResponse> list = new java.util.ArrayList<>(desc);
        java.util.Collections.reverse(list);
        return list;
    }

    private TravelPlan getAccessibleTravel(Long userId, Long travelId) {
        TravelPlan travel = travelPlanRepository.findById(travelId)
                .orElseThrow(() -> new BusinessException(ErrorCode.TRAVEL_NOT_FOUND));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        if (!travelMemberRepository.existsByTravelPlanAndUser(travel, user)) {
            throw new BusinessException(ErrorCode.TRAVEL_ACCESS_DENIED);
        }
        return travel;
    }
}
