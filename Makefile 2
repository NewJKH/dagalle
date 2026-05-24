# ─────────────────────────────────────────────
#  다갈래 개발 편의 Makefile
#  사용법:  make dev       (백엔드 + 프론트 동시 실행)
#           make back      (백엔드만 – local 프로필, H2 DB)
#           make front     (프론트만)
#           make build     (백엔드 빌드)
# ─────────────────────────────────────────────

.PHONY: dev back front build

# .env 파일 자동 로드
ifneq (,$(wildcard .env))
  include .env
  export
endif

# 백엔드 + 프론트 동시 실행
dev:
	@echo "🚀 백엔드(8080) + 프론트(5173) 동시 실행..."
	@trap 'kill 0' SIGINT; \
	  ./gradlew bootRun --args='--spring.profiles.active=local' & \
	  (cd frontend && npm run dev) & \
	  wait

# 백엔드만 (H2 메모리 DB)
back:
	@echo "🌱 백엔드 실행 (local 프로필 – H2 + .env 로드)"
	./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트만
front:
	@echo "⚡ 프론트 실행 (localhost:5173)"
	cd frontend && npm run dev

# 백엔드 빌드
build:
	./gradlew build -x test
