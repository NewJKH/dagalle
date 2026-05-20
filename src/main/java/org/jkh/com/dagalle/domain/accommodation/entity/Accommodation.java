package org.jkh.com.dagalle.domain.accommodation.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.travel.entity.TravelPlan;

import java.time.LocalDate;

@Entity
@Table(name = "accommodations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Accommodation {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @Column(length = 200)
    private String hotelName;

    private LocalDate checkIn;

    private LocalDate checkOut;

    private Integer pricePerNightKrw;

    public int nights() {
        if (checkIn == null || checkOut == null) return 0;
        return (int) checkIn.until(checkOut).getDays();
    }

    public int totalCostKrw() {
        return pricePerNightKrw != null ? pricePerNightKrw * nights() : 0;
    }

    @Builder
    public Accommodation(TravelPlan travelPlan, String hotelName,
                         LocalDate checkIn, LocalDate checkOut, Integer pricePerNightKrw) {
        this.travelPlan = travelPlan;
        this.hotelName = hotelName;
        this.checkIn = checkIn;
        this.checkOut = checkOut;
        this.pricePerNightKrw = pricePerNightKrw;
    }

    public void update(String hotelName, LocalDate checkIn, LocalDate checkOut, Integer pricePerNightKrw) {
        if (hotelName != null) this.hotelName = hotelName;
        if (checkIn != null) this.checkIn = checkIn;
        if (checkOut != null) this.checkOut = checkOut;
        if (pricePerNightKrw != null) this.pricePerNightKrw = pricePerNightKrw;
    }
}
