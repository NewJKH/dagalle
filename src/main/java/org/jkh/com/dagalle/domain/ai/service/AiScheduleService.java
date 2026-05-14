package org.jkh.com.dagalle.domain.ai.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.domain.ai.dto.AiFillRequest;
import org.jkh.com.dagalle.domain.ai.dto.AiGenerateRequest;
import org.jkh.com.dagalle.domain.travel.dto.TravelResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AiScheduleService {

    @Value("${external-api.claude.key}")
    private String claudeApiKey;

    @Value("${external-api.claude.model}")
    private String claudeModel;

    public TravelResponse generateSchedule(Long userId, AiGenerateRequest request) {
        // Claude API 호출 — 사용자가 AI 생성 버튼을 눌렀을 때만 호출
        // TODO: Claude API SDK 연동 후 구현
        // 1. 프롬프트 구성 (출발지, 도착지, 기간, 성향 전달)
        // 2. Claude API 호출 → JSON 응답 파싱
        // 3. TravelPlan + PlanDay + PlanRoute DB 저장
        throw new UnsupportedOperationException("Claude API 연동 후 구현 예정");
    }

    public List<Map<String, Object>> fillFreeTime(Long userId, Long travelId,
                                                   Integer dayNumber, AiFillRequest request) {
        // Claude API 호출 — 빈 시간대 채우기
        // TODO: Claude API SDK 연동 후 구현
        // 1. 현재 동선 컨텍스트 전달
        // 2. 빈 시간 구간, 현재 위치 전달
        // 3. 추천 장소 목록 반환
        throw new UnsupportedOperationException("Claude API 연동 후 구현 예정");
    }
}
