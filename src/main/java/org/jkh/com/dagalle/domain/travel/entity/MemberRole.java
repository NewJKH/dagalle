package org.jkh.com.dagalle.domain.travel.entity;

public enum MemberRole {
    /** 리더 — 일정 삭제, 강퇴, 초대, 역할 변경 가능 */
    OWNER,
    /** 팀원 — 일정 추가·수정, 채팅 가능 */
    MEMBER,
    /** 관찰자 — 읽기 전용 */
    VIEWER;

    public String displayName() {
        return switch (this) {
            case OWNER  -> "리더";
            case MEMBER -> "팀원";
            case VIEWER -> "관찰자";
        };
    }

    public boolean canEditSchedule() { return this == OWNER || this == MEMBER; }
    public boolean canDeleteSchedule() { return this == OWNER; }
    public boolean canManageMembers()  { return this == OWNER; }
}
