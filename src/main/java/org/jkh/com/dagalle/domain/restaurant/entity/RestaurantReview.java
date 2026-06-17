package org.jkh.com.dagalle.domain.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.location.entity.Location;
import org.jkh.com.dagalle.domain.user.entity.User;

import java.time.LocalDateTime;

/**
 * 여행을 다녀온 사용자가 식당에 남기는 별점(1~5).
 * <p>
 * (user, location) 조합당 1건만 존재하며, 다시 평가하면 갱신된다.
 * 이 별점들이 집계되어 {@link RestaurantScore}의 추천 점수에 반영된다(이벤트 기반).
 */
@Entity
@Table(
    name = "restaurant_reviews",
    uniqueConstraints = @UniqueConstraint(name = "uk_review_user_location", columnNames = {"user_id", "location_id"})
)
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RestaurantReview {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false)
    private Location location;

    /** 1~5 별점 */
    @Column(nullable = false)
    private Integer rating;

    @Column(name = "created_at", nullable = false)
    private LocalDateTime createdAt;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public RestaurantReview(User user, Location location, Integer rating) {
        this.user = user;
        this.location = location;
        this.rating = rating;
        this.createdAt = LocalDateTime.now();
        this.updatedAt = LocalDateTime.now();
    }

    public void updateRating(Integer rating) {
        this.rating = rating;
        this.updatedAt = LocalDateTime.now();
    }
}
