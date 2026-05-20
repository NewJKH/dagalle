package org.jkh.com.dagalle.domain.plan.fare;

import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class JapanTransitFareCalculator implements TransitFareCalculator {

    @Override
    public String countryCode() {
        return "JP";
    }

    @Override
    public Optional<Integer> calculate(TransportType transport, double distanceKm) {
        return switch (transport) {
            case SUBWAY -> Optional.of(subwayFare(distanceKm));
            case BUS    -> Optional.of(230 * 9);  // 도쿄 균일 230엔 → 원
            case TRAIN  -> Optional.of(trainFare(distanceKm));
            default     -> Optional.empty();
        };
    }

    // 도쿄메트로 거리별 요금(엔) × 9 = 원
    private int subwayFare(double km) {
        int yen;
        if (km <= 3)       yen = 180;
        else if (km <= 6)  yen = 210;
        else if (km <= 11) yen = 240;
        else if (km <= 16) yen = 270;
        else               yen = 300;
        return yen * 9;
    }

    // JR 거리별 요금(엔) × 9 = 원
    private int trainFare(double km) {
        int yen;
        if (km <= 3)       yen = 150;
        else if (km <= 6)  yen = 160;
        else if (km <= 11) yen = 200;
        else if (km <= 22) yen = 250;
        else if (km <= 50) yen = 410;
        else               yen = 770;
        return yen * 9;
    }
}
