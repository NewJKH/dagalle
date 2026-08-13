package org.jkh.com.dagalle.common.country;

import lombok.extern.slf4j.Slf4j;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

/**
 * 등록된 {@link CountryProfile}을 국가코드로 찾아준다.
 *
 * <p>스프링이 구현체를 전부 주입하므로, 국가 추가는 {@code @Component} 하나 더 만드는 것으로 끝난다.
 * 이 클래스는 고치지 않는다.
 */
@Slf4j
@Component
public class CountryProfileRegistry {

    private final Map<String, CountryProfile> profiles;

    public CountryProfileRegistry(List<CountryProfile> registered) {
        this.profiles = registered.stream()
                .collect(Collectors.toMap(p -> p.countryCode().toUpperCase(), p -> p));
        log.info("[국가] 등록된 프로파일: {}", profiles.keySet());
    }

    /**
     * 국가코드로 프로파일을 찾는다. 없으면 예외.
     *
     * <p><b>기본값을 두지 않는 것이 핵심이다.</b> 예전에는 {@code countryCode}가 없으면 조용히
     * 일본으로 동작해, 국가를 빠뜨린 코드가 버그를 숨긴 채 돌아갔다. 여기서 터뜨려야 드러난다.
     */
    public CountryProfile require(String countryCode) {
        if (countryCode == null || countryCode.isBlank()) {
            throw new BusinessException(ErrorCode.COUNTRY_REQUIRED);
        }
        CountryProfile profile = profiles.get(countryCode.toUpperCase());
        if (profile == null) {
            throw new BusinessException(ErrorCode.UNSUPPORTED_COUNTRY);
        }
        return profile;
    }

    /** 지원 국가 코드 목록. */
    public java.util.Set<String> supportedCodes() {
        return profiles.keySet();
    }
}
