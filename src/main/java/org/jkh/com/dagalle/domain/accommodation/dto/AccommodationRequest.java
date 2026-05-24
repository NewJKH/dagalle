package org.jkh.com.dagalle.domain.accommodation.dto;

import lombok.Getter;
import lombok.Setter;

import java.time.LocalDate;

@Getter
@Setter
public class AccommodationRequest {

    private String hotelName;

    private LocalDate checkIn;

    private LocalDate checkOut;

    private Integer pricePerNightKrw;
}
