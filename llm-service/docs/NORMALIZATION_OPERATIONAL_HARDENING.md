# 쿼리 정규화 레이어 - 운영 강화 종합 설계서

> **문서 목적**: 현재 가동 중인 3-Layer 쿼리 정규화 시스템(L1 자모 퍼지, L2 오타 사전, L3 LLM 폴백)을
> **운영 안정성, 자기 개선 능력, 비용 효율성** 측면에서 강화하기 위한 종합 설계 문서.
>
> **핵심 원칙**: 거짓 양성 최소화 / L1-L2 결정성 유지 / L3 최소 호출 — 이 철학을 절대 훼손하지 않는다.

---

## 목차

1. [현재 시스템 현황과 개선 레버리지](#1-현재-시스템-현황과-개선-레버리지)
2. [강화된 설계 원칙 10가지](#2-강화된-설계-원칙-10가지)
3. [Phase 1: Redis 캐시 + 이벤트 로깅 + 서킷브레이커](#3-phase-1-redis-캐시--이벤트-로깅--서킷브레이커)
4. [Phase 2: 오타 사전 자동 확장 (Shadow Pipeline)](#4-phase-2-오타-사전-자동-확장-shadow-pipeline)
5. [Phase 3: 임계값 자동 튜닝](#5-phase-3-임계값-자동-튜닝)
6. [운영 하드닝 체크리스트](#6-운영-하드닝-체크리스트)
7. [KPI 지표 6개](#7-kpi-지표-6개)
8. [파일 변경 요약](#8-파일-변경-요약)
9. [검증 계획](#9-검증-계획)

---

## 1. 현재 시스템 현황과 개선 레버리지

### 1.1 현재 3-Layer가 성공한 이유

| 속성 | 현재 상태 |
| --- | --- |
| L1/L2는 빠르고 결정적 | `fuzzy_keyword_in_query()` 0ms, `apply_typo_corrections()` 0ms |
| L3는 UNKNOWN일 때만 호출 | `chat_workflow_v2.py:560-585` 조건부 LLM 호출 |
| 거짓 양성 억제 장치 | threshold 0.82, 동일 길이 윈도우만 사용 |
| 테스트 커버리지 | 91개 테스트 통과 (단위 53 + 통합 15 + P0 회귀 23) |

### 1.2 개선 목표: "더 많이 맞추자"가 아니라

- UNKNOWN을 **더 줄이되**
- 거짓 양성을 **더 줄이고**
- 비용/지연을 **더 줄이며**
- 회귀 위험을 **제어하는** 방향

### 1.3 세 가지 개선의 레버리지

| 개선 항목 | 레버리지 유형 | 핵심 효과 |
| --- | --- | --- |
| Redis 캐시 | 지연/비용 | L3 중복 호출 제거, 인스턴스 간 캐시 공유 |
| 오타 사전 자동 확장 | 정확도/커버리지 | L3 성공 패턴을 L2로 승격하여 L3 호출 자체를 줄임 |
| 임계값 자동 튜닝 | FP/FN 균형 | 키워드 그룹별 최적 임계값으로 정밀도 향상 |

### 1.4 재사용 가능한 기존 인프라

| 컴포넌트 | 위치 | 상태 |
| --- | --- | --- |
| `RedisConfig` + `get_redis_config()` | `config/database.py:124-177` | 준비됨, 정규화에서 미사용 |
| `REDIS_HOST/PORT/PASSWORD/DB` 환경변수 | `.env.example:40-43` | 정의됨 |
| Docker Redis 서비스 | `docker-compose.yml:31-42` | 가동 중, llm-service에 미연결 |
| `context_snapshot.py` Redis 패턴 | `context/context_snapshot.py:224-268` | Redis+메모리 폴백 참조 패턴 |
| P4 이벤트 시스템 | `observability/p4_events.py` | EventType, P4EventEmitter, PIIMasker 보유 |
| `LLMNormalizerCache` 인메모리 | `utils/korean_normalizer.py:227-252` | 현재 구현 (확장 대상) |
| Config 패턴 (frozen dataclass) | `config/constants.py` | 따를 패턴 |
| `LLMServiceState` 싱글톤 | `service_state.py` | Redis 클라이언트 주입 지점 |

---

## 2. 강화된 설계 원칙 10가지

리뷰를 통해 도출된 운영 안전성 원칙. 모든 Phase에 적용된다.

| # | 원칙 | 근거 |
| --- | --- | --- |
| 1 | **Redis: "있으면 쓰고, 흔들리면 즉시 포기"** | Redis 장애가 요청 경로 전체의 p95를 늘리는 것을 방지. 서킷브레이커 + 짧은 timeout 필수. |
| 2 | **캐시 키에 `q_fingerprint` 포함** | 캐시 키(sha16)만으로는 운영 디버깅 시 역추적 불가. 이벤트↔캐시 연결을 위해 value에 full sha256 fingerprint 포함. |
| 3 | **분류 캐시는 non-UNKNOWN만, 버전 키 포함** | UNKNOWN을 캐시하면 개선 기회 차단. `classifier_version + dict_version + threshold_version`을 키에 포함. |
| 4 | **Negative 캐시는 L3 실패 후에만 set** | "confirmed UNKNOWN" = (L1/L2로 UNKNOWN) AND (L3를 호출했지만 여전히 UNKNOWN). 이 조건에서만 negative 캐시 설정. |
| 5 | **L3 rate limit은 클러스터 단위** | 프로세스 단위 30/min이면 인스턴스 수만큼 총량 증가. Redis INCR+TTL로 클러스터 전체 제한, Redis 불가 시 로컬 폴백. |
| 6 | **이벤트 샘플링: 정상 10%, L3 100%** | 모든 요청 100% emit 시 비용 누적. 정상 케이스는 샘플링, L3/UNKNOWN 케이스는 전수 기록. |
| 7 | **후보 저장은 ZSET으로 교정 분산 측정** | 동일 원문에 대해 교정별 카운트를 ZSET으로 관리. `stability = top1_count / total_count`. intent 분포도 별도 ZSET. |
| 8 | **Admin API: RBAC + 감사 로그 + 배포 파이프라인** | 사전 직접 수정 금지. promote는 pending 상태로만 저장 → PR/배포 파이프라인으로 반영. |
| 9 | **임계값 튜닝: FP proxy 신호 정의 + 최소 샘플 가드** | FP를 측정할 proxy 신호(재질문 30초 내, 핸들러 empty/error, 패러프레이즈)를 명시. 그룹당 최소 1,000건 미만이면 추천 보류. |
| 10 | **후보 수집 시 PII는 fingerprint만 저장** | `PIIMasker.mask_query()` 결과 + fingerprint 저장. 원문 복원 불가능하게 설계. |

---

## 3. Phase 1: Redis 캐시 + 이벤트 로깅 + 서킷브레이커

### 3.1 목표

인메모리 전용 캐시를 **계층화된 Redis+메모리 캐시**로 교체하고, 정규화 이벤트 로깅을 추가하여 Phase 2/3의 데이터 기반을 마련한다.

### 3.2 Redis 클라이언트 하드닝

#### 연결 옵션 (필수)

```python
redis.Redis(
    host=config.host,
    port=config.port,
    password=config.password or None,
    db=config.db,
    socket_connect_timeout=0.1,    # 100ms - 연결 시도 제한
    socket_timeout=0.15,            # 150ms - 명령 실행 제한
    retry_on_timeout=False,         # 재시도 없음 (즉시 폴백)
    health_check_interval=30,       # 30초마다 연결 상태 확인
    decode_responses=True,          # 문자열 자동 디코드
)
```

#### 서킷브레이커 (간이 구현)

```
상태: CLOSED (정상) → OPEN (차단) → HALF_OPEN (시험)

전환 조건:
- CLOSED → OPEN: 30초 내 Redis 오류 3회 이상
- OPEN → HALF_OPEN: 30초 경과 후 자동
- HALF_OPEN → CLOSED: 1회 성공
- HALF_OPEN → OPEN: 1회 실패

OPEN 상태에서는 Redis 접근 자체를 건너뛰고 메모리 캐시만 사용.
```

**핵심 효과**: Redis 장애가 "모든 요청마다 timeout"으로 증폭되는 것을 방지.

#### health_status 기준 변경

```
기존: redis_connected = ping() 성공 여부
변경: redis_usable = 서킷브레이커 상태가 CLOSED이고, 최근 30초 성공률 > 80%
```

### 3.3 NormalizationCacheManager 설계

#### 세 가지 캐시 유형

| 캐시 | 용도 | TTL | 조건 |
| --- | --- | --- | --- |
| 정규화 캐시 | raw_query -> normalized + layers | 1시간 | 항상 설정 |
| Negative 캐시 | raw_query -> "확인된 UNKNOWN" | 3분 | L3 호출 후에도 UNKNOWN인 경우만 |
| 분류 캐시 | normalized_query -> intent + confidence | 10분 | intent != UNKNOWN인 경우만 |

#### Redis 키 설계

```
정규화:  norm:v1:<sha256(query.strip().lower())[:16]>
Negative: neg:v1:<sha256(query.strip().lower())[:16]>
분류:    class:v1:<sha256(query)[:16]>:<classifier_ver>
```

#### Value 구조 (JSON)

```json
// 정규화 캐시
{
  "normalized": "테스트 중인 task는?",
  "layers": ["L2"],
  "q_fp": "a3b4c5d6e7f8...",        // full sha256 - 이벤트 연결용
  "ts": 1706745600
}

// 분류 캐시
{
  "intent": "tasks_by_status",
  "confidence": 0.92,
  "q_fp": "a3b4c5d6e7f8...",
  "classifier_ver": "v2.1",
  "dict_ver": "v1.0",
  "threshold_ver": "v1.0"
}
```

#### q_fingerprint의 역할

```
[문제] norm:v1:a3b4c5d6 캐시 키만으로는 "어떤 쿼리가 이 키인지" 역추적 불가
[해결] value에 full sha256(q_fp)을 저장하고, P4 이벤트에도 동일 q_fp를 남김
[효과] 장애 분석 시 "캐시 키 ↔ 이벤트 로그 ↔ 쿼리" 연결이 가능해짐
```

#### 메모리 폴백

Redis 불가 시 기존 `OrderedDict` + `threading.Lock` 패턴 그대로 사용 (256 entries).
`context_snapshot.py:237-268`의 Redis→메모리 폴백 패턴을 참조.

### 3.4 Negative 캐시 엄격 정의

```
"confirmed UNKNOWN"의 정의:

  1. L1/L2 정규화를 적용한 classifier.classify() 결과가 UNKNOWN
  AND
  2. L3 LLM 정규화를 호출했지만 여전히 UNKNOWN
  (= L3 교정 실패 또는 L3 교정 후 재분류도 UNKNOWN)

이 조건에서만 negative 캐시 set.
L1/L2만으로 UNKNOWN인 경우는 negative 캐시를 설정하지 않는다.
(L3가 교정할 가능성이 남아있으므로)
```

#### Canonical key

```python
canonical = query.strip().lower()  # 공백/대소문자만 정규화 (결정적/무손실)
neg_key = f"neg:v1:{sha256(canonical)[:16]}"
```

**주의**: canonicalization이 의미를 바꾸면 안 됨. 공백 정리 + lower() 수준만.

#### Negative 캐시 hit 시 이벤트 필수

```python
# negative 캐시 hit 시에도 이벤트를 남겨야
# "L3 storm 방어 효과"가 KPI에 잡힘
emit_event(QUERY_NORMALIZED, negative_cache_hit=True, ...)
```

### 3.5 L3 Rate Limit: 클러스터 단위

```
[문제] L3_MAX_CALLS_PER_MINUTE=30이 프로세스 단위면
       인스턴스 4대 → 실질적으로 120/min이 되어 비용 폭증 가능

[해결] 2단계 rate limit:

  1차: Redis INCR + TTL (클러스터 전체 제한)
     key: "l3_ratelimit:v1:<minute_bucket>"
     INCR 후 count > 30이면 L3 skip
     TTL 60초 자동 만료

  2차: Redis 불가 시 threading 기반 로컬 카운터 (프로세스 단위 30/min)

[효과] 인스턴스 수에 관계없이 L3 총량이 일정
```

### 3.6 QUERY_NORMALIZED 이벤트

#### P4 EventType 추가

```python
# observability/p4_events.py
class EventType(str, Enum):
    # ... 기존 ...
    # P0.5: Query Normalization
    QUERY_NORMALIZED = "query_normalized"
```

#### Payload 구조

```python
@dataclass
class QueryNormalizedPayload:
    original_query: str           # PIIMasker.mask_query() 적용
    normalized_query: str         # PIIMasker.mask_query() 적용
    q_fingerprint: str            # sha256(original)[:32] - 캐시 연결용
    layers_applied: List[str]     # ["L2"], ["L2","L3"], [] 등
    cache_hit: bool               # 정규화 캐시 hit 여부
    negative_cache_hit: bool      # negative 캐시 hit 여부
    l3_called: bool               # L3 실제 호출 여부
    l3_success: bool              # L3가 non-UNKNOWN으로 이끌었는지
    original_intent: str          # 정규화 전 intent
    final_intent: str             # 정규화 후 최종 intent
    duration_ms: int              # 전체 정규화 소요 시간
    # 버전 정보 (회귀 분석용)
    normalizer_version: str       # 모듈 버전
    typo_dict_version: str        # 사전 버전
    threshold_version: str        # 임계값 설정 버전
```

#### 이벤트 샘플링 정책

```python
# config/constants.py - NormalizationConfig
EVENT_SAMPLE_RATE_NORMAL: float = 0.1    # 정상 분류: 10% 샘플링
EVENT_SAMPLE_RATE_L3: float = 1.0        # L3 호출/UNKNOWN: 100% 전수 기록

# 샘플링 판단 기준:
# - l3_called == True → 100% emit
# - negative_cache_hit == True → 100% emit (L3 방어 효과 측정)
# - 그 외 → 10% 랜덤 샘플링
```

### 3.7 NormalizationConfig

```python
# config/constants.py

@dataclass(frozen=True)
class NormalizationConfig:
    """쿼리 정규화 캐시 및 튜닝 설정."""

    # === Redis 캐시 TTL ===
    NORMALIZATION_CACHE_TTL_SECONDS: int = 3600      # 1시간: 정규화 결과
    NEGATIVE_CACHE_TTL_SECONDS: int = 180            # 3분: 확인된 UNKNOWN
    CLASSIFICATION_CACHE_TTL_SECONDS: int = 600      # 10분: 분류 결과

    # === 캐시 키 접두사 ===
    NORM_CACHE_PREFIX: str = "norm:v1:"
    NEG_CACHE_PREFIX: str = "neg:v1:"
    CLASS_CACHE_PREFIX: str = "class:v1:"

    # === Redis 서킷브레이커 ===
    CIRCUIT_BREAKER_FAILURE_THRESHOLD: int = 3       # 차단까지 실패 횟수
    CIRCUIT_BREAKER_WINDOW_SECONDS: int = 30         # 실패 감지 윈도우
    CIRCUIT_BREAKER_RECOVERY_SECONDS: int = 30       # OPEN 유지 시간

    # === L3 LLM 제어 ===
    L3_MAX_CALLS_PER_MINUTE: int = 30                # 클러스터 전체 rate limit
    L3_RATE_LIMIT_KEY: str = "l3_ratelimit:v1"

    # === 이벤트 샘플링 ===
    EVENT_SAMPLE_RATE_NORMAL: float = 0.1            # 정상: 10%
    EVENT_SAMPLE_RATE_L3: float = 1.0                # L3/UNKNOWN: 100%

    # === 기능 플래그 ===
    ENABLE_REDIS_CACHE: bool = True
    ENABLE_NEGATIVE_CACHE: bool = True
    ENABLE_EVENT_LOGGING: bool = True
    ENABLE_CANDIDATE_COLLECTION: bool = False         # Phase 2
    ENABLE_SHADOW_DICT: bool = False                  # Phase 2
    ENABLE_THRESHOLD_TUNING: bool = False             # Phase 3

NORMALIZATION = NormalizationConfig()
```

### 3.8 분류 캐시 적용 규칙 (중요)

```
[적용 위치] _classify_answer_type_node() 내부

[조회 (get)]
  1. normalized_query 기준으로 분류 캐시 조회
  2. hit → 바로 intent 결정 (L3 건너뜀)
  3. miss → 기존 classify() + L3 플로우 진행

[저장 (set)]
  조건: intent != UNKNOWN
  키: normalized_query + classifier_version + dict_version + threshold_version
  값: intent + confidence + q_fp

[금지]
  - UNKNOWN은 분류 캐시에 절대 저장하지 않음 (개선 기회 차단 방지)
  - UNKNOWN은 negative 캐시만 사용 (L3 실패 확인 후)
```

### 3.9 Workflow 통합 (chat_workflow_v2.py 수정)

```
기존 L3 블록 (lines 560-585) 수정 후 플로우:

  1. classifier.classify(message) → result

  2. IF result == UNKNOWN AND has_korean(message):
     a. negative 캐시 확인
        → hit: L3 건너뜀, negative_cache_hit=True 기록

     b. L3 rate limit 확인
        → 초과: L3 건너뜀

     c. normalize_query_with_llm(llm_l1, message)
        → 성공(normalized != message):
          - retry_result = classifier.classify(normalized)
          - retry_result != UNKNOWN: result 교체, 정규화 캐시 set
          - retry_result == UNKNOWN: negative 캐시 set (3분)
        → 실패/동일:
          - negative 캐시 set (3분)

  3. IF result != UNKNOWN:
     분류 캐시 set (version 키 포함)

  4. QUERY_NORMALIZED 이벤트 emit (샘플링 적용)
```

### 3.10 app.py 초기화

```python
# app.py - init_llm_service() 내부

from config.database import get_redis_config

try:
    import redis as redis_lib
    config = get_redis_config()
    redis_client = redis_lib.Redis(
        host=config.host,
        port=config.port,
        password=config.password or None,
        db=config.db,
        socket_connect_timeout=0.1,
        socket_timeout=0.15,
        retry_on_timeout=False,
        health_check_interval=30,
        decode_responses=True,
    )
    redis_client.ping()
    init_normalization_cache(redis_client)
    get_state().redis_client = redis_client
    logger.info("Redis connected for normalization cache")
except Exception as e:
    logger.warning(f"Redis unavailable ({e}), using memory-only cache")
    init_normalization_cache(None)  # 메모리 폴백
```

### 3.11 docker-compose.yml 수정

```yaml
# llm-service 환경변수 추가
environment:
  REDIS_HOST: ${REDIS_HOST:-redis}
  REDIS_PORT: ${REDIS_PORT:-6379}

# depends_on에 redis 추가
depends_on:
  redis:
    condition: service_healthy
```

---

## 4. Phase 2: 오타 사전 자동 확장 (Shadow Pipeline)

### 4.1 목표

L3 교정 성공 패턴을 **자동 수집**하고, **Shadow 사전**으로 안전하게 평가한 뒤,
**수동 승인**을 거쳐서만 프로덕션 사전에 반영한다.

**절대 원칙: 자동 수집은 OK, 자동 반영은 금지.**

### 4.2 왜 자동 확장이 효과 큰가

```
UNKNOWN → L3 교정 → 재분류 성공 패턴은
"사전에 추가하면 L3 호출이 줄어들 가능성이 큰 케이스"

즉, 비용과 지연을 줄이면서 커버리지를 늘릴 수 있다.
```

### 4.3 자동 추가 시 위험

```
L3 교정은 문맥 기반이라서:
- 같은 오타라도 상황에 따라 다른 교정이 나올 수 있음
- 사용자 의도가 애매한 경우, L3가 "그럴듯한" 방향으로 정규화할 수 있음
- 이것이 L2 사전에 자동 반영되면, 이후 L3 없이도 잘못된 교정이 상시 발생

"L3의 비결정성/추론성"이 "L2의 결정적 룰"로 승격되는 순간 사고가 남
```

### 4.4 3단계 안전 파이프라인

```
(A) 후보 수집 (자동)
    조건: UNKNOWN AND L3 교정 후 재분류 성공
    저장: fingerprint + 마스킹된 형태 (원문 저장 금지)

(B) 후보 정제 (자동 필터)
    - 동일 교정 N회 이상 반복 (기본: 10회)
    - 교정 안정성 > 0.9 (top1_count / total_count)
    - intent 안정성 > 0.9 (top_intent / total)
    - 토큰 길이 10자 이하
    - 일반 단어로의 과도 치환 배제

(C) 반영 (단계적)
    1단계: Shadow 사전에 반영 (실제 교정 없이 "했다면?" 기록만)
    2단계: Canary (1% 트래픽) 적용
    3단계: 전면 적용 (PR/배포 파이프라인 통해)
```

### 4.5 후보 수집 Redis 구조 (ZSET 기반)

```
[기존 설계의 문제]
단순 JSON으로 저장하면 "교정 분산(variance)" 측정이 어려움

[개선된 구조]

1. 원문별 교정 분포 (ZSET)
   키: typo:cand:v1:<orig_fp>
   member: <corrected_fp>
   score: count
   → stability = ZSCORE(top1) / SUM(all scores)

2. 원문 메타데이터 (HASH)
   키: typo:cand:meta:v1:<orig_fp>
   필드: first_seen, last_seen, total_count, masked_original

3. 교정별 intent 분포 (ZSET)
   키: typo:intent:v1:<orig_fp>:<corrected_fp>
   member: <intent>
   score: count
   → intent_stability = ZSCORE(top_intent) / SUM(all scores)

4. 승격 후보 (SET)
   키: typo:shadow:v1
   member: <orig_fp>:<corrected_fp>
```

**효과**: stability와 intent_stability가 단순 ZSET 연산으로 계산 가능.

### 4.6 PII 보호

```
후보 수집 시 저장 규칙:

[저장 O]
- sha256 fingerprint (original, corrected 각각)
- PIIMasker.mask_query() 적용된 마스킹 형태
- intent, count, timestamp

[저장 X]
- 원문 그대로 (raw query)
- 사용자 ID (필요 시 hash)
- 세션 정보

관리자 API에서도 fingerprint 기반으로만 표시.
원문 확인이 필요하면 별도 안전 장치(감사 로그 + 시간 제한 조회) 아래에서만.
```

### 4.7 Shadow 사전 평가

```
[원칙]
Shadow 교정은 실제 라우팅에 적용하지 않고, "적용했다면 결과가 달랐을지"만 기록

[비용 제어]
모든 요청에서 두 번 분류하면 비용 누적 → 조건부 실행:
- UNKNOWN이거나 L3가 호출된 케이스에만 shadow 비교
- 또는 5~10% 랜덤 샘플링
- 결과가 달라진 케이스만 이벤트 emit (차이 없으면 무시)

[이벤트]
SHADOW_DICT_EVALUATED:
  payload: {
    q_fp, shadow_corrected, production_intent, shadow_intent,
    would_change_routing: bool
  }
```

### 4.8 Admin API 설계

```
엔드포인트:
  GET  /api/normalization/candidates          # 필터된 후보 목록
  GET  /api/normalization/shadow-dict         # 현재 shadow 사전
  POST /api/normalization/shadow-dict/promote # 후보 → shadow 승격
  POST /api/normalization/typo-dict/promote   # shadow → production 승격 요청
  GET  /api/normalization/stats               # 캐시 통계, 후보 수, L3 호출률

보안 규칙:
  - RBAC: 관리자 role만 접근 가능
  - 감사 로그: 모든 promote 요청에 (누가/언제/무엇을/왜) 기록
  - production promote는 직접 dict 파일 수정이 아니라:
    API → config store에 pending → PR 생성/승인 → 배포
```

### 4.9 스코프 사전 (선택적 고도화)

```
사전을 전역(Global)으로 키우면 충돌 증가.
도메인/인텐트별 사전(Scoped Dictionary) 분리 가능:

예: PM 도메인 사전 (스프린트/백로그/이슈)
    vs 인사/예산 사전
    vs intent별 사전 (TASKS_BY_STATUS 관련 오타만)

효과: 한 영역에서 배운 오타가 다른 영역을 오염시키지 않음
```

---

## 5. Phase 3: 임계값 자동 튜닝

### 5.1 목표

데이터 기반으로 최적 임계값을 도출하되, **절대 자동 적용하지 않는다.**
반드시 오프라인 → Shadow → Canary 파이프라인을 거친다.

### 5.2 비용함수 (가중 최적화)

```
비용 = FP_count * W_fp + FN_count * W_fn + L3_count * W_l3

가중치:
  W_fp (거짓 양성) = 10   ← 가장 비쌈: 잘못된 라우팅
  W_fn (거짓 음성) = 3    ← 차선: UNKNOWN/RAG로 가는 비용
  W_l3 (L3 호출)  = 2    ← 지연/비용

목표: 이 비용함수를 최소화하는 threshold 탐색
```

### 5.3 FP proxy 신호 정의 (핵심)

```
운영에서 FP(거짓 양성)를 직접 측정할 수 없으므로 proxy 신호를 사용:

1. 사용자 재질문 (30초 이내)
   + "아니" / "무슨" / "다시" / "오타" 류 패턴 감지

2. 핸들러 결과가 empty/error
   (교정 후 라우팅된 intent의 핸들러가 데이터를 찾지 못함)

3. 사용자가 즉시 다른 표현으로 반복 질문 (패러프레이즈)

4. UI 행동: 답변 후 즉시 다른 메뉴로 이동 (있는 경우)

최소 1~2개를 P4 이벤트에 correlation id와 함께 남겨야
튜닝이 현실적으로 가능해진다.
```

### 5.4 키워드 그룹별 임계값

```
[단일 threshold 한계]
"스프린트"처럼 도메인 고유 단어는 임계값을 낮춰도 안전하지만,
"진행/상/중/률"처럼 의미가 갈리는 일반어는 높여야 안전.

[그룹별 설계]

NormalizationConfig.KEYWORD_GROUPS = {
    "domain_fixed": {
        "keywords": ["스프린트", "백로그", "태스크", "리스크"],
        "threshold": 0.80,
    },
    "ambiguous": {
        "keywords": ["진행", "상황", "현황", "완료"],
        "threshold": 0.85,
    },
    "default": {
        "threshold": 0.82,
    },
}

[구현]
- fuzzy_keyword_in_query(kw, query, keyword_group="default")
- keyword_group이 지정되면 KEYWORD_GROUPS에서 threshold를 읽음
- 코드 수정 없이 config 변경만으로 shadow/canary 가능

[classifier 연동]
- INTENT_PATTERNS의 keywords에 keyword_group 매핑 추가
- classifier가 fuzzy_keyword_in_query 호출 시 그룹 전달
```

### 5.5 최소 샘플 가드

```
추천 threshold는 sample_size가 충분할 때만 생성.
그룹당 이벤트 최소 1,000건 미만이면 "추천 보류" 처리.

그렇지 않으면 "최근 며칠 데이터에 흔들리는 임계값"이 나온다.
```

### 5.6 ThresholdRecommendation 구조

```python
@dataclass
class ThresholdRecommendation:
    keyword_group: str              # "domain_fixed" | "ambiguous" | "default"
    current_threshold: float        # 현재 적용 중인 값
    recommended_threshold: float    # 추천 값
    fp_rate_current: float          # 현재 FP proxy 비율
    fp_rate_recommended: float      # 추천 시 예상 FP proxy 비율
    fn_rate_current: float          # 현재 FN 비율 (UNKNOWN률)
    fn_rate_recommended: float      # 추천 시 예상 FN 비율
    sample_size: int                # 분석 대상 이벤트 수
    min_sample_met: bool            # 최소 샘플 조건 충족 여부
    confidence_interval: tuple      # (low, high) 95% CI
```

### 5.7 튜닝 파이프라인

```
1. 오프라인 배치 계산
   - 최근 N일 이벤트 로그 샘플
   - 그룹별 threshold 후보 생성 (0.01 단위 grid search)
   - 비용함수 최소화 지점 탐색

2. Shadow 비교
   - 현재 threshold vs 후보 threshold
   - 실제 교정 반영 없이 "했다면 결과가 어떻게 달라졌는지"만 기록
   - 최소 1주일 관찰

3. Canary 적용
   - 1% → 10% → 100% 단계적 확대
   - FP proxy 지표가 조금이라도 올라가면 즉시 롤백
```

---

## 6. 운영 하드닝 체크리스트

### 6.1 버전 관리

```
모든 P4 이벤트에 다음 버전 정보를 포함:

- normalizer_version   : korean_normalizer 모듈 버전
- typo_dict_version    : KOREAN_TYPO_MAP 버전
- threshold_map_version: KEYWORD_GROUPS/threshold 설정 버전
- classifier_version   : answer_type_classifier 규칙 버전
- ruleset_version      : INTENT_PATTERNS 세트 버전

이 정보가 없으면 Phase 2/3에서 "언제부터 좋아졌나/나빠졌나" 추적 불가.
캐시 키에도 관련 버전을 포함하여 규칙 변경 시 자동 무효화.
```

### 6.2 Singleflight: L3 동시성 중복 제거

```
[문제]
동일 질문이 동시에 여러 요청으로 들어오면 L3가 중복 호출

[해결]
raw_query fingerprint 기준으로:
- "이미 L3 처리 중이면" 짧게 대기하거나, 즉시 skip하고 기존 결과 사용

구현 계층:
- 인스턴스 내: in-memory Lock (threading.Lock per fingerprint)
- Redis 가능 시: best-effort 분산 락 (SET NX EX 패턴)

[효과]
negative 캐시와 함께 L3 폭주를 이중으로 방어
```

### 6.3 데이터 보존/개인정보

```
[규칙]
- Redis 저장: 원문/교정문 "그 자체" 저장 금지
- 마스킹된 짧은 형태 + fingerprint만 저장
- 원문 복원 불가능하게 설계
- 관리자 API: fingerprint 기반으로만 표시
- 필요 시 "샘플 확인" 기능을 별도 안전 장치(감사 로그 + 시간 제한 조회) 아래 제공
```

---

## 7. KPI 지표 6개

| # | KPI | 데이터 소스 | 목표 |
| --- | --- | --- | --- |
| 1 | UNKNOWN 비율 | P4 이벤트 (intent_classified) | 전체 쿼리의 15% 미만 |
| 2 | L3 호출 비율 | P4 이벤트 (query_normalized, l3_called=true) | 전체 쿼리의 5% 미만 |
| 3 | L3 재분류 성공률 | P4 이벤트 (l3_success=true) | L3 호출의 60% 이상 |
| 4 | 거짓 양성 의심률 | 재질문 30초 내 + FP proxy 신호 | 1% 미만 |
| 5 | p95 응답 지연 (L3 경로) | Metrics (answer_type_time_ms) | 800ms 미만 |
| 6 | Top 오타 후보 안정성 | Candidate collector (stability score) | 승격 후보 90% 이상 |

---

## 8. 파일 변경 요약

### 신규 파일

| 파일 | Phase | 용도 |
| --- | --- | --- |
| `services/normalization_cache.py` | 1 | 계층화 캐시 + 서킷브레이커 |
| `tests/test_normalization_cache.py` | 1 | 캐시 단위 테스트 |
| `tests/test_normalization_events.py` | 1 | 이벤트 페이로드 테스트 |
| `services/typo_candidate_collector.py` | 2 | L3 교정 후보 자동 수집 |
| `routes/normalization_admin_routes.py` | 2 | 관리자 API (사전/후보/통계) |
| `tests/test_typo_candidate_collector.py` | 2 | 후보 수집 테스트 |
| `services/threshold_tuner.py` | 3 | 오프라인 임계값 최적화 |
| `tests/test_threshold_tuner.py` | 3 | 임계값 튜닝 테스트 |

### 수정 파일

| 파일 | Phase | 변경 내용 |
| --- | --- | --- |
| `requirements.txt` | 1 | `redis>=5.0.0` 추가 |
| `docker-compose.yml` | 1 | llm-service에 REDIS_HOST/PORT 연결, depends_on 추가 |
| `config/constants.py` | 1, 3 | `NormalizationConfig` 추가, Phase 3에서 `KEYWORD_GROUPS` 추가 |
| `service_state.py` | 1 | `redis_client` 속성 추가 |
| `observability/p4_events.py` | 1, 2 | `QUERY_NORMALIZED`, `SHADOW_DICT_EVALUATED` 이벤트 추가 |
| `utils/korean_normalizer.py` | 1, 3 | 캐시 매니저 연동, 초기화 함수, 그룹별 임계값 |
| `workflows/chat_workflow_v2.py` | 1, 2 | negative 캐시, 이벤트 발행, 후보 수집 |
| `classifiers/answer_type_classifier.py` | 3 | keyword_group 전달 |
| `routes/__init__.py` | 2 | 관리자 blueprint 등록 |
| `app.py` | 1 | Redis 초기화 (timeout + 서킷브레이커) |

---

## 9. 검증 계획

### Phase 1 검증

```bash
cd llm-service

# 신규 테스트
.venv/bin/python -m pytest tests/test_normalization_cache.py -v
.venv/bin/python -m pytest tests/test_normalization_events.py -v

# 회귀 테스트 (반드시 전부 통과)
.venv/bin/python -m pytest tests/test_korean_normalizer.py -v
.venv/bin/python -m pytest tests/test_typo_tolerance_integration.py -v
.venv/bin/python -m pytest tests/test_p0_intent_routing.py -v
```

### Phase 2 검증

```bash
.venv/bin/python -m pytest tests/test_typo_candidate_collector.py -v

# + Phase 1 전체 회귀
```

### Phase 3 검증

```bash
.venv/bin/python -m pytest tests/test_threshold_tuner.py -v

# 핵심: 그룹별 임계값 변경 후 퍼지 매칭 회귀
.venv/bin/python -m pytest tests/test_korean_normalizer.py tests/test_typo_tolerance_integration.py -v
```

### 수동 검증

```
Redis 연결 테스트:
  1. Redis 정상: 캐시 hit/miss 정상 동작
  2. Redis 중단: 서킷브레이커 → 메모리 폴백 → 30초 후 자동 복구
  3. Redis 느림: timeout 150ms 초과 → 즉시 폴백

Negative 캐시 테스트:
  1. UNKNOWN 쿼리 반복 → L3 1회만 호출, 이후 negative 캐시 hit
  2. 3분 경과 후 → negative 캐시 만료, L3 재호출 가능

이벤트 검증:
  1. 정상 분류 → 10% 확률로 이벤트 발행
  2. L3 호출 → 100% 이벤트 발행
  3. 이벤트에 q_fingerprint, 버전 정보 포함 확인
```
