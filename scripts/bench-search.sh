#!/usr/bin/env bash
# ============================================================
# Phase 30 Bench Script — /api/v1/documents/search NFR-01 실측
# ============================================================
#
# 사용법:
#   1. backend 가 bench 시드된 dev DB 에 연결되어 동작 중이어야 함
#      (./gradlew bootRun --args='--spring.profiles.active=bench' 로 seed 후
#       일반 프로필로 재기동)
#   2. SUPER_ADMIN 계정으로 JWT 획득 — V2__seed_initial_data.sql 의 계정 참조
#      (admin@micesign.com / admin1234!)
#      자동 로그인 미구현 (Revision 1 WARNING 4) — 수동으로 토큰 획득 후 export.
#   3. BENCH_JWT=<token> ./scripts/bench-search.sh
#
# 환경변수:
#   BENCH_JWT          — 필수. SUPER_ADMIN 의 access token
#   BENCH_BASE_URL     — 기본값 http://localhost:8080
#   BENCH_N            — 총 요청 수 (기본 10000)
#   BENCH_CONCURRENCY  — 동시성 (기본 50)
#
# 결과:
#   .planning/phases/30-where/30-BENCH-REPORT.md 의 "실측 결과" 섹션에 append.
#   3 시나리오: 기본 검색 / 키워드 검색 / 복합 필터.
#
# 보안:
#   ab 호출 시 Authorization 헤더가 ps 출력에는 안 보이지만 shell history 에는
#   BENCH_JWT 환경변수가 남을 수 있음. dev 머신 본인 사용 전용 (T-30-11).
#   공유 머신에서는 절대 사용 금지.
# ============================================================

set -u  # nounset — undeclared variable 사용 시 즉시 에러

BASE_URL="${BENCH_BASE_URL:-http://localhost:8080}"
N="${BENCH_N:-10000}"
C="${BENCH_CONCURRENCY:-50}"
REPORT_FILE=".planning/phases/30-where/30-BENCH-REPORT.md"

# --- JWT 가드 (자동 로그인 없음) ---
if [ -z "${BENCH_JWT:-}" ]; then
  echo "ERROR: BENCH_JWT 환경변수 미설정"
  echo ""
  echo "SUPER_ADMIN 수동 로그인 필요. V2__seed_initial_data.sql 의 계정 사용:"
  echo "  email:    admin@micesign.com"
  echo "  password: admin1234!"
  echo ""
  echo "1. JWT 획득:"
  echo "   curl -X POST $BASE_URL/api/v1/auth/login \\"
  echo "     -H 'Content-Type: application/json' \\"
  echo "     -d '{\"email\":\"admin@micesign.com\",\"password\":\"admin1234!\"}' \\"
  echo "     | jq -r .data.accessToken"
  echo ""
  echo "2. export BENCH_JWT=<token>"
  echo "3. ./scripts/bench-search.sh 재실행"
  exit 1
fi

# --- 도구 가드 ---
if ! command -v ab >/dev/null 2>&1; then
  echo "ERROR: ab (Apache Bench) 미설치"
  echo "  macOS:   /usr/sbin/ab 가 시스템 기본 (별도 설치 불필요)"
  echo "  Ubuntu:  sudo apt install apache2-utils"
  exit 1
fi

# --- 리포트 헤더 append ---
timestamp=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
mkdir -p "$(dirname "$REPORT_FILE")"
if [ ! -f "$REPORT_FILE" ]; then
  echo "ERROR: $REPORT_FILE 가 존재하지 않습니다 (Plan 30-05 Task 2 가 먼저 작성해야 함)"
  exit 1
fi

{
  echo ""
  echo "---"
  echo ""
  echo "## 실측 결과 — 실행 $timestamp"
  echo ""
  echo "- BASE_URL: \`$BASE_URL\`"
  echo "- 부하 파라미터: n=$N, c=$C"
  echo ""
} >> "$REPORT_FILE"

# --- 시나리오 실행 함수 ---
run_scenario() {
  local label="$1"
  local url="$2"

  echo ""
  echo "=== Scenario: $label ==="
  echo "    URL: $url"

  local output
  output=$(ab -n "$N" -c "$C" -H "Authorization: Bearer $BENCH_JWT" "$url" 2>&1)
  local exit_code=$?

  if [ $exit_code -ne 0 ]; then
    echo "ab 실행 실패 (exit=$exit_code) — output:"
    echo "$output" | tail -20
    {
      echo "### $label"
      echo ""
      echo "- URL: \`$url\`"
      echo "- **FAILED** — ab 실행 에러 (exit=$exit_code)"
      echo ""
      echo '```'
      echo "$output" | tail -20
      echo '```'
      echo ""
    } >> "$REPORT_FILE"
    return
  fi

  local p50 p95 p99 mean rps failed
  p50=$(echo "$output"  | awk '/^  50%/ {print $2}')
  p95=$(echo "$output"  | awk '/^  95%/ {print $2}')
  p99=$(echo "$output"  | awk '/^  99%/ {print $2}')
  mean=$(echo "$output" | awk '/^Time per request:.*\(mean\)/ {print $4}')
  rps=$(echo "$output"  | awk '/^Requests per second:/ {print $4}')
  failed=$(echo "$output" | awk '/^Failed requests:/ {print $3}')

  local verdict
  if [ -z "$p95" ]; then
    verdict="**측정 실패** — ab output 에서 95% percentile 추출 실패"
  elif [ "$(awk -v v="$p95" 'BEGIN{print (v+0 < 1000) ? 1 : 0}')" = "1" ]; then
    verdict="**NFR-01 PASS** (95p ${p95}ms ≤ 1000ms)"
  else
    verdict="**NFR-01 FAIL** (95p ${p95}ms > 1000ms) — V20 migration 권장 (D-D2)"
  fi

  {
    echo "### $label"
    echo ""
    echo "- URL: \`$url\`"
    echo "- 50p: ${p50} ms"
    echo "- **95p: ${p95} ms**"
    echo "- 99p: ${p99} ms"
    echo "- Mean: ${mean} ms"
    echo "- RPS: ${rps}"
    echo "- Failed requests: ${failed}"
    echo "- 판정: $verdict"
    echo ""
    echo "<details><summary>Raw ab output</summary>"
    echo ""
    echo '```'
    echo "$output" | tail -30
    echo '```'
    echo ""
    echo "</details>"
    echo ""
  } >> "$REPORT_FILE"

  echo "    95p=${p95}ms, RPS=${rps} → $verdict"
}

# --- 시나리오 1: 기본 검색 (필터 없음, page=0) ---
run_scenario "기본 검색 (필터 없음, page=0)" \
  "$BASE_URL/api/v1/documents/search?tab=search&page=0&size=20"

# --- 시나리오 2: 키워드 검색 (keyword=문서) ---
run_scenario "키워드 검색 (keyword=문서)" \
  "$BASE_URL/api/v1/documents/search?tab=search&page=0&size=20&keyword=%EB%AC%B8%EC%84%9C"

# --- 시나리오 3: 복합 필터 (status×2 + templateCode + drafterId) ---
run_scenario "복합 필터 (status=SUBMITTED+APPROVED + templateCode=GENERAL + drafterId=1001)" \
  "$BASE_URL/api/v1/documents/search?tab=search&page=0&size=20&status=SUBMITTED&status=APPROVED&templateCode=GENERAL&drafterId=1001"

echo ""
echo "============================================================"
echo "Bench complete. Results appended to $REPORT_FILE"
echo "============================================================"
