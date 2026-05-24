# dagalle 프로젝트 Claude 규칙

## 브랜치 전략

### 브랜치 종류
| 브랜치 | 용도 |
|--------|------|
| `frontend_dev_X.Y.Z` | 프론트엔드 작업 전용 (`frontend/` 디렉토리) |
| `backend_dev_X.Y.Z`  | 백엔드 작업 전용 (`src/`, `build.gradle` 등) |

### 버전 규칙 (Semantic Versioning)
```
frontend_dev_1.0.0
              │ │ └── patch: 소규모 변경 (버그픽스, 스타일 수정, 텍스트 변경)
              │ └──── minor: 중규모 변경 (컴포넌트 추가, 기능 개선)
              └────── major: 대규모 변경 (프로젝트 구조 개편, 라우팅 재설계)
```

**예시**
- 버튼 색상 수정 → `frontend_dev_1.0.1`
- 새 페이지 컴포넌트 추가 → `frontend_dev_1.1.0`
- 전체 상태관리 도입 (Zustand 등) → `frontend_dev_2.0.0`

### Claude 작업 규칙
1. **작업 시작 전** 반드시 어떤 브랜치에서 작업할지 파악한다
2. **프론트엔드 작업** → 최신 `frontend_dev_*` 브랜치에서 작업
3. **백엔드 작업** → 최신 `backend_dev_*` 브랜치에서 작업
4. **버전 업** 필요 시 새 브랜치 생성 후 push

### 자동 커밋+푸시 & 버전 자동 판단
- `.claude/auto-commit.sh` 가 변경 파일을 분석해 버전 레벨을 스스로 판단
- Stop 훅 (Claude 답변 완료 시)에 자동 실행

| 레벨 | 프론트엔드 기준 | 백엔드 기준 | 처리 |
|------|----------------|------------|------|
| **major** | App.tsx/main.tsx/router + 8개↑ 동시 변경 | build.gradle·Entity + 12개↑ 변경 | 새 브랜치 생성 (X+1.0.0) |
| **minor** | 새 .tsx/.ts 파일 생성 포함 | 새 .java 파일 생성 포함 | 새 브랜치 생성 (x.Y+1.0) |
| **patch** | 기존 파일만 수정 (스타일·버그픽스) | 기존 파일만 수정 | 현재 브랜치에 커밋 |

---

## 기술 스택

### 프론트엔드 (`frontend/`)
- React 18 + TypeScript + Vite
- CSS-in-JS (인라인 스타일), CSS 변수 (`--primary: #FF5640`)
- Google Maps JS API (DirectionsService, DirectionsRenderer)
- AutocompleteInput 컴포넌트 (출발지/목적지 자동완성)

### 백엔드 (`src/`)
- Spring Boot 4.x, Java 17
- JPA/Hibernate + H2(local) / MySQL(prod)
- Claude API (Anthropic) — 타임아웃: 연결 15s, 읽기 120s
- Google Places API — 실좌표 조회로 AI 할루시네이션 방지

---

## 서버 실행
```bash
# 백엔드
./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트엔드
cd frontend && npm run dev
```
