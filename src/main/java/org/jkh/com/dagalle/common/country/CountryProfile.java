package org.jkh.com.dagalle.common.country;

/**
 * 국가별로 달라지는 것을 한곳에 모은 프로파일.
 *
 * <p><b>국가를 하나 더 지원할 때 기존 파일을 고치면 설계가 틀린 것이다.</b>
 * 이 인터페이스 구현 클래스 하나만 추가해서 동작해야 한다.
 *
 * <pre>
 * // ❌ 이렇게 하지 않는다
 * boolean isJp = "JP".equalsIgnoreCase(countryCode);
 *
 * // ⭕ 이렇게 한다
 * CountryProfile profile = countryProfileRegistry.require(countryCode);
 * </pre>
 *
 * <p>이미 {@code TransitFareRegistry}가 같은 패턴으로 동작하고 있다. 그 패턴을 넓힌 것이다.
 */
public interface CountryProfile {

    /** ISO 3166-1 alpha-2. "JP" · "VN" · "TH" */
    String countryCode();

    /** 사용자에게 보여줄 국가명. */
    String displayName();

    /** 현지 통화. */
    Currency currency();

    /** AI 프롬프트에 넣을 국가별 어휘. */
    AiPromptRule aiPromptRule();

    /** 숙박·렌터카·항공료 기준선. AI가 아니라 코드가 계산하는 값들. */
    CostBaseline costBaseline();
}
