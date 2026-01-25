# Phase 1: Gates & Foundation

## 목표
현재 구조 위에 AI 안전장치(Gates)를 추가하여 "챗봇"에서 "제어된 AI 시스템"으로 전환

## 예상 기간
2-3주

---

## 1. Decision Authority Gate

### 1.1 개요
AI 응답을 4단계 권한 수준으로 분류하여 무분별한 자동 실행 방지

| Authority Level | 설명 | 예시 |
|-----------------|------|------|
| `SUGGEST` | 정보 제공/추천만 | "이 백로그를 다음 스프린트에 포함하는 것을 권장합니다" |
| `DECIDE` | AI가 판단 (사용자 확인 불필요) | "이 질문은 Casual로 분류됩니다" |
| `EXECUTE` | 시스템 변경 실행 (되돌리기 가능) | "주간보고 초안을 생성했습니다" |
| `COMMIT` | 영구적 변경 (승인 필요) | "스프린트를 확정하려면 승인해주세요" |

### 1.2 구현 파일

#### A. Python - Authority Classifier
**파일:** `llm-service/authority_classifier.py`

```python
from enum import Enum
from typing import Dict, Any, Optional
from dataclasses import dataclass

class AuthorityLevel(Enum):
    SUGGEST = "suggest"      # 정보 제공만
    DECIDE = "decide"        # AI 자체 판단
    EXECUTE = "execute"      # 실행 (되돌리기 가능)
    COMMIT = "commit"        # 영구 변경 (승인 필요)

@dataclass
class AuthorityResult:
    level: AuthorityLevel
    reason: str
    requires_approval: bool
    approval_type: Optional[str] = None  # "user" | "manager" | "admin"

# Intent → Authority 매핑
INTENT_AUTHORITY_MAP = {
    # Information queries
    "project_status_query": AuthorityLevel.SUGGEST,
    "backlog_query": AuthorityLevel.SUGGEST,
    "report_query": AuthorityLevel.SUGGEST,
    "knowledge_qa": AuthorityLevel.SUGGEST,

    # AI decisions (internal)
    "intent_classification": AuthorityLevel.DECIDE,
    "rag_retrieval": AuthorityLevel.DECIDE,
    "confidence_assessment": AuthorityLevel.DECIDE,

    # Executable actions
    "generate_report_draft": AuthorityLevel.EXECUTE,
    "create_backlog_draft": AuthorityLevel.EXECUTE,
    "update_task_status": AuthorityLevel.EXECUTE,

    # Commit actions (require approval)
    "finalize_sprint": AuthorityLevel.COMMIT,
    "approve_deliverable": AuthorityLevel.COMMIT,
    "delete_item": AuthorityLevel.COMMIT,
    "publish_report": AuthorityLevel.COMMIT,
}

# Role → Max Authority 매핑
ROLE_MAX_AUTHORITY = {
    "admin": AuthorityLevel.COMMIT,
    "pmo_head": AuthorityLevel.COMMIT,
    "pm": AuthorityLevel.EXECUTE,
    "developer": AuthorityLevel.EXECUTE,
    "qa": AuthorityLevel.EXECUTE,
    "business_analyst": AuthorityLevel.SUGGEST,
    "sponsor": AuthorityLevel.SUGGEST,
    "auditor": AuthorityLevel.SUGGEST,
}

class AuthorityClassifier:
    """Classifies the authority level required for an AI action."""

    def classify(
        self,
        intent: str,
        user_role: str,
        confidence: float,
        has_evidence: bool
    ) -> AuthorityResult:
        # 1. Intent 기반 기본 권한
        base_authority = INTENT_AUTHORITY_MAP.get(intent, AuthorityLevel.SUGGEST)

        # 2. 신뢰도 낮으면 강제 SUGGEST
        if confidence < 0.7:
            base_authority = AuthorityLevel.SUGGEST

        # 3. 근거 없으면 EXECUTE 이상 불가
        if not has_evidence and base_authority.value in ["execute", "commit"]:
            base_authority = AuthorityLevel.SUGGEST

        # 4. 사용자 역할 제한
        max_authority = ROLE_MAX_AUTHORITY.get(user_role, AuthorityLevel.SUGGEST)
        if self._authority_value(base_authority) > self._authority_value(max_authority):
            base_authority = max_authority

        # 5. 승인 필요 여부 결정
        requires_approval = base_authority == AuthorityLevel.COMMIT
        approval_type = self._get_approval_type(intent) if requires_approval else None

        return AuthorityResult(
            level=base_authority,
            reason=f"Intent '{intent}' with role '{user_role}' (confidence: {confidence:.2f})",
            requires_approval=requires_approval,
            approval_type=approval_type
        )

    def _authority_value(self, level: AuthorityLevel) -> int:
        return ["suggest", "decide", "execute", "commit"].index(level.value)

    def _get_approval_type(self, intent: str) -> str:
        if intent in ["delete_item", "publish_report"]:
            return "manager"
        if intent in ["finalize_sprint"]:
            return "user"
        return "admin"
```

#### B. Python - Response Schema 확장
**파일:** `llm-service/schemas/ai_response.py`

```python
from dataclasses import dataclass, field
from typing import List, Optional, Dict, Any
from enum import Enum
from datetime import datetime

class ResponseStatus(Enum):
    SUCCESS = "success"
    PARTIAL = "partial"
    FAILED = "failed"
    PENDING_APPROVAL = "pending_approval"

@dataclass
class Evidence:
    """근거 정보"""
    source_type: str  # "document" | "issue" | "task" | "meeting" | "external"
    source_id: str
    source_title: str
    relevance_score: float
    excerpt: Optional[str] = None
    url: Optional[str] = None

@dataclass
class AIResponse:
    """AI 응답 표준 스키마"""
    # 기본 응답
    content: str
    intent: str

    # Authority Gate
    authority_level: str  # suggest | decide | execute | commit
    requires_approval: bool = False
    approval_type: Optional[str] = None

    # Confidence & Evidence
    confidence: float = 0.0
    evidence: List[Evidence] = field(default_factory=list)

    # Status
    status: ResponseStatus = ResponseStatus.SUCCESS
    error_code: Optional[str] = None
    error_message: Optional[str] = None

    # Metadata
    trace_id: str = ""
    timestamp: str = field(default_factory=lambda: datetime.utcnow().isoformat())
    processing_time_ms: int = 0
    model_used: str = ""

    # Actions (for EXECUTE/COMMIT)
    actions_taken: List[Dict[str, Any]] = field(default_factory=list)
    actions_pending: List[Dict[str, Any]] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        return {
            "content": self.content,
            "intent": self.intent,
            "authority": {
                "level": self.authority_level,
                "requires_approval": self.requires_approval,
                "approval_type": self.approval_type,
            },
            "confidence": self.confidence,
            "evidence": [
                {
                    "source_type": e.source_type,
                    "source_id": e.source_id,
                    "source_title": e.source_title,
                    "relevance_score": e.relevance_score,
                    "excerpt": e.excerpt,
                    "url": e.url,
                }
                for e in self.evidence
            ],
            "status": self.status.value,
            "error": {
                "code": self.error_code,
                "message": self.error_message,
            } if self.error_code else None,
            "metadata": {
                "trace_id": self.trace_id,
                "timestamp": self.timestamp,
                "processing_time_ms": self.processing_time_ms,
                "model_used": self.model_used,
            },
            "actions": {
                "taken": self.actions_taken,
                "pending": self.actions_pending,
            },
        }
```

#### C. chat_workflow_v2.py 수정
**파일:** `llm-service/chat_workflow_v2.py` (기존 파일 수정)

```python
# 추가할 imports
from authority_classifier import AuthorityClassifier, AuthorityLevel
from schemas.ai_response import AIResponse, Evidence, ResponseStatus

# State에 authority 추가
class ChatState(TypedDict):
    # 기존 필드...
    messages: List[dict]
    intent: str
    rag_results: List[dict]

    # 새로 추가
    authority_level: str
    requires_approval: bool
    confidence: float
    evidence: List[dict]
    trace_id: str

# Authority classification 노드 추가
def classify_authority(state: ChatState) -> ChatState:
    """Determine the authority level for this request."""
    classifier = AuthorityClassifier()

    result = classifier.classify(
        intent=state["intent"],
        user_role=state.get("user_role", "developer"),
        confidence=state.get("confidence", 0.5),
        has_evidence=len(state.get("evidence", [])) > 0
    )

    return {
        **state,
        "authority_level": result.level.value,
        "requires_approval": result.requires_approval,
    }

# 워크플로우 그래프에 노드 추가
workflow.add_node("classify_authority", classify_authority)

# 엣지 수정: intent 분류 후 authority 분류
workflow.add_edge("classify_intent", "classify_authority")
workflow.add_conditional_edges(
    "classify_authority",
    route_by_authority,
    {
        "suggest": "generate_response",
        "decide": "generate_response",
        "execute": "execute_action",
        "commit": "request_approval",
    }
)
```

### 1.3 Frontend 승인 UI

**파일:** `PMS_IC_FrontEnd_v1.2/src/components/chat/ApprovalDialog.tsx`

```typescript
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, XCircle } from 'lucide-react';

interface ApprovalDialogProps {
  open: boolean;
  onClose: () => void;
  onApprove: () => void;
  onReject: () => void;
  action: {
    type: string;
    description: string;
    impact: string;
    evidence: Array<{ title: string; url: string }>;
  };
}

export function ApprovalDialog({ open, onClose, onApprove, onReject, action }: ApprovalDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            승인이 필요합니다
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <h4 className="font-medium text-sm text-gray-500">요청된 작업</h4>
            <p className="text-sm">{action.description}</p>
          </div>

          <div>
            <h4 className="font-medium text-sm text-gray-500">예상 영향</h4>
            <p className="text-sm text-amber-600">{action.impact}</p>
          </div>

          {action.evidence.length > 0 && (
            <div>
              <h4 className="font-medium text-sm text-gray-500">근거 자료</h4>
              <ul className="text-sm space-y-1">
                {action.evidence.map((e, i) => (
                  <li key={i}>
                    <a href={e.url} className="text-blue-600 hover:underline">{e.title}</a>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={onReject}>
            <XCircle className="h-4 w-4 mr-1" />
            거부
          </Button>
          <Button onClick={onApprove}>
            <CheckCircle className="h-4 w-4 mr-1" />
            승인
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
```

---

## 2. Evidence Linking System

### 2.1 개요
AI 응답에 근거(출처)를 필수로 연결하여 "환각" 방지 및 검증 가능성 확보

### 2.2 Neo4j 스키마 확장

**파일:** `llm-service/migrations/neo4j_evidence_schema.cypher`

```cypher
// Evidence 노드 타입
CREATE CONSTRAINT evidence_id IF NOT EXISTS
FOR (e:Evidence) REQUIRE e.id IS UNIQUE;

// Evidence 속성
// - id: UUID
// - type: document | issue | task | meeting | decision | external
// - title: string
// - content_excerpt: string (최대 500자)
// - url: string (선택)
// - created_at: datetime
// - relevance_score: float (RAG에서 계산)

// AI Response → Evidence 관계
// (:AIResponse)-[:SUPPORTED_BY {relevance: float, excerpt: string}]->(:Evidence)

// 기존 노드에서 Evidence로 변환 가능한 관계
// (:Document)-[:IS_EVIDENCE]->(:Evidence)
// (:Issue)-[:IS_EVIDENCE]->(:Evidence)
// (:Task)-[:IS_EVIDENCE]->(:Evidence)
// (:Decision)-[:IS_EVIDENCE]->(:Evidence)
```

### 2.3 Evidence Service

**파일:** `llm-service/evidence_service.py`

```python
from typing import List, Dict, Any, Optional
from dataclasses import dataclass
import uuid
from neo4j import GraphDatabase

@dataclass
class EvidenceItem:
    id: str
    source_type: str
    source_id: str
    title: str
    excerpt: str
    relevance_score: float
    url: Optional[str] = None

class EvidenceService:
    """Manages evidence linking for AI responses."""

    def __init__(self, neo4j_driver):
        self.driver = neo4j_driver

    def extract_evidence_from_rag(
        self,
        rag_results: List[Dict[str, Any]],
        min_relevance: float = 0.5
    ) -> List[EvidenceItem]:
        """Convert RAG results to evidence items."""
        evidence = []

        for result in rag_results:
            if result.get("score", 0) < min_relevance:
                continue

            evidence.append(EvidenceItem(
                id=str(uuid.uuid4()),
                source_type=self._detect_source_type(result),
                source_id=result.get("id", ""),
                title=result.get("title", "Unknown"),
                excerpt=result.get("content", "")[:500],
                relevance_score=result.get("score", 0),
                url=result.get("url"),
            ))

        return evidence

    def _detect_source_type(self, result: Dict[str, Any]) -> str:
        """Detect the type of evidence source."""
        metadata = result.get("metadata", {})

        if "document_id" in metadata:
            return "document"
        if "issue_id" in metadata:
            return "issue"
        if "task_id" in metadata:
            return "task"
        if "meeting_id" in metadata:
            return "meeting"

        return "external"

    def save_response_evidence(
        self,
        response_id: str,
        evidence_items: List[EvidenceItem]
    ) -> None:
        """Save evidence links to Neo4j."""
        with self.driver.session() as session:
            for item in evidence_items:
                session.run("""
                    MERGE (r:AIResponse {id: $response_id})
                    MERGE (e:Evidence {id: $evidence_id})
                    SET e.source_type = $source_type,
                        e.source_id = $source_id,
                        e.title = $title,
                        e.excerpt = $excerpt
                    MERGE (r)-[rel:SUPPORTED_BY]->(e)
                    SET rel.relevance = $relevance,
                        rel.linked_at = datetime()
                """, {
                    "response_id": response_id,
                    "evidence_id": item.id,
                    "source_type": item.source_type,
                    "source_id": item.source_id,
                    "title": item.title,
                    "excerpt": item.excerpt,
                    "relevance": item.relevance_score,
                })

    def get_response_evidence(self, response_id: str) -> List[EvidenceItem]:
        """Retrieve evidence for a specific response."""
        with self.driver.session() as session:
            result = session.run("""
                MATCH (r:AIResponse {id: $response_id})-[rel:SUPPORTED_BY]->(e:Evidence)
                RETURN e, rel.relevance as relevance
                ORDER BY rel.relevance DESC
            """, {"response_id": response_id})

            return [
                EvidenceItem(
                    id=record["e"]["id"],
                    source_type=record["e"]["source_type"],
                    source_id=record["e"]["source_id"],
                    title=record["e"]["title"],
                    excerpt=record["e"]["excerpt"],
                    relevance_score=record["relevance"],
                )
                for record in result
            ]

    def validate_evidence_exists(self, evidence_items: List[EvidenceItem]) -> bool:
        """Validate that evidence sources actually exist."""
        for item in evidence_items:
            if not self._source_exists(item.source_type, item.source_id):
                return False
        return True

    def _source_exists(self, source_type: str, source_id: str) -> bool:
        """Check if the original source document/item exists."""
        with self.driver.session() as session:
            label_map = {
                "document": "Document",
                "issue": "Issue",
                "task": "Task",
                "meeting": "Meeting",
            }
            label = label_map.get(source_type, "Evidence")

            result = session.run(f"""
                MATCH (n:{label} {{id: $source_id}})
                RETURN count(n) > 0 as exists
            """, {"source_id": source_id})

            record = result.single()
            return record["exists"] if record else False
```

### 2.4 Frontend Evidence Display

**파일:** `PMS_IC_FrontEnd_v1.2/src/components/chat/EvidencePanel.tsx`

```typescript
import { ExternalLink, FileText, AlertCircle, CheckCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface Evidence {
  sourceType: string;
  sourceId: string;
  title: string;
  excerpt: string;
  relevanceScore: number;
  url?: string;
}

interface EvidencePanelProps {
  evidence: Evidence[];
  confidence: number;
}

export function EvidencePanel({ evidence, confidence }: EvidencePanelProps) {
  const getSourceIcon = (type: string) => {
    switch (type) {
      case 'document': return <FileText className="h-4 w-4" />;
      case 'issue': return <AlertCircle className="h-4 w-4" />;
      default: return <ExternalLink className="h-4 w-4" />;
    }
  };

  const getRelevanceBadge = (score: number) => {
    if (score >= 0.8) return <Badge variant="success">높음</Badge>;
    if (score >= 0.6) return <Badge variant="warning">중간</Badge>;
    return <Badge variant="secondary">낮음</Badge>;
  };

  return (
    <div className="bg-gray-50 rounded-lg p-3 mt-2">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500">근거 자료</span>
        <div className="flex items-center gap-1">
          <CheckCircle className={`h-3 w-3 ${confidence >= 0.7 ? 'text-green-500' : 'text-amber-500'}`} />
          <span className="text-xs text-gray-500">
            신뢰도 {(confidence * 100).toFixed(0)}%
          </span>
        </div>
      </div>

      <div className="space-y-2">
        {evidence.map((item, index) => (
          <div key={index} className="flex items-start gap-2 text-sm">
            <span className="text-gray-400 mt-0.5">{getSourceIcon(item.sourceType)}</span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                {item.url ? (
                  <a href={item.url} className="text-blue-600 hover:underline truncate">
                    {item.title}
                  </a>
                ) : (
                  <span className="truncate">{item.title}</span>
                )}
                {getRelevanceBadge(item.relevanceScore)}
              </div>
              {item.excerpt && (
                <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                  "{item.excerpt}"
                </p>
              )}
            </div>
          </div>
        ))}

        {evidence.length === 0 && (
          <p className="text-xs text-amber-600 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" />
            근거 자료가 없습니다. 이 응답은 검증이 필요합니다.
          </p>
        )}
      </div>
    </div>
  );
}
```

---

## 3. Failure Taxonomy

### 3.1 개요
실패를 유형별로 분류하고 각 유형에 맞는 복구 전략 적용

### 3.2 Failure Ontology 정의

**파일:** `llm-service/failure_taxonomy.py`

```python
from enum import Enum
from dataclasses import dataclass
from typing import Optional, List, Callable

class FailureCategory(Enum):
    """High-level failure categories."""
    INFORMATION = "information"    # 정보 부족/품질 문제
    POLICY = "policy"              # 정책/권한 위반
    TECHNICAL = "technical"        # 시스템/인프라 문제
    CONFIDENCE = "confidence"      # 신뢰도 미달

class FailureCode(Enum):
    """Specific failure codes with recovery strategies."""

    # Information failures
    INFO_MISSING = "info_missing"              # 필요한 정보 없음
    INFO_OUTDATED = "info_outdated"            # 정보가 오래됨
    INFO_CONFLICTING = "info_conflicting"      # 상충되는 정보
    INFO_AMBIGUOUS = "info_ambiguous"          # 모호한 정보

    # Policy failures
    POLICY_UNAUTHORIZED = "policy_unauthorized"  # 권한 없음
    POLICY_BOUNDARY = "policy_boundary"          # 데이터 경계 위반
    POLICY_PROHIBITED = "policy_prohibited"      # 금지된 액션

    # Technical failures
    TECH_LLM_ERROR = "tech_llm_error"          # LLM 호출 실패
    TECH_DB_ERROR = "tech_db_error"            # DB 접근 실패
    TECH_TIMEOUT = "tech_timeout"              # 타임아웃
    TECH_RATE_LIMIT = "tech_rate_limit"        # 레이트 리밋

    # Confidence failures
    CONF_LOW = "conf_low"                      # 전체 신뢰도 낮음
    CONF_NO_EVIDENCE = "conf_no_evidence"      # 근거 없음
    CONF_UNCERTAIN = "conf_uncertain"          # 불확실한 판단

@dataclass
class FailureInfo:
    """Detailed failure information."""
    code: FailureCode
    category: FailureCategory
    message: str
    user_message: str  # 사용자에게 보여줄 메시지
    recovery_hint: str
    is_recoverable: bool
    retry_allowed: bool
    max_retries: int = 3

# Failure 정의 테이블
FAILURE_DEFINITIONS = {
    FailureCode.INFO_MISSING: FailureInfo(
        code=FailureCode.INFO_MISSING,
        category=FailureCategory.INFORMATION,
        message="Required information not found in knowledge base",
        user_message="요청하신 정보를 찾을 수 없습니다.",
        recovery_hint="쿼리를 더 구체적으로 작성하거나 관련 문서를 업로드해주세요.",
        is_recoverable=True,
        retry_allowed=True,
    ),
    FailureCode.INFO_CONFLICTING: FailureInfo(
        code=FailureCode.INFO_CONFLICTING,
        category=FailureCategory.INFORMATION,
        message="Conflicting information found in sources",
        user_message="상충되는 정보가 발견되었습니다. 확인이 필요합니다.",
        recovery_hint="어떤 정보가 최신인지 확인해주세요.",
        is_recoverable=True,
        retry_allowed=False,
    ),
    FailureCode.POLICY_UNAUTHORIZED: FailureInfo(
        code=FailureCode.POLICY_UNAUTHORIZED,
        category=FailureCategory.POLICY,
        message="User does not have permission for this action",
        user_message="이 작업을 수행할 권한이 없습니다.",
        recovery_hint="관리자에게 권한 요청이 필요합니다.",
        is_recoverable=False,
        retry_allowed=False,
    ),
    FailureCode.TECH_LLM_ERROR: FailureInfo(
        code=FailureCode.TECH_LLM_ERROR,
        category=FailureCategory.TECHNICAL,
        message="LLM service returned an error",
        user_message="AI 서비스에 일시적인 문제가 발생했습니다.",
        recovery_hint="잠시 후 다시 시도해주세요.",
        is_recoverable=True,
        retry_allowed=True,
        max_retries=3,
    ),
    FailureCode.CONF_LOW: FailureInfo(
        code=FailureCode.CONF_LOW,
        category=FailureCategory.CONFIDENCE,
        message="Response confidence below threshold",
        user_message="충분한 확신을 가지고 답변드리기 어렵습니다.",
        recovery_hint="질문을 더 구체적으로 해주시거나 담당자에게 문의해주세요.",
        is_recoverable=True,
        retry_allowed=True,
    ),
    FailureCode.CONF_NO_EVIDENCE: FailureInfo(
        code=FailureCode.CONF_NO_EVIDENCE,
        category=FailureCategory.CONFIDENCE,
        message="No supporting evidence found for the response",
        user_message="답변의 근거를 찾을 수 없습니다.",
        recovery_hint="이 답변은 검증이 필요합니다.",
        is_recoverable=False,
        retry_allowed=False,
    ),
}

class FailureHandler:
    """Handles failures with appropriate recovery strategies."""

    def __init__(self):
        self.retry_counts = {}  # trace_id -> retry count

    def handle_failure(
        self,
        code: FailureCode,
        trace_id: str,
        context: dict = None
    ) -> dict:
        """Handle a failure and return recovery instructions."""
        failure = FAILURE_DEFINITIONS.get(code)
        if not failure:
            failure = FailureInfo(
                code=code,
                category=FailureCategory.TECHNICAL,
                message=f"Unknown failure: {code}",
                user_message="알 수 없는 오류가 발생했습니다.",
                recovery_hint="관리자에게 문의해주세요.",
                is_recoverable=False,
                retry_allowed=False,
            )

        # Check retry count
        current_retries = self.retry_counts.get(trace_id, 0)
        can_retry = failure.retry_allowed and current_retries < failure.max_retries

        if can_retry:
            self.retry_counts[trace_id] = current_retries + 1

        recovery_action = self._determine_recovery_action(failure, can_retry, context)

        return {
            "failure": {
                "code": code.value,
                "category": failure.category.value,
                "message": failure.message,
                "user_message": failure.user_message,
            },
            "recovery": {
                "hint": failure.recovery_hint,
                "is_recoverable": failure.is_recoverable,
                "can_retry": can_retry,
                "retry_count": current_retries + 1 if can_retry else current_retries,
                "max_retries": failure.max_retries,
                "action": recovery_action,
            },
        }

    def _determine_recovery_action(
        self,
        failure: FailureInfo,
        can_retry: bool,
        context: dict = None
    ) -> str:
        """Determine the appropriate recovery action."""
        if failure.category == FailureCategory.INFORMATION:
            if can_retry:
                return "refine_query"  # 쿼리 개선 후 재시도
            return "ask_human"  # 사용자에게 추가 정보 요청

        if failure.category == FailureCategory.POLICY:
            return "escalate"  # 권한 상승 요청

        if failure.category == FailureCategory.TECHNICAL:
            if can_retry:
                return "retry_with_backoff"
            return "fallback"  # 대체 응답

        if failure.category == FailureCategory.CONFIDENCE:
            return "downgrade_to_suggest"  # SUGGEST 레벨로 강등

        return "abort"
```

### 3.3 워크플로우에 Failure Handling 통합

**파일:** `llm-service/chat_workflow_v2.py` (추가 수정)

```python
from failure_taxonomy import FailureHandler, FailureCode

failure_handler = FailureHandler()

def handle_workflow_failure(state: ChatState, error: Exception) -> ChatState:
    """Handle failures in the workflow."""
    trace_id = state.get("trace_id", "unknown")

    # Classify the failure
    failure_code = classify_error(error)

    # Get recovery instructions
    recovery = failure_handler.handle_failure(
        code=failure_code,
        trace_id=trace_id,
        context=state
    )

    # Apply recovery action
    if recovery["recovery"]["action"] == "refine_query":
        return refine_and_retry(state)
    elif recovery["recovery"]["action"] == "downgrade_to_suggest":
        state["authority_level"] = "suggest"
        state["requires_approval"] = False
    elif recovery["recovery"]["action"] == "ask_human":
        state["needs_human_input"] = True

    # Add failure info to state
    state["failure"] = recovery["failure"]
    state["recovery"] = recovery["recovery"]

    return state

def classify_error(error: Exception) -> FailureCode:
    """Classify an exception into a failure code."""
    error_str = str(error).lower()

    if "timeout" in error_str:
        return FailureCode.TECH_TIMEOUT
    if "rate limit" in error_str:
        return FailureCode.TECH_RATE_LIMIT
    if "not found" in error_str:
        return FailureCode.INFO_MISSING
    if "unauthorized" in error_str or "permission" in error_str:
        return FailureCode.POLICY_UNAUTHORIZED

    return FailureCode.TECH_LLM_ERROR
```

---

## 4. Database Migration

### 4.1 AI Response 로깅 테이블

**파일:** `PMS_IC_BackEnd_v1.2/src/main/resources/db/migration/V20260130__ai_response_logging.sql`

```sql
-- AI Response 로그 테이블
CREATE TABLE IF NOT EXISTS chat.ai_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID REFERENCES chat.chat_sessions(id),
    trace_id VARCHAR(100) NOT NULL,

    -- Request
    user_query TEXT NOT NULL,
    intent VARCHAR(100),
    user_id UUID,
    user_role VARCHAR(50),
    project_id UUID,

    -- Response
    response_content TEXT,
    authority_level VARCHAR(20),  -- suggest, decide, execute, commit
    requires_approval BOOLEAN DEFAULT FALSE,
    approval_status VARCHAR(20),  -- pending, approved, rejected
    approved_by UUID,
    approved_at TIMESTAMP,

    -- Confidence & Evidence
    confidence DECIMAL(3,2),
    evidence_count INTEGER DEFAULT 0,

    -- Failure handling
    failure_code VARCHAR(50),
    failure_category VARCHAR(50),
    recovery_action VARCHAR(50),
    retry_count INTEGER DEFAULT 0,

    -- Performance
    processing_time_ms INTEGER,
    model_used VARCHAR(100),
    token_count_input INTEGER,
    token_count_output INTEGER,

    -- Timestamps
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Evidence 링크 테이블
CREATE TABLE IF NOT EXISTS chat.ai_response_evidence (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    response_id UUID REFERENCES chat.ai_responses(id) ON DELETE CASCADE,

    source_type VARCHAR(50) NOT NULL,  -- document, issue, task, meeting
    source_id VARCHAR(100) NOT NULL,
    source_title VARCHAR(500),
    excerpt TEXT,
    relevance_score DECIMAL(3,2),
    url VARCHAR(1000),

    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 인덱스
CREATE INDEX idx_ai_responses_session ON chat.ai_responses(session_id);
CREATE INDEX idx_ai_responses_trace ON chat.ai_responses(trace_id);
CREATE INDEX idx_ai_responses_user ON chat.ai_responses(user_id);
CREATE INDEX idx_ai_responses_project ON chat.ai_responses(project_id);
CREATE INDEX idx_ai_responses_created ON chat.ai_responses(created_at);
CREATE INDEX idx_ai_response_evidence_response ON chat.ai_response_evidence(response_id);
```

---

## 5. 테스트 계획

### 5.1 Unit Tests

```python
# tests/test_authority_classifier.py
import pytest
from authority_classifier import AuthorityClassifier, AuthorityLevel

class TestAuthorityClassifier:
    def test_low_confidence_forces_suggest(self):
        classifier = AuthorityClassifier()
        result = classifier.classify(
            intent="generate_report_draft",
            user_role="pm",
            confidence=0.5,  # Below threshold
            has_evidence=True
        )
        assert result.level == AuthorityLevel.SUGGEST

    def test_no_evidence_blocks_execute(self):
        classifier = AuthorityClassifier()
        result = classifier.classify(
            intent="update_task_status",
            user_role="developer",
            confidence=0.9,
            has_evidence=False  # No evidence
        )
        assert result.level == AuthorityLevel.SUGGEST

    def test_role_limits_authority(self):
        classifier = AuthorityClassifier()
        result = classifier.classify(
            intent="finalize_sprint",  # Normally COMMIT
            user_role="auditor",       # Max SUGGEST
            confidence=0.95,
            has_evidence=True
        )
        assert result.level == AuthorityLevel.SUGGEST
```

### 5.2 Integration Tests

```python
# tests/test_workflow_gates.py
import pytest
from chat_workflow_v2 import process_chat_message

class TestWorkflowGates:
    def test_commit_requires_approval(self):
        response = process_chat_message(
            query="스프린트를 확정해줘",
            user_role="pm",
            project_id="test-project"
        )
        assert response["authority"]["requires_approval"] == True

    def test_evidence_attached_to_response(self):
        response = process_chat_message(
            query="프로젝트 진행 상황 알려줘",
            user_role="pm",
            project_id="test-project"
        )
        assert len(response["evidence"]) > 0
```

---

## 6. 완료 기준

| 항목 | 체크리스트 |
|------|-----------|
| Authority Classifier | ☐ 4단계 권한 분류 동작 |
| | ☐ 역할별 권한 제한 동작 |
| | ☐ 신뢰도 기반 강등 동작 |
| Evidence System | ☐ RAG 결과에서 Evidence 추출 |
| | ☐ Neo4j에 Evidence 관계 저장 |
| | ☐ Frontend에서 Evidence 표시 |
| Failure Handling | ☐ 실패 분류 동작 |
| | ☐ 복구 전략 적용 |
| | ☐ 재시도 로직 동작 |
| Integration | ☐ 기존 chat_workflow와 통합 |
| | ☐ DB 로깅 동작 |
| | ☐ Frontend 승인 UI 동작 |
| Tests | ☐ Unit tests 통과 |
| | ☐ Integration tests 통과 |

---

## 7. 다음 단계

Phase 1 완료 후:
- Phase 2: LangGraph 워크플로우 템플릿화 및 Skill Library 분리
- 측정 지표 수집 시작 (성공률, 승인률, 평균 신뢰도)
