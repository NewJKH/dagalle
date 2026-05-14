package org.jkh.com.dagalle.domain.travel.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.user.entity.User;

@Entity
@Table(name = "travel_members",
       uniqueConstraints = @UniqueConstraint(columnNames = {"travel_plan_id", "user_id"}))
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class TravelMember {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "travel_plan_id", nullable = false)
    private TravelPlan travelPlan;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private MemberRole role;

    @Builder
    public TravelMember(TravelPlan travelPlan, User user, MemberRole role) {
        this.travelPlan = travelPlan;
        this.user = user;
        this.role = role;
    }
}
