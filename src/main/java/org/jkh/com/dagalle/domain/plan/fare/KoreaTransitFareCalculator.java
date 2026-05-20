package org.jkh.com.dagalle.domain.plan.fare;

import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.springframework.stereotype.Component;

import java.util.Optional;

@Component
public class KoreaTransitFareCalculator implements TransitFareCalculator {

    @Override
    public String countryCode() {
        return "KR";
    }

    @Override
    public Optional<Integer> calculate(TransportType transport, double distanceKm) {
        return switch (transport) {
            case SUBWAY -> Optional.of(subwayFare(distanceKm));
            case BUS    -> Optional.of(1500);  // 서울 버스 기본 1500원
            case TRAIN  -> Optional.of(trainFare(distanceKm));
            default     -> Optional.empty();
        };
    }

    private int subwayFare(double km) {
        if (km <= 10) return 1400;
        else if (km <= 40) return 1400 + (int) ((km - 10) / 5) * 100;
        else return 2000 + (int) ((km - 40) / 10) * 100;
    }

    private int trainFare(double km) {
        return (int) (km * 65);  // KTX 근사값
    }
}
