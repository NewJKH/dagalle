package org.jkh.com.dagalle.domain.chat.repository;

import org.jkh.com.dagalle.domain.chat.entity.ChatMessage;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    @Query("SELECT m FROM ChatMessage m JOIN FETCH m.sender WHERE m.travelPlan = :travel ORDER BY m.sentAt DESC")
    Page<ChatMessage> findByTravelPlanOrderBySentAtDesc(TravelPlan travel, Pageable pageable);

    @Modifying
    @Query("DELETE FROM ChatMessage m WHERE m.travelPlan.id = :travelId")
    void deleteByTravelPlanId(Long travelId);
}
