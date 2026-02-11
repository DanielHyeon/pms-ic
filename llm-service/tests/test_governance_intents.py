"""
거버넌스 인텐트 테스트 (역할/권한/위임/거버넌스 검증)

검증 항목:
1. 분류 정확성 (5개 인텐트 × 3-4 쿼리)
2. STATUS_* 블랙홀 방지 확인
3. 핸들러 레지스트리 등록 확인
4. 렌더러 헤더 확인
5. 한글 타이포 교정 확인

Run: cd llm-service && .venv/bin/python -m pytest tests/test_governance_intents.py -v
"""

import pytest

from classifiers.answer_type_classifier import (
    AnswerTypeClassifier, AnswerType,
)
from contracts.response_contract import ResponseContract, ErrorCode
from contracts.response_renderer import render
from workflows.intent_handlers import (
    get_handler, has_dedicated_handler,
)
from utils.korean_normalizer import apply_typo_corrections


# =============================================================================
# 분류 정확성 테스트
# =============================================================================

class TestRoleListClassification:
    """역할 목록 인텐트 분류"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_role_list_basic(self, classifier):
        """역할 관련 기본 쿼리 → ROLE_LIST"""
        cases = [
            "역할 목록 보여줘",
            "프로젝트에 어떤 역할이 있어?",
            "역할별 멤버 알려줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.ROLE_LIST, \
                f"Expected ROLE_LIST for '{msg}', got {result.answer_type}"

    def test_role_who_query(self, classifier):
        """'누가 어떤 역할' 쿼리 → ROLE_LIST"""
        result = classifier.classify("역할이 뭐가 있어?")
        assert result.answer_type == AnswerType.ROLE_LIST


class TestCapabilityCheckClassification:
    """권한 현황 인텐트 분류"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_capability_check_basic(self, classifier):
        """권한 관련 기본 쿼리 → CAPABILITY_CHECK"""
        cases = [
            "권한 현황 보여줘",
            "누가 승인 권한이 있어?",
            "내 권한 확인해줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.CAPABILITY_CHECK, \
                f"Expected CAPABILITY_CHECK for '{msg}', got {result.answer_type}"

    def test_capability_with_english(self, classifier):
        """영어 'capability' 쿼리 → CAPABILITY_CHECK"""
        result = classifier.classify("capability 확인")
        assert result.answer_type == AnswerType.CAPABILITY_CHECK


class TestDelegationListClassification:
    """위임 현황 인텐트 분류"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_delegation_list_basic(self, classifier):
        """위임 관련 기본 쿼리 → DELEGATION_LIST"""
        cases = [
            "위임 현황 보여줘",
            "위임 목록 알려줘",
            "delegation 리스트",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.DELEGATION_LIST, \
                f"Expected DELEGATION_LIST for '{msg}', got {result.answer_type}"


class TestDelegationMapClassification:
    """위임 맵 인텐트 분류"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_delegation_map_basic(self, classifier):
        """위임 맵/흐름 쿼리 → DELEGATION_MAP"""
        cases = [
            "위임 맵 보여줘",
            "위임맵",
            "권한 흐름 보여줘",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.DELEGATION_MAP, \
                f"Expected DELEGATION_MAP for '{msg}', got {result.answer_type}"


class TestGovernanceCheckClassification:
    """거버넌스 검증 인텐트 분류"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_governance_check_basic(self, classifier):
        """거버넌스 관련 기본 쿼리 → GOVERNANCE_CHECK"""
        cases = [
            "거버넌스 검증 결과",
            "SoD 위반 확인",
            "직무분리 위반 점검",
        ]
        for msg in cases:
            result = classifier.classify(msg)
            assert result.answer_type == AnswerType.GOVERNANCE_CHECK, \
                f"Expected GOVERNANCE_CHECK for '{msg}', got {result.answer_type}"


# =============================================================================
# STATUS_* 블랙홀 방지 테스트
# =============================================================================

class TestGovernanceNotStatusBlackHole:
    """거버넌스 인텐트가 STATUS_*에 흡수되지 않아야 함"""

    @pytest.fixture
    def classifier(self):
        return AnswerTypeClassifier()

    def test_role_not_status(self, classifier):
        """'역할 목록' → STATUS_LIST가 아님"""
        result = classifier.classify("역할 목록 보여줘")
        assert result.answer_type != AnswerType.STATUS_LIST, \
            f"'역할 목록' should be ROLE_LIST, not STATUS_LIST"
        assert result.answer_type != AnswerType.STATUS_METRIC

    def test_delegation_not_status(self, classifier):
        """'위임 현황' → STATUS_LIST가 아님"""
        result = classifier.classify("위임 현황 보여줘")
        assert result.answer_type != AnswerType.STATUS_LIST
        assert result.answer_type != AnswerType.STATUS_METRIC

    def test_governance_not_status(self, classifier):
        """'거버넌스 검증' → STATUS_LIST가 아님"""
        result = classifier.classify("거버넌스 검증 결과")
        assert result.answer_type != AnswerType.STATUS_LIST
        assert result.answer_type != AnswerType.STATUS_METRIC


# =============================================================================
# 핸들러 레지스트리 테스트
# =============================================================================

class TestGovernanceHandlerRegistry:
    """거버넌스 핸들러 등록 확인"""

    def test_all_governance_handlers_registered(self):
        """5개 거버넌스 핸들러가 모두 등록되어 있어야 함"""
        governance_intents = [
            "role_list",
            "capability_check",
            "delegation_list",
            "delegation_map",
            "governance_check",
        ]
        for intent in governance_intents:
            assert has_dedicated_handler(intent), \
                f"{intent} should have a dedicated handler"
            assert get_handler(intent) is not None, \
                f"{intent} handler should return a callable"

    def test_governance_handlers_are_callable(self):
        """핸들러가 호출 가능해야 함"""
        governance_intents = [
            "role_list", "capability_check", "delegation_list",
            "delegation_map", "governance_check",
        ]
        for intent in governance_intents:
            handler = get_handler(intent)
            assert callable(handler), \
                f"{intent} handler should be callable"


# =============================================================================
# 렌더러 헤더 테스트
# =============================================================================

class TestGovernanceRendererHeaders:
    """거버넌스 인텐트별 렌더러 헤더 확인"""

    def test_role_list_header(self):
        """역할 목록 렌더러: 👥 **역할 목록** 헤더"""
        contract = ResponseContract(
            intent="role_list",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={"roles": [], "count": 0},
        )
        result = render(contract)
        assert "👥 **역할 목록**" in result

    def test_capability_check_header(self):
        """권한 현황 렌더러: 🔐 **권한 현황** 헤더"""
        contract = ResponseContract(
            intent="capability_check",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={"mode": "all", "users": []},
        )
        result = render(contract)
        assert "🔐 **권한 현황**" in result

    def test_delegation_list_header(self):
        """위임 현황 렌더러: 📤 **위임 현황** 헤더"""
        contract = ResponseContract(
            intent="delegation_list",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={"delegations": [], "stats": {}},
        )
        result = render(contract)
        assert "📤 **위임 현황**" in result

    def test_delegation_map_header(self):
        """위임 맵 렌더러: 🗺️ **위임 맵** 헤더"""
        contract = ResponseContract(
            intent="delegation_map",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={"edges": [], "max_depth": 0, "root_count": 0},
        )
        result = render(contract)
        assert "🗺️ **위임 맵**" in result

    def test_governance_check_header(self):
        """거버넌스 검증 렌더러: 🛡️ **거버넌스 검증 결과** 헤더"""
        contract = ResponseContract(
            intent="governance_check",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={"findings": [], "sod_violations": []},
        )
        result = render(contract)
        assert "🛡️ **거버넌스 검증 결과**" in result

    def test_governance_headers_not_status(self):
        """거버넌스 헤더가 Project Status 헤더와 겹치지 않아야 함"""
        intents_and_data = [
            ("role_list", {"roles": [], "count": 0}),
            ("capability_check", {"mode": "all", "users": []}),
            ("delegation_list", {"delegations": [], "stats": {}}),
            ("delegation_map", {"edges": [], "max_depth": 0, "root_count": 0}),
            ("governance_check", {"findings": [], "sod_violations": []}),
        ]
        for intent, data in intents_and_data:
            contract = ResponseContract(
                intent=intent,
                reference_time="2026-02-11 14:30 KST",
                scope="Project: Test",
                data=data,
            )
            result = render(contract)
            assert "📊 **Project Status**" not in result, \
                f"REGRESSION: Status header in {intent} response!"


# =============================================================================
# 렌더러 데이터 렌더링 테스트
# =============================================================================

class TestGovernanceRendererData:
    """거버넌스 렌더러 데이터 출력 확인"""

    def test_role_list_renders_roles(self):
        """역할 목록이 역할과 멤버를 올바르게 표시"""
        contract = ResponseContract(
            intent="role_list",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={
                "roles": [
                    {"role_name": "PM", "member_count": 2, "is_system": True,
                     "member_names": "김철수, 이영희", "description": "프로젝트 관리자"},
                    {"role_name": "개발자", "member_count": 0, "is_system": False,
                     "description": "개발 담당"},
                ],
                "count": 2,
                "unassigned_count": 1,
            },
        )
        result = render(contract)
        assert "PM" in result
        assert "2명" in result
        assert "미할당" in result

    def test_capability_check_by_user(self):
        """사용자별 권한 렌더링"""
        contract = ResponseContract(
            intent="capability_check",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={
                "mode": "by_user",
                "user_name": "김철수",
                "capabilities": [
                    {"capability_code": "APPROVE_RFP", "capability_name": "RFP 승인",
                     "category": "RFP", "source_type": "ROLE"},
                ],
                "cap_count": 1,
            },
        )
        result = render(contract)
        assert "김철수" in result
        assert "APPROVE_RFP" in result
        assert "역할" in result  # source_type ROLE → 역할

    def test_delegation_list_with_stats(self):
        """위임 목록 + 통계 렌더링"""
        contract = ResponseContract(
            intent="delegation_list",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={
                "delegations": [
                    {"delegator_name": "김PM", "delegatee_name": "이대리",
                     "capability_name": "RFP 승인", "status": "ACTIVE",
                     "scope_type": "FULL", "duration_type": "PERMANENT"},
                ],
                "stats": {"ACTIVE": 3, "PENDING": 1},
                "expiring_soon_count": 2,
            },
        )
        result = render(contract)
        assert "활성 위임" in result
        assert "김PM" in result
        assert "이대리" in result
        assert "만료 예정" in result

    def test_delegation_map_depth_warning(self):
        """위임 맵 깊이 경고 렌더링"""
        contract = ResponseContract(
            intent="delegation_map",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={
                "edges": [
                    {"root_delegator_name": "김PM", "delegator_name": "김PM",
                     "delegatee_name": "이대리", "capability_code": "APPROVE_RFP", "depth": 1},
                    {"root_delegator_name": "김PM", "delegator_name": "이대리",
                     "delegatee_name": "박사원", "capability_code": "APPROVE_RFP", "depth": 2},
                    {"root_delegator_name": "김PM", "delegator_name": "박사원",
                     "delegatee_name": "최인턴", "capability_code": "APPROVE_RFP", "depth": 3},
                ],
                "max_depth": 3,
                "root_count": 1,
            },
        )
        result = render(contract)
        assert "재위임 깊이 경고" in result
        assert "김PM" in result
        assert "APPROVE_RFP" in result

    def test_governance_check_with_findings(self):
        """거버넌스 검증 결과 렌더링"""
        contract = ResponseContract(
            intent="governance_check",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={
                "findings": [
                    {"finding_type": "SOD_VIOLATION", "severity": "HIGH",
                     "message": "SoD 규칙 위반 감지", "user_name": "김철수"},
                    {"finding_type": "EXPIRING_SOON", "severity": "MEDIUM",
                     "message": "위임 만료 임박"},
                ],
                "sod_violations": [
                    {"user_name": "김철수", "cap_a_code": "APPROVE_RFP",
                     "cap_b_code": "CREATE_RFP", "severity": "HIGH",
                     "is_blocking": True, "rule_description": "RFP 생성/승인 분리"},
                ],
                "finding_count": 2,
                "sod_count": 1,
            },
        )
        result = render(contract)
        assert "SoD" in result
        assert "김철수" in result
        assert "차단" in result
        assert "HIGH" in result


# =============================================================================
# 에러 핸들링 테스트
# =============================================================================

class TestGovernanceErrorHandling:
    """거버넌스 렌더러 에러 처리"""

    def test_error_contract_renders_warning(self):
        """에러 계약은 경고 메시지를 표시해야 함"""
        contract = ResponseContract(
            intent="role_list",
            reference_time="2026-02-11 14:30 KST",
            scope="Project: Test",
            data={},
            warnings=["DB 연결 실패"],
            error_code=ErrorCode.DB_QUERY_FAILED,
        )
        result = render(contract)
        assert "⚠️" in result
        assert "DB 연결 실패" in result


# =============================================================================
# 한글 타이포 교정 테스트
# =============================================================================

class TestGovernanceTypoCorrections:
    """거버넌스 관련 한글 타이포 교정"""

    def test_역활_to_역할(self):
        assert apply_typo_corrections("역활 목록") == "역할 목록"

    def test_권환_to_권한(self):
        assert apply_typo_corrections("권환 현황") == "권한 현황"

    def test_위힘_to_위임(self):
        assert apply_typo_corrections("위힘 현황") == "위임 현황"

    def test_거번넌스_to_거버넌스(self):
        assert apply_typo_corrections("거번넌스 검증") == "거버넌스 검증"

    def test_귄한_to_권한(self):
        assert apply_typo_corrections("귄한 확인") == "권한 확인"

    def test_위암_to_위임(self):
        assert apply_typo_corrections("위암 목록") == "위임 목록"

    def test_거버넌쓰_to_거버넌스(self):
        assert apply_typo_corrections("거버넌쓰 점검") == "거버넌스 점검"

    def test_already_correct_unchanged(self):
        """이미 올바른 텍스트는 변경되지 않아야 함"""
        assert apply_typo_corrections("역할 목록") == "역할 목록"
        assert apply_typo_corrections("권한 현황") == "권한 현황"
        assert apply_typo_corrections("위임 현황") == "위임 현황"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
