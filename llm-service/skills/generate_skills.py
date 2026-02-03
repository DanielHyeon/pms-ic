"""
Generate Skills - Content generation

Skills:
- GenerateSummarySkill: Generate text summaries
- GenerateReportSkill: Generate structured reports
"""

from typing import Dict, Any, List, Optional
import logging

from . import BaseSkill, SkillCategory, SkillInput, SkillOutput

logger = logging.getLogger(__name__)


class GenerateSummarySkill(BaseSkill):
    """
    Generate text summaries from content.

    Input:
        - content: Text or list of texts to summarize
        - max_length: Maximum summary length
        - style: "executive" | "technical" | "brief"

    Output:
        - result: Summary text
        - confidence: Generation confidence
    """

    name = "generate_summary"
    category = SkillCategory.GENERATE
    description = "Generate text summaries using LLM"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "content" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result="",
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: content required"
            )

        content = input.data.get("content")
        max_length = input.options.get("max_length", 500)
        style = input.options.get("style", "brief")

        # Handle list of content
        if isinstance(content, list):
            content = "\n\n".join(str(c) for c in content)

        try:
            summary = self._generate_summary(content, max_length, style)

            # Confidence based on content length ratio
            original_length = len(content)
            summary_length = len(summary)
            if original_length > 0:
                compression = 1 - (summary_length / original_length)
                confidence = 0.5 + (compression * 0.3)  # Higher compression = higher confidence
            else:
                confidence = 0.5

            return SkillOutput(
                result=summary,
                confidence=min(confidence, 0.9),
                evidence=[],
                metadata={
                    "original_length": original_length,
                    "summary_length": summary_length,
                    "style": style,
                }
            )

        except Exception as e:
            logger.error(f"Summary generation error: {e}")
            return SkillOutput(
                result="",
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e)
            )

    def _generate_summary(self, content: str, max_length: int, style: str) -> str:
        """Generate summary using LLM."""
        try:
            from integrations.model_gateway import ModelGateway
            gateway = ModelGateway()

            style_instructions = {
                "executive": "Write a high-level executive summary focusing on key outcomes and decisions.",
                "technical": "Write a technical summary including specific details and metrics.",
                "brief": "Write a brief summary in 2-3 sentences.",
            }

            prompt = f"""{style_instructions.get(style, style_instructions["brief"])}

Content to summarize:
{content[:5000]}  # Limit content length

Summary (max {max_length} characters):"""

            result = gateway.generate(prompt)
            summary = result.get("content", "")

            # Truncate if needed
            if len(summary) > max_length:
                summary = summary[:max_length].rsplit(" ", 1)[0] + "..."

            return summary

        except ImportError:
            # Fallback: simple extraction
            sentences = content.split(".")
            return ". ".join(sentences[:3]) + "." if sentences else content[:max_length]


class GenerateReportSkill(BaseSkill):
    """
    Generate structured reports.

    Input:
        - data: Report data (metrics, events, etc.)
        - template: Report template type
        - sections: List of sections to include

    Output:
        - result: Structured report content
        - confidence: Generation confidence
    """

    name = "generate_report"
    category = SkillCategory.GENERATE
    description = "Generate structured reports from data"
    version = "1.0.0"

    TEMPLATES = {
        "weekly": {
            "sections": ["executive_summary", "metrics", "accomplishments", "issues", "next_week"],
            "format": "markdown",
        },
        "sprint": {
            "sections": ["goal", "committed_items", "completed", "carried_over", "retrospective"],
            "format": "markdown",
        },
        "risk": {
            "sections": ["overview", "high_risks", "medium_risks", "mitigations", "monitoring"],
            "format": "markdown",
        },
    }

    def validate_input(self, input: SkillInput) -> bool:
        data = input.data
        return "data" in data

    def execute(self, input: SkillInput) -> SkillOutput:
        if not self.validate_input(input):
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error="Invalid input: data required"
            )

        data = input.data.get("data", {})
        template = input.options.get("template", "weekly")
        sections = input.options.get("sections")

        template_config = self.TEMPLATES.get(template, self.TEMPLATES["weekly"])
        if not sections:
            sections = template_config["sections"]

        try:
            report = self._generate_report(data, template, sections)

            # Calculate confidence based on data completeness
            data_keys = set(data.keys())
            expected_keys = {"metrics", "events", "items", "summary"}
            available = len(data_keys & expected_keys)
            confidence = 0.5 + (available / len(expected_keys)) * 0.4

            evidence = [
                {
                    "source_type": "data",
                    "source_id": key,
                    "title": f"Report data: {key}",
                    "relevance": 1.0,
                }
                for key in data.keys()
            ]

            return SkillOutput(
                result=report,
                confidence=confidence,
                evidence=evidence,
                metadata={
                    "template": template,
                    "sections": sections,
                    "format": template_config["format"],
                }
            )

        except Exception as e:
            logger.error(f"Report generation error: {e}")
            return SkillOutput(
                result={},
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e)
            )

    def _generate_report(self, data: Dict, template: str, sections: List[str]) -> Dict[str, str]:
        """Generate report sections."""
        report = {}

        for section in sections:
            content = self._generate_section(section, data, template)
            report[section] = content

        # Compile full report
        report["full_content"] = self._compile_report(report, sections)

        return report

    def _generate_section(self, section: str, data: Dict, template: str) -> str:
        """Generate a single section."""
        generators = {
            "executive_summary": self._generate_executive_summary,
            "metrics": self._generate_metrics_section,
            "accomplishments": self._generate_accomplishments_section,
            "issues": self._generate_issues_section,
            "next_week": self._generate_next_week_section,
            "goal": self._generate_goal_section,
            "committed_items": self._generate_items_section,
            "completed": self._generate_completed_section,
            "carried_over": self._generate_carryover_section,
            "retrospective": self._generate_retrospective_section,
            "overview": self._generate_overview_section,
            "high_risks": self._generate_risk_section,
            "medium_risks": self._generate_risk_section,
            "mitigations": self._generate_mitigation_section,
            "monitoring": self._generate_monitoring_section,
        }

        generator = generators.get(section, lambda d: f"## {section.replace('_', ' ').title()}\n\n*Section pending*")
        return generator(data)

    def _generate_executive_summary(self, data: Dict) -> str:
        """Generate executive summary."""
        metrics = data.get("metrics", {})
        velocity = metrics.get("velocity", "N/A")
        completion = metrics.get("completion_rate", "N/A")

        return f"""## Executive Summary

Project is progressing with velocity of {velocity} points per sprint.
Sprint completion rate: {completion}%

Key highlights from this period are listed in the sections below."""

    def _generate_metrics_section(self, data: Dict) -> str:
        """Generate metrics section."""
        metrics = data.get("metrics", {})
        lines = ["## Key Metrics\n"]

        for key, value in metrics.items():
            lines.append(f"- **{key.replace('_', ' ').title()}**: {value}")

        return "\n".join(lines)

    def _generate_accomplishments_section(self, data: Dict) -> str:
        """Generate accomplishments section."""
        items = data.get("completed_items", [])
        lines = ["## Accomplishments\n"]

        if items:
            for item in items[:10]:
                lines.append(f"- {item.get('title', 'Item')}")
        else:
            lines.append("- *No completed items reported*")

        return "\n".join(lines)

    def _generate_issues_section(self, data: Dict) -> str:
        """Generate issues section."""
        issues = data.get("issues", [])
        lines = ["## Issues & Blockers\n"]

        if issues:
            for issue in issues[:10]:
                lines.append(f"- **{issue.get('title', 'Issue')}**: {issue.get('status', 'Open')}")
        else:
            lines.append("- *No critical issues*")

        return "\n".join(lines)

    def _generate_next_week_section(self, data: Dict) -> str:
        """Generate next week plan."""
        planned = data.get("planned_items", [])
        lines = ["## Next Week Plan\n"]

        if planned:
            for item in planned[:10]:
                lines.append(f"- {item.get('title', 'Item')}")
        else:
            lines.append("- *Continue with current sprint items*")

        return "\n".join(lines)

    def _generate_goal_section(self, data: Dict) -> str:
        return f"## Sprint Goal\n\n{data.get('sprint_goal', '*Goal not defined*')}"

    def _generate_items_section(self, data: Dict) -> str:
        items = data.get("committed_items", [])
        lines = ["## Committed Items\n"]
        for item in items[:15]:
            lines.append(f"- [{item.get('status', '?')}] {item.get('title', 'Item')} ({item.get('points', 0)} pts)")
        return "\n".join(lines)

    def _generate_completed_section(self, data: Dict) -> str:
        items = data.get("completed_items", [])
        lines = ["## Completed\n"]
        for item in items[:15]:
            lines.append(f"- ✅ {item.get('title', 'Item')}")
        return "\n".join(lines)

    def _generate_carryover_section(self, data: Dict) -> str:
        items = data.get("carryover_items", [])
        lines = ["## Carried Over\n"]
        for item in items[:10]:
            lines.append(f"- ⏳ {item.get('title', 'Item')} - {item.get('reason', 'incomplete')}")
        return "\n".join(lines)

    def _generate_retrospective_section(self, data: Dict) -> str:
        return "## Retrospective\n\n*To be discussed in team meeting*"

    def _generate_overview_section(self, data: Dict) -> str:
        risks = data.get("risks", [])
        return f"## Risk Overview\n\n{len(risks)} risks identified and tracked."

    def _generate_risk_section(self, data: Dict) -> str:
        risks = data.get("risks", [])
        lines = ["## Risks\n"]
        for risk in risks[:10]:
            lines.append(f"- **{risk.get('title', 'Risk')}** (P: {risk.get('probability', 0):.0%}, I: {risk.get('impact', 'medium')})")
        return "\n".join(lines)

    def _generate_mitigation_section(self, data: Dict) -> str:
        risks = data.get("risks", [])
        lines = ["## Mitigations\n"]
        for risk in risks[:10]:
            lines.append(f"- {risk.get('title', 'Risk')}: {risk.get('mitigation', 'TBD')}")
        return "\n".join(lines)

    def _generate_monitoring_section(self, data: Dict) -> str:
        return "## Monitoring\n\n*Risk dashboard updated weekly*"

    def _compile_report(self, sections: Dict[str, str], section_order: List[str]) -> str:
        """Compile sections into full report."""
        parts = ["# Project Report\n"]
        for section in section_order:
            if section in sections:
                parts.append(sections[section])
                parts.append("")  # Add spacing
        return "\n".join(parts)
