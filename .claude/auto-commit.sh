#!/bin/bash
# ── dagalle 자동 커밋+푸시 스크립트 ──────────────────────────────
# 변경 파일 종류에 따라 frontend_dev_* or backend_dev_* 브랜치에 자동 커밋
# 버전 규칙: major.minor.patch (구조변경.중규모.소규모)

set -euo pipefail

REPO="/Users/jang-gunho/Library/Mobile Documents/com~apple~CloudDocs/Desktop/Spring/dagalle"
cd "$REPO"

# 변경사항 없으면 종료
if git diff --quiet && git diff --staged --quiet && [ -z "$(git ls-files --others --exclude-standard | grep -v '^\.DS_Store' | grep -v '^server\.log')" ]; then
  exit 0
fi

ORIG_BRANCH=$(git branch --show-current)

# 최신 버전 브랜치 탐색 (semver 내림차순)
FRONTEND_BRANCH=$(git branch --list 'frontend_dev_*' | tr -d ' *' | sort -t. -k1,1V -k2,2V -k3,3V | tail -1)
BACKEND_BRANCH=$(git branch --list 'backend_dev_*'  | tr -d ' *' | sort -t. -k1,1V -k2,2V -k3,3V | tail -1)

# 변경 파일 분류 (DS_Store, server.log 제외)
FE_FILES=$(git status --porcelain | awk '{print $2}' | grep '^frontend/' || true)
BE_FILES=$(git status --porcelain | awk '{print $2}' | grep -v '^frontend/' | grep -v '^\.' | grep -v '^server\.log' | grep -v '^\.claude/' || true)

HAS_FE=$(echo "$FE_FILES" | grep -c '.' 2>/dev/null || true)
HAS_BE=$(echo "$BE_FILES" | grep -c '.' 2>/dev/null || true)

commit_to() {
  local target="$1"
  local files="$2"
  local label="$3"

  [ -z "$target" ] && echo "⚠️  $label 브랜치 없음 — 스킵" && return
  [ "$files" = "" ] && return

  # 변경사항을 patch로 보존 후 브랜치 이동
  git stash push -u -m "auto-commit-$label" -- $files 2>/dev/null || true

  git checkout "$target" 2>/dev/null

  git stash pop 2>/dev/null || true

  # 해당 파일만 스테이징
  echo "$files" | xargs git add 2>/dev/null || true

  local msg_files
  msg_files=$(echo "$files" | head -4 | xargs -I{} basename {} | tr '\n' ' ')
  local timestamp
  timestamp=$(date '+%m-%d %H:%M')

  git commit -m "auto[$label]: $msg_files· $timestamp" 2>/dev/null && \
    git push origin "$target" 2>/dev/null && \
    echo "✅ $label → $target 커밋+푸시 완료" || \
    echo "⚠️  $label 커밋 실패"

  git checkout "$ORIG_BRANCH" 2>/dev/null
}

# 분기 커밋
if [ "$HAS_FE" -gt 0 ]; then
  commit_to "$FRONTEND_BRANCH" "$FE_FILES" "frontend"
fi

if [ "$HAS_BE" -gt 0 ]; then
  commit_to "$BACKEND_BRANCH" "$BE_FILES" "backend"
fi
