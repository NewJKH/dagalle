package org.jkh.com.dagalle.common.country;

import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

/**
 * 조회 경로가 둘로 갈리는 이유를 지킨다.
 *
 * <p>{@code require()}는 예외를 던져 국가를 빠뜨린 코드를 드러낸다.
 * {@code find()}는 예외를 던지지 않아 폴백이 폴백을 할 수 있게 한다.
 * 이 구분이 무너지면 둘 중 하나가 반드시 깨진다.
 */
class CountryProfileRegistryTest {

    private final CountryProfileRegistry sut = new CountryProfileRegistry(List.of(
            new JapanCountryProfile(new FixedExchangeRateProvider(
                    new BigDecimal("9.0"), new BigDecimal("0.055"), new BigDecimal("40.0")))));

    @Test
    @DisplayName("지원 국가는 대소문자 구분 없이 찾는다")
    void requireIsCaseInsensitive() {
        assertThat(sut.require("JP").countryCode()).isEqualTo("JP");
        assertThat(sut.require("jp").countryCode()).isEqualTo("JP");
    }

    @Test
    @DisplayName("require는 국가가 없으면 예외 — 기본값으로 넘어가지 않는다")
    void requireThrowsOnUnsupported() {
        assertThatThrownBy(() -> sut.require("VN"))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.UNSUPPORTED_COUNTRY);
    }

    @Test
    @DisplayName("require는 null·공백도 예외 — 조용히 일본이 되지 않는다")
    void requireThrowsOnMissingCode() {
        assertThatThrownBy(() -> sut.require(null))
                .isInstanceOf(BusinessException.class)
                .hasFieldOrPropertyWithValue("errorCode", ErrorCode.COUNTRY_REQUIRED);
        assertThatThrownBy(() -> sut.require("  "))
                .isInstanceOf(BusinessException.class);
    }

    @Test
    @DisplayName("find는 절대 예외를 던지지 않는다 — 폴백 경로가 여기에 기댄다")
    void findNeverThrows() {
        assertThat(sut.find("JP")).isPresent();
        assertThat(sut.find("VN")).isEmpty();
        assertThat(sut.find(null)).isEmpty();
        assertThat(sut.find("")).isEmpty();
        assertThat(sut.find("존재하지않는코드")).isEmpty();
    }

    @Test
    @DisplayName("aiPromptRule은 같은 인스턴스를 재사용한다")
    void promptRuleIsReused() {
        CountryProfile jp = sut.require("JP");
        assertThat(jp.aiPromptRule()).isSameAs(jp.aiPromptRule());
    }
}
