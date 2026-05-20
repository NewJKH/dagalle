package org.jkh.com.dagalle.domain.plan.fare;

import org.jkh.com.dagalle.domain.plan.entity.TransportType;

import java.util.Optional;

public interface TransitFareCalculator {
    String countryCode();
    Optional<Integer> calculate(TransportType transport, double distanceKm);
}
