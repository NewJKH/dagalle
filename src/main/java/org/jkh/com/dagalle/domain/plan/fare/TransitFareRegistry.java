package org.jkh.com.dagalle.domain.plan.fare;

import org.jkh.com.dagalle.domain.plan.entity.TransportType;
import org.springframework.stereotype.Component;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.stream.Collectors;

@Component
public class TransitFareRegistry {

    private final Map<String, TransitFareCalculator> calculators;

    public TransitFareRegistry(List<TransitFareCalculator> calculators) {
        this.calculators = calculators.stream()
                .collect(Collectors.toMap(c -> c.countryCode().toUpperCase(), c -> c));
    }

    public Optional<Integer> calculate(String countryCode, TransportType transport, double distanceKm) {
        if (countryCode == null) return Optional.empty();
        TransitFareCalculator calc = calculators.get(countryCode.toUpperCase());
        if (calc == null) return Optional.empty();
        return calc.calculate(transport, distanceKm);
    }
}
