# dagalle 프로젝트 Claude 규칙

> 2026-08-12 전면 개정. 이전 버전의 `frontend_dev_X.Y.Z` / `backend_dev_X.Y.Z` 전략은
> 브랜치 16개를 만들어 폐기했다. 상세 경위는 `docs/branch-strategy.md` 참고.

---

## 프로젝트 개요

**다갈래** — 일본·베트남·태국 3개국 대상 AI 여행 일정 설계 플랫폼.

| 항목 | 내용 |
|------|------|
| 대상 국가 | 🇯🇵 일본(1순위) · 🇻🇳 베트남 · 🇹🇭 태국 |
| 타겟 | 20~30대 / 혼자 · 연인 · 가족 |
| 여행 기간 | 2일 ~ 30일 (16일 이상은 분할 생성) |
| 개발 인원 | **1인** |
| 작업 순서 | 백엔드 우선, 프론트는 마지막 |

재기획 문서는 Notion `🔄 재기획 v2 — 3개국 (2026.08)` 에 있다.
방향이 바뀌면 **반드시 그 안의 「00. 결정 로그」에 먼저 기록**한다.
기록하지 않은 방향 전환이 기획서와 코드를 갈라놓은 원인이었다.

---

## 브랜치 전략

`main` 하나를 줄기로 두고, 짧게 사는 작업 브랜치만 붙였다 뗀다.

| 종류 | 수명 | 규칙 |
|------|------|------|
| `main` | 영구 | 항상 빌드 가능. **직접 커밋 금지** |
| 작업 브랜치 | 최대 3일 | 목적 하나당 하나. 머지 즉시 삭제 |

### 이름 규칙

```
<타입>/<도메인>-<요약>
```

타입: `feat` `fix` `refactor` `chore` `docs` `test`
도메인: `user` `travel` `plan` `ai` `location` `restaurant` `cost` / `frontend` `infra`

예시 — `feat/plan-drag-reorder`, `fix/plan-transit-fare-jp`, `chore/gradle-upgrade`

### 금지 사항

- ❌ 버전 번호를 브랜치명에 넣지 않는다 (`feat/v2-plan` 같은 이름)
- ❌ `frontend_dev_*`, `backend_dev_*` 같은 **상시 브랜치**를 만들지 않는다
- ❌ `main`에 직접 커밋하지 않는다

### 버전은 태그로

```bash
git tag -a v1.1.0 -m "맛집 추천 화면 연결"
git push origin v1.1.0
```

버전 판정(major/minor/patch)은 **사람이 릴리스 시점에** 한다.
스크립트가 파일 개수로 추측하게 두지 않는다 — 그 추측이 브랜치 14개를 만들었다.

---

## Claude 작업 규칙

1. **작업 전 현재 브랜치를 확인**한다. `main`이면 작업 브랜치를 먼저 만든다.
2. 커밋 메시지는 `<타입>(<도메인>): <요약>` 형식으로 쓴다.
   `auto: TravelListPage.tsx` 같은 **파일명 나열 커밋은 금지**한다.
3. `git add -A`를 쓰지 않는다 — iCloud 충돌 사본(`* 2.md`)까지 쓸어 담는다. 경로를 명시한다.
4. 브랜치 생성·`checkout`·`stash`를 자동화 스크립트로 수행하지 않는다.
5. 국가 분기가 필요하면 `if (isJp)`를 쓰지 말고 `CountryProfile`에 넣는다.

---

## 아키텍처 원칙

### 국가 확장은 클래스 추가로만

국가를 하나 더 지원할 때 **기존 파일을 고치면 설계가 틀린 것**이다.
`CountryProfile` 구현 클래스 하나만 추가해서 동작해야 한다.

```java
// ❌ 이렇게 하지 않는다
boolean isJp = "JP".equalsIgnoreCase(countryCode);

// ⭕ 이렇게 한다
CountryProfile profile = countryProfileRegistry.require(countryCode);
```

`countryCode`에 **기본값을 두지 않는다.** 기본값 `"JP"`가 있으면 국가를 빠뜨린 코드가
조용히 일본으로 동작해 버그를 숨긴다. `require()`가 예외를 던지게 한다.

### 수치는 LLM이 아니라 코드가 계산한다

AI에게는 창의적 구성(장소 선정·순서)을 맡기고, **정확해야 하는 값은 코드가 재계산**한다.
교통비가 대표 사례 — `WALK`는 무조건 0원, 궤도 교통은 요금표로 강제 재계산한다.
상세 근거는 `docs/technical-decisions.md` 3번.

### 외부 API는 실패한다고 전제한다

Google Directions는 일본 대중교통 구간에서 자주 실패한다(실측 8건).
단계적 폴백을 두어 어떤 경우에도 화면이 비지 않게 한다. 상세는 `docs/technical-decisions.md` 7번.

---

## 기술 스택

### 백엔드 (`src/`)
- Spring Boot 4.x, Java 17
- JPA/Hibernate + H2(local) / MySQL(prod)
- Redis(운영) / InMemory(로컬) — `TokenStore` 인터페이스로 분기
- Claude API — 타임아웃: 연결 15s, 읽기 120s
- Google Places / Routes API — 실좌표 조회로 AI 할루시네이션 방지

### 프론트엔드 (`frontend/`)
- React 18 + TypeScript + Vite
- CSS-in-JS (인라인 스타일), CSS 변수 (`--primary: #FF5640`)
- Google Maps JS API (DirectionsService, DirectionsRenderer)

---

## 서버 실행

```bash
# 백엔드
./gradlew bootRun --args='--spring.profiles.active=local'

# 프론트엔드
cd frontend && npm run dev
```

---

## 저장소 주의사항

이 저장소는 **iCloud Drive 안에 있다**. iCloud가 동기화 충돌을 만들면
`CLAUDE 2.md`처럼 **공백 + 숫자**가 붙은 사본이 생긴다.
`.gitignore`에서 차단하고 있으나, 발견하면 커밋하지 말고 삭제한다.

> 근본적으로는 저장소를 iCloud 밖(`~/dev/dagalle` 등)으로 옮기는 편이 안전하다.
> iCloud는 `.git` 내부 파일도 동기화 대상으로 삼아 저장소 손상 위험이 있다.
