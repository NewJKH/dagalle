package org.jkh.com.dagalle.domain.user.service;

import lombok.RequiredArgsConstructor;
import org.jkh.com.dagalle.common.exception.BusinessException;
import org.jkh.com.dagalle.common.exception.ErrorCode;
import org.jkh.com.dagalle.common.security.JwtTokenProvider;
import org.jkh.com.dagalle.domain.user.dto.*;
import org.jkh.com.dagalle.domain.user.entity.User;
import org.jkh.com.dagalle.domain.user.repository.UserRepository;
import org.springframework.data.redis.core.StringRedisTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Duration;

@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;
    private final StringRedisTemplate redisTemplate;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        if (userRepository.existsByEmail(request.getEmail())) {
            throw new BusinessException(ErrorCode.DUPLICATE_EMAIL);
        }
        User user = User.builder()
                .username(request.getUsername())
                .email(request.getEmail())
                .password(passwordEncoder.encode(request.getPassword()))
                .tendency(request.getTendency())
                .build();
        return UserResponse.from(userRepository.save(user));
    }

    @Transactional(readOnly = true)
    public LoginResponse login(LoginRequest request) {
        User user = userRepository.findByEmail(request.getEmail())
                .orElseThrow(() -> new BusinessException(ErrorCode.INVALID_CREDENTIALS));
        if (!passwordEncoder.matches(request.getPassword(), user.getPassword())) {
            throw new BusinessException(ErrorCode.INVALID_CREDENTIALS);
        }
        String accessToken = jwtTokenProvider.createAccessToken(user.getId());
        String refreshToken = jwtTokenProvider.createRefreshToken(user.getId());
        redisTemplate.opsForValue().set("refresh:" + user.getId(), refreshToken, Duration.ofDays(7));
        return LoginResponse.builder()
                .accessToken(accessToken)
                .refreshToken(refreshToken)
                .userId(user.getId())
                .username(user.getUsername())
                .build();
    }

    public void logout(Long userId) {
        redisTemplate.delete("refresh:" + userId);
    }

    public LoginResponse refresh(RefreshRequest request) {
        String token = request.getRefreshToken();
        if (!jwtTokenProvider.validate(token)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        Long userId = jwtTokenProvider.getUserId(token);
        String stored = redisTemplate.opsForValue().get("refresh:" + userId);
        if (!token.equals(stored)) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED);
        }
        String newAccess = jwtTokenProvider.createAccessToken(userId);
        String newRefresh = jwtTokenProvider.createRefreshToken(userId);
        redisTemplate.opsForValue().set("refresh:" + userId, newRefresh, Duration.ofDays(7));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new BusinessException(ErrorCode.USER_NOT_FOUND));
        return LoginResponse.builder()
                .accessToken(newAccess)
                .refreshToken(newRefresh)
                .userId(userId)
                .username(user.getUsername())
                .build();
    }
}
