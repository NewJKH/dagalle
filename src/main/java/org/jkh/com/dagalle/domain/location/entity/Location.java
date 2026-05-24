package org.jkh.com.dagalle.domain.location.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "locations")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class Location {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 200)
    private String name;

    @Column(length = 500)
    private String address;

    @Column(nullable = false)
    private Double lat;

    @Column(nullable = false)
    private Double lng;

    private Double rating;

    @Column(name = "review_count")
    private Integer reviewCount;

    @Enumerated(EnumType.STRING)
    @Column(length = 20)
    private LocationType type;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private LocationSource source;

    @Column(name = "is_open_now")
    private Boolean isOpenNow;

    @Column(name = "external_id", length = 200)
    private String externalId;

    @Column(name = "cached_at")
    private LocalDateTime cachedAt;

    /** 장소 상세 설명 (레스토랑: 대표메뉴·가격대·특징, 관광지: 주요 볼거리 등 AI 생성) */
    @Column(columnDefinition = "TEXT")
    private String description;

    @Builder
    public Location(String name, String address, Double lat, Double lng,
                    Double rating, Integer reviewCount, LocationType type,
                    LocationSource source, String externalId, String description) {
        this.name = name;
        this.address = address;
        this.lat = lat;
        this.lng = lng;
        this.rating = rating;
        this.reviewCount = reviewCount;
        this.type = type;
        this.source = source;
        this.externalId = externalId;
        this.description = description;
        this.cachedAt = LocalDateTime.now();
    }

    public void updateOpenStatus(boolean isOpenNow) {
        this.isOpenNow = isOpenNow;
    }
}
