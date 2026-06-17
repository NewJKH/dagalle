package org.jkh.com.dagalle.domain.user.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.SQLDelete;
import org.hibernate.annotations.SQLRestriction;

import java.time.LocalDateTime;

@Entity
@Table(name = "users")
@Getter
@NoArgsConstructor(access = AccessLevel.PROTECTED)
@SQLDelete(sql = "UPDATE users SET deleted_at = NOW() WHERE id = ?")
@SQLRestriction("deleted_at IS NULL")
public class User {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(nullable = false)
    private String password;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private Tendency tendency;

    @Column(name = "deleted_at")
    private LocalDateTime deletedAt;

    @Builder
    public User(String username, String email, String password, Tendency tendency) {
        this.username = username;
        this.email = email;
        this.password = password;
        this.tendency = tendency;
    }

    public void update(String username, Tendency tendency) {
        if (username != null) this.username = username;
        if (tendency != null) this.tendency = tendency;
    }
}
