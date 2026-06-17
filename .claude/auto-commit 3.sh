#!/bin/bash
# ── dagalle 자동 커밋+푸시 & 버전 자동 판단 스크립트 ─────────────
# 변경 내용을 분석해 major/minor/patch를 스스로 판단,
# 필요하면 새 브랜치(버전업)를 생성하고 커밋+푸시합니다.
#
# 버전 판단 기준
#  major: App.tsx·main.tsx·router + 8개↑ 동시 변경 | build.gradle + 엔티티 + 12개↑
#  minor: 새 파일(.tsx/.ts/.java) 생성 포함
#  patch: 기존 파일만 수정 (스타일·버그픽스·텍스트)
# ─────────────────────────────────────────────────────────────────

set -euo pipefail

REPO="/Users/jang-gunho/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Spring/dagalle"
cd "$REPO"

# ── 0. 변경사항 없으면 종료 ──────────────────────────────────────
UNTRACKED=$(git ls-files --others --exclude-standard \
  | grep -vE '^(\.|server\.log|CLAUDE\.md)' || true)
if git diff --quiet && git diff --staged --quiet && [ -z "$UNTRACKED" ]; then
  exit 0
fi

ORIG_BRANCH=$(git branch --show-current)

# ── 1. 버전 헬퍼 ─────────────────────────────────────────────────
get_version() { echo "$1" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+$'; }

bump_version() {
  local ver="$1" level="$2"
  local major minor patch
  IFS='.' read -r major minor patch <<< "$ver"
  case "$level" in
    major) echo "$((major+1)).0.0" ;;
    minor) echo "${major}.$((minor+1)).0" ;;
    patch) echo "${major}.${minor}.$((patch+1))" ;;
  esac
}

latest_branch() {
  git branch --list "${1}*" \
    | tr -d ' *' \
    | sort -t. -k1,1V -k2,2V -k3,3V \
    | tail -1
}

# ── 2. 변경 레벨 판단 ────────────────────────────────────────────
determine_level() {
  local is_fe="$1"   # true | false

  if $is_fe; then
    local porcelain
    porcelain=$(git status --porcelain | grep ' frontend/' || true)
    local new_count total_count has_structural

    new_count=$(echo "$porcelain"   | grep -c '^??' || true)
    total_count=$(echo "$porcelain" | grep -c '.'   || true)
    has_structural=$(echo "$porcelain" \
      | grep -cE '(App\.tsx|main\.tsx|router|routes)' || true)

    if [ "$has_structural" -gt 0 ] && [ "$total_count" -ge 8 ]; then
      echo "major"
    elif [ "$new_count" -gt 0 ]; then
      echo "minor"
    else
      echo "patch"
    fi
  else
    local porcelain
    porcelain=$(git status --porcelain \
      | grep -v ' frontend/' \
      | grep -vE ' (\.|server\.log|CLAUDE\.md|\.claude/)' || true)
    local new_count total_count has_build has_entity

    new_count=$(echo "$porcelain"   | grep -c '^??' || true)
    total_count=$(echo "$porcelain" | grep -c '.'   || true)
    has_build=$(echo "$porcelain"   | grep -c 'build\.gradle' || true)
    has_entity=$(echo "$porcelain"  | grep -cE '(entity|Entity)' || true)

    if { [ "$has_build" -gt 0 ] || [ "$has_entity" -gt 0 ]; } \
       && [ "$total_count" -ge 12 ]; then
      echo "major"
    elif [ "$new_count" -gt 0 ]; then
      echo "minor"
    else
      echo "patch"
    fi
  fi
}

# ── 3. 브랜치 선택 (필요 시 버전업 브랜치 생성) ──────────────────
resolve_branch() {
  local prefix="$1" level="$2"
  local current_branch cur_ver new_ver new_branch

  current_branch=$(latest_branch "$prefix")

  if [ -z "$current_branch" ]; then
    new_branch="${prefix}1.0.0"
    git checkout -b "$new_branch" 2>/dev/null || true
    git push origin "$new_branch" 2>/dev/null || true
    git checkout "$ORIG_BRANCH" 2>/dev/null || true
    echo "$new_branch"; return
  fi

  if [ "$level" = "patch" ]; then
    echo "$current_branch"; return
  fi

  cur_ver=$(get_version "$current_branch")
  new_ver=$(bump_version "$cur_ver" "$level")
  new_branch="${prefix}${new_ver}"

  if ! git branch --list "$new_branch" | grep -q .; then
    git checkout -b "$new_branch" "$current_branch" 2>/dev/null
    git push origin "$new_branch" 2>/dev/null
    git checkout "$ORIG_BRANCH" 2>/dev/null
    echo "🆕 [$level] 새 브랜치: $new_branch" >&2
  fi
  echo "$new_branch"
}

# ── 4. 커밋 실행 ─────────────────────────────────────────────────
commit_to() {
  local target="$1" file_grep="$2" label="$3" level="$4"
  [ -z "$target" ] && return

  local files
  files=$(git status --porcelain \
    | awk '{print $2}' \
    | grep -E "$file_grep" \
    | grep -vE '^\.(DS_Store)|^server\.log$' || true)
  [ -z "$files" ] && return

  # 스태시 후 브랜치 이동
  git stash push -u -m "auto-$label" -- $files 2>/dev/null || {
    git add $files 2>/dev/null || true
  }
  git checkout "$target" 2>/dev/null
  git stash pop 2>/dev/null || true

  echo "$files" | xargs -I{} git add {} 2>/dev/null || true

  local names ts
  names=$(echo "$files" | xargs -I{} basename {} | head -4 | tr '\n' ' ')
  ts=$(date '+%m-%d %H:%M')

  git commit -m "auto[$label/$level]: ${names}· $ts" 2>/dev/null \
    && git push origin "$target" 2>/dev/null \
    && echo "✅ $label($level) → $target" \
    || echo "⚠️  $label 커밋 실패"

  git checkout "$ORIG_BRANCH" 2>/dev/null
}

# ── 5. 메인 ──────────────────────────────────────────────────────
# 프론트엔드
if git status --porcelain | grep -q ' frontend/'; then
  FE_LEVEL=$(determine_level true)
  FE_BRANCH=$(resolve_branch "frontend_dev_" "$FE_LEVEL")
  commit_to "$FE_BRANCH" "^frontend/" "frontend" "$FE_LEVEL"
fi

# 백엔드
if git status --porcelain \
     | grep -v ' frontend/' \
     | grep -vE ' (\.|server\.log|CLAUDE\.md|\.claude/)' \
     | grep -q '.'; then
  BE_LEVEL=$(determine_level false)
  BE_BRANCH=$(resolve_branch "backend_dev_" "$BE_LEVEL")
  commit_to "$BE_BRANCH" "^(src/|build\.gradle|settings\.gradle)" "backend" "$BE_LEVEL"
fi
