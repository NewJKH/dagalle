package org.jkh.com.dagalle.domain.travel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.user.entity.User;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

@Entity
@Table(name = "travel_plans")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelPlan {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "start_location", nullable = false, length = 200)
    private String startLocation;

    @Column(name = "end_location", nullable = false, length = 200)
    private String endLocation;

    @Column(name = "start_date", nullable = false)
    private LocalDate startDate;

    @Column(name = "end_date", nullable = false)
    private LocalDate endDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private TravelStatus status;

    @Column(name = "is_ai_generated", nullable = false)
    private boolean isAiGenerated;

    @OneToMany(mappedBy = "travelPlan", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<TravelMember> members = new ArrayList<>();

    @Builder
    public TravelPlan(User owner, String title, String startLocation, String endLocation,
                      LocalDate startDate, LocalDate endDate) {
        this.owner = owner;
        this.title = title;
        this.startLocation = startLocation;
        this.endLocation = endLocation;
        this.startDate = startDate;
        this.endDate = endDate;
        this.status = TravelStatus.DRAFT;
        this.isAiGenerated = false;
    }

    public void update(String title, String startLocation, String endLocation,
                       LocalDate startDate, LocalDate endDate) {
        if (title != null) this.title = title;
        if (startLocation != null) this.startLocation = startLocation;
        if (endLocation != null) this.endLocation = endLocation;
        if (startDate != null) this.startDate = startDate;
        if (endDate != null) this.endDate = endDate;
    }

    public void markAiGenerated() {
        this.isAiGenerated = true;
    }

    public void confirm() {
        this.status = TravelStatus.CONFIRMED;
    }
}
