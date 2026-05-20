package org.jkh.com.dagalle.domain.accommodation.dto;

import lombok.Getter;

import java.time.LocalDate;

@Getter
public class AccommodationRequest {

    private String hotelName;

    private LocalDate checkIn;

    private LocalDate checkOut;

    private Integer pricePerNightKrw;
}
