"""
Analyze Skills - Analysis and inference

Skills:
- AnalyzeRiskSkill: Risk detection and scoring
- AnalyzeDependencySkill: Dependency analysis
- AnalyzeSentimentSkill: Sentiment analysis on text
"""

from typing import Dict, Any, List, Optional
import logging

from . import BaseSkill, SkillCategory, SkillInput, SkillOutput

logger = logging.getLogger(__name__)


class AnalyzeRiskSkill(BaseSkill):
    """
    Analyze risks from project data.

    Input:
        - events: List of project events
        - metrics: Project metrics
        - topology: Dependency/assignment info

    Output:
        - result: List of identified risks
        - confidence: Risk assessment confidence
    """

    name = "analyze_risk"
    category = SkillCategory.ANALYZE
    description = "Analyze project risks from events and metrics"
    version = "1.0.0"

    RISK_PATTERNS = {
        "schedule_slip": {
            "event_types": ["delay"],
            "threshold": 3,
            "base_probability": 0.3,
            "increment": 0.1,
            "impact": "high",
            "mitigation": "Consider scope adjustment or resource addition",
        },
        "wip_overflow": {
            "metric": "wip_ratio",
            "threshold": 1.2,
            "probability": 0.8,
            "impact": "medium",
            "mitigation": "Focus on completing in-progress work",
        },
        "blocker_increase": {
            "event_types": ["blocker_added"],
            "threshold": 2,
            "probability": 0.7,
            "impact": "high",
            "mitigation": "Assign dedicated blocker resolution",
        },
        "resource_instability": {
            "event_types": ["resource_change"],
            "threshold": 1,
            "probability": 0.6,
            "impact": "medium",
            "mitigation": "Review workload distribution",
        },
    }

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "events" in data or "metrics" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result=[],
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: events or metrics required"
            )

        events = input.data.get("events", [])
        metrics = input.data.get("metrics", {})
        topology = input.data.get("topology", {})

        risks = []
        evidence = []

        # Pattern 1: Schedule slip
        delay_events = [e for e in events if e.get("type") == "delay"]
        if len(delay_events) >= self.RISK_PATTERNS["schedule_slip"]["threshold"]:
            pattern = self.RISK_PATTERNS["schedule_slip"]
            probability = min(pattern["base_probability"] + len(delay_events) * pattern["increment"], 0.9)
            risks.append({
                "id": f"risk-schedule-{len(risks)}",
                "title": "Schedule Delay Trend",
                "pattern": "schedule_slip",
                "probability": probability,
                "impact": pattern["impact"],
                "priority": self._calculate_priority(probability, pattern["impact"]),
                "mitigation": pattern["mitigation"],
                "evidence_count": len(delay_events),
            })
            evidence.extend([
                {"source_type": "event", "source_id": e.get("id"), "relevance": 1.0}
                for e in delay_events
            ])

        # Pattern 2: WIP overflow
        wip_count = topology.get("wip_count", 0)
        wip_limit = topology.get("wip_limit", 10)
        if wip_limit > 0 and wip_count > wip_limit * self.RISK_PATTERNS["wip_overflow"]["threshold"]:
            pattern = self.RISK_PATTERNS["wip_overflow"]
            risks.append({
                "id": f"risk-wip-{len(risks)}",
                "title": "WIP Limit Exceeded",
                "pattern": "wip_overflow",
                "probability": pattern["probability"],
                "impact": pattern["impact"],
                "priority": self._calculate_priority(pattern["probability"], pattern["impact"]),
                "mitigation": pattern["mitigation"],
                "wip_ratio": wip_count / wip_limit,
            })
            evidence.append({
                "source_type": "metric",
                "source_id": "wip",
                "relevance": 1.0,
            })

        # Pattern 3: Blocker increase
        blocker_events = [e for e in events if e.get("type") == "blocker_added"]
        if len(blocker_events) >= self.RISK_PATTERNS["blocker_increase"]["threshold"]:
            pattern = self.RISK_PATTERNS["blocker_increase"]
            risks.append({
                "id": f"risk-blocker-{len(risks)}",
                "title": "Blocker Increase",
                "pattern": "blocker_increase",
                "probability": pattern["probability"],
                "impact": pattern["impact"],
                "priority": self._calculate_priority(pattern["probability"], pattern["impact"]),
                "mitigation": pattern["mitigation"],
                "evidence_count": len(blocker_events),
            })
            evidence.extend([
                {"source_type": "event", "source_id": e.get("id"), "relevance": 1.0}
                for e in blocker_events
            ])

        # Calculate confidence
        confidence = min(len(evidence) / 10, 1.0) if risks else 0.5

        return SkillOutput(
            result=risks,
            confidence=confidence,
            evidence=evidence,
            metadata={
                "patterns_checked": len(self.RISK_PATTERNS),
                "risks_found": len(risks),
            }
        )

    def _calculate_priority(self, probability: float, impact: str) -> int:
        """Calculate risk priority (1-10)."""
        impact_scores = {"low": 1, "medium": 2, "high": 3}
        impact_score = impact_scores.get(impact, 2)
        return int(probability * impact_score * 3.3)


class AnalyzeDependencySkill(BaseSkill):
    """
    Analyze dependencies between items.

    Input:
        - items: List of items to analyze
        - relations: Known relationships

    Output:
        - result: Dependency analysis
        - confidence: Analysis confidence
    """

    name = "analyze_dependency"
    category = SkillCategory.ANALYZE
    description = "Analyze dependencies and conflicts"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "items" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: items required"
            )

        items = input.data.get("items", [])
        relations = input.data.get("relations", [])

        # Build dependency graph
        graph = self._build_dependency_graph(items, relations)

        # Find conflicts
        conflicts = self._find_conflicts(items, relations)

        # Find critical path
        critical_path = self._find_critical_path(graph)

        # Find orphans (items with no dependencies)
        orphans = self._find_orphans(items, relations)

        evidence = [
            {"source_type": "dependency", "source_id": r.get("id"), "relevance": 1.0}
            for r in relations
        ]

        confidence = 0.8 if not conflicts else 0.5

        return SkillOutput(
            result={
                "graph": graph,
                "conflicts": conflicts,
                "critical_path": critical_path,
                "orphans": orphans,
            },
            confidence=confidence,
            evidence=evidence,
            metadata={
                "total_items": len(items),
                "total_relations": len(relations),
                "conflict_count": len(conflicts),
            }
        )

    def _build_dependency_graph(self, items: List[Dict], relations: List[Dict]) -> Dict:
        """Build adjacency list from relations."""
        graph = {}
        for item in items:
            item_id = item.get("id")
            if item_id:
                graph[item_id] = {"item": item, "depends_on": [], "dependents": []}

        for rel in relations:
            source = rel.get("source_id")
            target = rel.get("target_id")
            if source in graph and target in graph:
                graph[source]["depends_on"].append(target)
                graph[target]["dependents"].append(source)

        return graph

    def _find_conflicts(self, items: List[Dict], relations: List[Dict]) -> List[Dict]:
        """Find dependency conflicts (cycles, missing deps)."""
        conflicts = []
        item_ids = {item.get("id") for item in items}

        for rel in relations:
            target = rel.get("target_id")
            if target and target not in item_ids:
                conflicts.append({
                    "type": "missing_dependency",
                    "source": rel.get("source_id"),
                    "missing": target,
                })

        return conflicts

    def _find_critical_path(self, graph: Dict) -> List[str]:
        """Find critical path (simplified - longest chain)."""
        # Simplified: return items with most dependents
        sorted_items = sorted(
            graph.items(),
            key=lambda x: len(x[1].get("dependents", [])),
            reverse=True
        )
        return [item_id for item_id, _ in sorted_items[:5]]

    def _find_orphans(self, items: List[Dict], relations: List[Dict]) -> List[str]:
        """Find items with no incoming or outgoing dependencies."""
        involved_ids = set()
        for rel in relations:
            involved_ids.add(rel.get("source_id"))
            involved_ids.add(rel.get("target_id"))

        orphans = []
        for item in items:
            item_id = item.get("id")
            if item_id and item_id not in involved_ids:
                orphans.append(item_id)

        return orphans


class AnalyzeSentimentSkill(BaseSkill):
    """
    Analyze sentiment of text content.

    Input:
        - texts: List of texts to analyze
        - context: Additional context

    Output:
        - result: Sentiment scores
        - confidence: Analysis confidence
    """

    name = "analyze_sentiment"
    category = SkillCategory.ANALYZE
    description = "Analyze sentiment in text content"
    version = "1.0.0"

    POSITIVE_WORDS = [
        "good", "great", "excellent", "complete", "done", "success", "progress",
        "improved", "resolved", "fixed", "achieved", "delivered",
        "좋", "완료", "성공", "해결", "달성", "진행",
    ]

    NEGATIVE_WORDS = [
        "bad", "issue", "problem", "delay", "blocked", "failed", "risk",
        "concern", "urgent", "critical", "bug", "error",
        "문제", "지연", "차단", "실패", "위험", "긴급", "오류",
    ]

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "texts" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: texts required"
            )

        texts = input.data.get("texts", [])

        results = []
        total_positive = 0
        total_negative = 0
        total_neutral = 0

        for text in texts:
            sentiment = self._analyze_text(text)
            results.append(sentiment)

            if sentiment["score"] > 0.2:
                total_positive += 1
            elif sentiment["score"] < -0.2:
                total_negative += 1
            else:
                total_neutral += 1

        total = len(texts) or 1
        confidence = 0.7  # Simple word-based analysis

        return SkillOutput(
            result={
                "sentiments": results,
                "summary": {
                    "positive_ratio": total_positive / total,
                    "negative_ratio": total_negative / total,
                    "neutral_ratio": total_neutral / total,
                    "overall_score": sum(r["score"] for r in results) / total,
                }
            },
            confidence=confidence,
            evidence=[],
            metadata={
                "total_texts": len(texts),
                "method": "keyword_based",
            }
        )

    def _analyze_text(self, text: str) -> Dict:
        """Analyze sentiment of a single text."""
        if not text:
            return {"text": text, "score": 0.0, "label": "neutral"}

        text_lower = text.lower()

        positive_count = sum(1 for word in self.POSITIVE_WORDS if word in text_lower)
        negative_count = sum(1 for word in self.NEGATIVE_WORDS if word in text_lower)

        total = positive_count + negative_count
        if total == 0:
            score = 0.0
            label = "neutral"
        else:
            score = (positive_count - negative_count) / total
            if score > 0.2:
                label = "positive"
            elif score < -0.2:
                label = "negative"
            else:
                label = "neutral"

        return {
            "text": text[:100],  # Truncate for output
            "score": score,
            "label": label,
            "positive_count": positive_count,
            "negative_count": negative_count,
        }
