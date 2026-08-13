package org.jkh.com.dagalle.common.country;

import lombok.Getter;
import lombok.RequiredArgsConstructor;

/**
 * 지원 통화.
 *
 * <p>{@code minorUnitScale}은 "체감 단위"다. 베트남 동(VND)은 1,000동 미만을 실제로 쓰지 않아
 * 표시할 때 반올림 단위가 필요하다. 금액 계산 자체는 항상 최소 단위(정수)로 한다.
 */
@Getter
@RequiredArgsConstructor
public enum Currency {

    KRW("원", 1),
    JPY("엔", 1),
    THB("바트", 1),
    /** 자릿수가 크다. 1,000동 단위로 표시한다. */
    VND("동", 1_000);

    private final String symbol;
    private final int displayUnit;
}
