package org.jkh.com.dagalle.common.exception;

import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
public enum ErrorCode {

    // Common
    INVALID_REQUEST(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "요청 파라미터 오류"),
    SERVER_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER_ERROR", "서버 내부 오류"),

    // Auth
    UNAUTHORIZED(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "인증 토큰 없음 또는 만료"),
    FORBIDDEN(HttpStatus.FORBIDDEN, "FORBIDDEN", "권한 없음"),
    DUPLICATE_EMAIL(HttpStatus.CONFLICT, "CONFLICT", "이미 사용 중인 이메일"),
    INVALID_CREDENTIALS(HttpStatus.UNAUTHORIZED, "UNAUTHORIZED", "이메일 또는 비밀번호가 일치하지 않습니다"),

    // User
    USER_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "사용자를 찾을 수 없습니다"),

    // Travel
    TRAVEL_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "여행을 찾을 수 없습니다"),
    TRAVEL_ACCESS_DENIED(HttpStatus.FORBIDDEN, "FORBIDDEN", "해당 여행에 접근 권한이 없습니다"),
    ALREADY_MEMBER(HttpStatus.CONFLICT, "CONFLICT", "이미 팀원으로 등록된 사용자입니다"),
    MEMBER_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "팀원을 찾을 수 없습니다"),
    OWNER_CANNOT_LEAVE(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "리더는 내보낼 수 없습니다"),
    LEADER_ONLY(HttpStatus.FORBIDDEN, "FORBIDDEN", "리더만 수행할 수 있는 작업입니다"),
    CANNOT_CHANGE_OWN_ROLE(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "자신의 역할은 변경할 수 없습니다"),
    LAST_LEADER(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "마지막 리더는 제거하거나 변경할 수 없습니다"),

    // Plan
    DAY_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "해당 날짜 일정을 찾을 수 없습니다"),
    ROUTE_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "이동 구간을 찾을 수 없습니다"),

    // Location
    LOCATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "장소를 찾을 수 없습니다"),
    EXTERNAL_API_ERROR(HttpStatus.INTERNAL_SERVER_ERROR, "SERVER_ERROR", "외부 API 호출 실패"),

    // Restaurant
    RESTAURANT_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "식당 정보를 찾을 수 없습니다"),

    // Rental
    RENTAL_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "렌트카 정보를 찾을 수 없습니다"),

    // Accommodation
    ACCOMMODATION_NOT_FOUND(HttpStatus.NOT_FOUND, "NOT_FOUND", "숙박 정보를 찾을 수 없습니다"),

    // Rate Limiting
    TOO_MANY_REQUESTS(HttpStatus.TOO_MANY_REQUESTS, "TOO_MANY_REQUESTS", "요청 횟수를 초과했습니다. 잠시 후 다시 시도해주세요."),

    // AI
    AI_CREDIT_EXHAUSTED(HttpStatus.SERVICE_UNAVAILABLE, "AI_CREDIT_EXHAUSTED", "AI 크레딧이 소진되었습니다. 관리자에게 문의해주세요."),

    // Country — 기본값을 두지 않는다. 국가를 빠뜨린 코드가 조용히 일본으로 동작하면 버그가 숨는다.
    COUNTRY_REQUIRED(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "여행 국가가 지정되지 않았습니다"),
    UNSUPPORTED_COUNTRY(HttpStatus.BAD_REQUEST, "INVALID_REQUEST", "아직 지원하지 않는 국가입니다");

    private final HttpStatus status;
    private final String code;
    private final String message;

    ErrorCode(HttpStatus status, String code, String message) {
        this.status = status;
        this.code = code;
        this.message = message;
    }
}
