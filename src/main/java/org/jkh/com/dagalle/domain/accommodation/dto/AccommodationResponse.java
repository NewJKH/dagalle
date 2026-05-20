package org.jkh.com.dagalle.domain.accommodation.dto;

import lombok.Builder;
import lombok.Getter;
import org.jkh.com.dagalle.domain.accommodation.entity.Accommodation;

import java.time.LocalDate;

@Getter
@Builder
public class AccommodationResponse {

    private Long id;
    private String hotelName;
    private LocalDate checkIn;
    private LocalDate checkOut;
    private Integer pricePerNightKrw;
    private Integer nights;
    private Integer totalCostKrw;

    public static AccommodationResponse from(Accommodation a) {
        return AccommodationResponse.builder()
                .id(a.getId())
                .hotelName(a.getHotelName())
                .checkIn(a.getCheckIn())
                .checkOut(a.getCheckOut())
                .pricePerNightKrw(a.getPricePerNightKrw())
                .nights(a.nights())
                .totalCostKrw(a.totalCostKrw())
                .build();
    }
}
