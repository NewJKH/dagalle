package org.jkh.com.dagalle.domain.restaurant.entity;

import jakarta.persistence.*;
import lombok.*;
import org.jkh.com.dagalle.domain.location.entity.Location;

import java.time.LocalDateTime;

@Entity
@Table(name = "restaurant_scores")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class RestaurantScore {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "location_id", nullable = false, unique = true)
    private Location location;

    @Column(nullable = false)
    private Double rating;

    @Column(name = "positive_ratio", nullable = false)
    private Double positiveRatio;

    @Enumerated(EnumType.STRING)
    @Column(name = "recent_trend", nullable = false, length = 10)
    private ReviewTrend recentTrend;

    @Column(name = "recommend_score", nullable = false)
    private Integer recommendScore;

    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;

    @Builder
    public RestaurantScore(Location location, Double rating, Double positiveRatio,
                           ReviewTrend recentTrend, Integer recommendScore) {
        this.location = location;
        this.rating = rating;
        this.positiveRatio = positiveRatio;
        this.recentTrend = recentTrend;
        this.recommendScore = recommendScore;
        this.updatedAt = LocalDateTime.now();
    }

    public void recalculate(Double rating, Double positiveRatio, ReviewTrend recentTrend, Integer reviewCount) {
        this.rating = rating;
        this.positiveRatio = positiveRatio;
        this.recentTrend = recentTrend;
        this.recommendScore = calculateScore(rating, positiveRatio, recentTrend, reviewCount);
        this.updatedAt = LocalDateTime.now();
    }

    public static int calculateScore(Double rating, Double positiveRatio, ReviewTrend recentTrend, Integer reviewCount) {
        double trendScore = switch (recentTrend) {
            case UP -> 20;
            case STABLE -> 10;
            case DOWN -> 0;
        };
        double reviewCountLog = reviewCount > 0 ? Math.log10(reviewCount) * 10 : 0;
        double raw = (rating * 30) + (positiveRatio * 40) + trendScore + reviewCountLog;
        return (int) Math.min(100, Math.max(0, raw));
    }
}
