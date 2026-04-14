# Quick Task 260415-9ek — Fix audit_log.detail JSON constraint

**Date:** 2026-04-15
**Status:** Completed

## Problem

Login 시 `AuditAspect`가 `audit_log.detail` (JSON 타입) 에 `"Email: user@example.com"` 같은 평문 문자열을 저장하려다 MariaDB의 `JSON_VALID` CHECK 제약 (`audit_log.detail`) 위반으로 실패.

```
CONSTRAINT `audit_log.detail` failed for `micesign`.`audit_log`
```

## Root Cause

`AuditLogService.log`에는 `Map<String,Object>` 오버로드(ObjectMapper 직렬화)와 pre-serialized `String` 오버로드가 모두 존재. `AuditAspect`는 `String` 오버로드를 호출하여 평문을 그대로 JSON 컬럼에 저장했다.

## Fix

`backend/src/main/java/com/micesign/aspect/AuditAspect.java`:
- `java.util.Map` import 추가
- 두 login 호출을 `Map.of("email", ...)` 형태로 변경 → `Map` 오버로드로 라우팅 → `ObjectMapper`가 유효 JSON으로 직렬화

## Files Changed

- `backend/src/main/java/com/micesign/aspect/AuditAspect.java`

## Verification

- `./gradlew compileJava` 통과
