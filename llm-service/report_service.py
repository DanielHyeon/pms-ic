"""
Report Generation Service.

Generates AI-powered report sections using LLM.
Provides role-specific prompts and content generation.
"""

import os
import logging
from typing import Dict, Any, Optional, List

logger = logging.getLogger(__name__)


class ReportService:
    """Service for generating report content using LLM."""

    def __init__(self, llm_model=None):
        """Initialize with optional LLM model."""
        self.model = llm_model
        self.max_tokens = int(os.getenv("REPORT_MAX_TOKENS", "1000"))
        self.temperature = float(os.getenv("REPORT_TEMPERATURE", "0.7"))

    def set_model(self, model):
        """Set the LLM model to use for report generation."""
        self.model = model

    def generate_section(
        self,
        prompt: str,
        context: Dict[str, Any],
        user_role: str,
        section_type: str = "general"
    ) -> Dict[str, Any]:
        """
        Generate content for a report section.

        Args:
            prompt: The generation prompt/instruction
            context: Data context for the section
            user_role: User's role for tone adjustment
            section_type: Type of section being generated

        Returns:
            Dict with content, success status
        """
        if self.model is None:
            logger.error("LLM model not set for ReportService")
            return {
                "success": False,
                "error": "LLM model not initialized",
                "content": None
            }

        try:
            # Build full prompt with context
            full_prompt = self._build_section_prompt(prompt, context, user_role, section_type)

            # Generate content
            logger.info(f"Generating {section_type} section for role: {user_role}")
            response = self.model(
                full_prompt,
                max_tokens=self.max_tokens,
                temperature=self.temperature,
                stop=["\n\n\n", "---"]
            )

            content = response["choices"][0]["text"].strip()

            # Clean up content
            content = self._cleanup_content(content)

            return {
                "success": True,
                "content": content
            }

        except Exception as e:
            logger.error(f"Section generation failed: {e}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "content": None
            }

    def generate_executive_summary(
        self,
        report_data: Dict[str, Any],
        user_role: str
    ) -> Dict[str, Any]:
        """
        Generate executive summary for a report.

        Args:
            report_data: Complete report data
            user_role: User's role for tone adjustment

        Returns:
            Dict with summary content
        """
        prompt = self._get_executive_summary_prompt(user_role)
        return self.generate_section(prompt, report_data, user_role, "executive_summary")

    def generate_weekly_summary(
        self,
        tasks_completed: List[Dict],
        tasks_in_progress: List[Dict],
        blockers: List[Dict],
        user_role: str
    ) -> Dict[str, Any]:
        """Generate weekly summary section."""
        context = {
            "tasks_completed": tasks_completed,
            "tasks_in_progress": tasks_in_progress,
            "blockers": blockers,
            "completed_count": len(tasks_completed),
            "in_progress_count": len(tasks_in_progress),
            "blocker_count": len(blockers)
        }

        prompt = self._get_weekly_summary_prompt(user_role)
        return self.generate_section(prompt, context, user_role, "weekly_summary")

    def _build_section_prompt(
        self,
        prompt: str,
        context: Dict[str, Any],
        user_role: str,
        section_type: str
    ) -> str:
        """Build the full prompt with context."""
        role_instruction = self._get_role_instruction(user_role)
        context_str = self._format_context(context)

        return f"""You are a professional report writer for a project management system.

{role_instruction}

## Section Type: {section_type}

## Data Context:
{context_str}

## Task:
{prompt}

## Guidelines:
- Be concise and professional
- Focus on actionable insights
- Use bullet points for lists
- Highlight key metrics
- Keep the tone appropriate for the audience
- Do not make up data - only use what's provided

Generated Content:
"""

    def _get_role_instruction(self, user_role: str) -> str:
        """Get role-specific writing instructions."""
        instructions = {
            "sponsor": """## Audience: Project Sponsor (Executive Level)
- Focus on business impact and ROI
- Highlight strategic risks and opportunities
- Keep technical details minimal
- Emphasize budget and timeline status""",

            "pmo_head": """## Audience: PMO Head (Senior Management)
- Focus on project health and portfolio view
- Include resource utilization insights
- Highlight cross-project dependencies
- Summarize key decisions needed""",

            "pm": """## Audience: Project Manager
- Focus on detailed progress metrics
- Include team performance indicators
- Highlight risks and mitigation actions
- Provide actionable next steps""",

            "team_lead": """## Audience: Team Lead
- Focus on team accomplishments
- Include individual contributions where relevant
- Highlight blockers affecting the team
- Summarize sprint/iteration progress""",

            "developer": """## Audience: Developer
- Focus on personal achievements
- Include technical accomplishments
- Keep it factual and straightforward
- Highlight any help needed""",

            "qa": """## Audience: QA Engineer
- Focus on testing progress and coverage
- Include defect metrics if available
- Highlight quality concerns
- Summarize test completion status"""
        }
        return instructions.get(user_role, "## Audience: Team Member\n- Keep it professional and concise")

    def _get_executive_summary_prompt(self, user_role: str) -> str:
        """Get prompt for executive summary based on role."""
        prompts = {
            "sponsor": """Generate an executive summary for senior leadership focusing on:
- Overall project health and status (1 sentence)
- Key achievements and milestones reached
- Strategic risks and their mitigation status
- Budget and resource status
Keep it to 3-4 concise paragraphs.""",

            "pmo_head": """Generate an executive summary for PMO leadership focusing on:
- Project portfolio status overview
- Key achievements across the project
- Resource utilization and capacity
- Critical risks requiring attention
Keep it detailed but digestible.""",

            "pm": """Generate a project manager summary focusing on:
- Sprint/iteration progress and velocity
- Team performance and productivity
- Current blockers and resolution status
- Next period priorities and dependencies
Be detailed and actionable.""",

            "team_lead": """Generate a team summary focusing on:
- Team accomplishments this period
- Work completed vs planned
- Team blockers and dependencies
- Resource needs and allocation
Focus on team-level insights.""",

            "developer": """Generate a personal work summary focusing on:
- Tasks completed this period
- Current work in progress
- Any blockers or issues faced
- Help or resources needed
Keep it brief and factual."""
        }
        return prompts.get(user_role, prompts["developer"])

    def _get_weekly_summary_prompt(self, user_role: str) -> str:
        """Get prompt for weekly summary."""
        return """Generate a weekly progress summary with these sections:

**Accomplishments:**
List key work completed this week with brief context.

**In Progress:**
List work currently underway with status notes.

**Blockers/Issues:**
List any blockers or issues requiring attention.

**Next Week:**
Brief preview of planned work for next week.

Use the provided data to populate each section. Be factual and concise."""

    def _format_context(self, context: Dict[str, Any]) -> str:
        """Format context dictionary as readable string."""
        lines = []
        for key, value in context.items():
            if isinstance(value, list):
                if len(value) == 0:
                    lines.append(f"- {key}: (none)")
                elif len(value) <= 5:
                    items = ", ".join(str(v) if not isinstance(v, dict) else v.get("title", v.get("name", str(v))) for v in value)
                    lines.append(f"- {key}: {items}")
                else:
                    lines.append(f"- {key}: {len(value)} items")
                    # Show first few
                    for v in value[:3]:
                        if isinstance(v, dict):
                            lines.append(f"  * {v.get('title', v.get('name', str(v)))}")
                        else:
                            lines.append(f"  * {v}")
                    lines.append(f"  * ... and {len(value) - 3} more")
            elif isinstance(value, dict):
                lines.append(f"- {key}: {len(value)} fields")
            else:
                lines.append(f"- {key}: {value}")
        return "\n".join(lines)

    def _cleanup_content(self, content: str) -> str:
        """Clean up generated content."""
        # Remove any markdown code blocks that might have been added
        content = content.strip()

        # Remove any prefix like "Generated Content:" if echoed
        if content.startswith("Generated Content:"):
            content = content[len("Generated Content:"):].strip()

        return content


# Singleton instance
_report_service: Optional[ReportService] = None


def get_report_service() -> ReportService:
    """Get or create singleton ReportService."""
    global _report_service
    if _report_service is None:
        _report_service = ReportService()
    return _report_service
