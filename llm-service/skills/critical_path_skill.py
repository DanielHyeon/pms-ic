"""
Critical Path Method (CPM) Skill

Calculates the critical path for WBS items using Forward/Backward pass algorithm.

Features:
- Early Start (ES) / Early Finish (EF) calculation
- Late Start (LS) / Late Finish (LF) calculation
- Total Float and Free Float
- Critical Path identification
- Cycle detection
"""

from typing import Dict, Any, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from collections import defaultdict, deque
import logging

from . import BaseSkill, SkillCategory, SkillInput, SkillOutput

logger = logging.getLogger(__name__)


@dataclass
class WbsNode:
    """Represents a WBS item in the CPM graph."""
    id: str
    name: str
    duration: int  # in days
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    predecessors: List[str] = field(default_factory=list)
    successors: List[str] = field(default_factory=list)

    # Forward pass results
    early_start: int = 0
    early_finish: int = 0

    # Backward pass results
    late_start: int = 0
    late_finish: int = 0

    # Float calculations
    total_float: int = 0
    free_float: int = 0

    # Critical path flag
    is_critical: bool = False


class CriticalPathSkill(BaseSkill):
    """
    Calculate Critical Path for WBS items using CPM algorithm.

    Input:
        - items: List of WBS items with id, name, startDate, endDate
        - dependencies: List of predecessor/successor relationships

    Output:
        - critical_path: List of item IDs on the critical path
        - items_with_float: Dict of items with ES/EF/LS/LF/Float values
        - project_duration: Total project duration in days
    """

    name = "critical_path"
    category = SkillCategory.ANALYZE
    description = "Calculate Critical Path using CPM algorithm"
    version = "1.0.0"

    def validate_input(self, input: SkillInput) -> bool:
        """Validate that we have items and dependencies."""
        data = input.data
        if not data.get("items"):
            return False
        return True

    def execute(self, input: SkillInput) -> SkillOutput:
        """Execute CPM calculation."""
        try:
            items = input.data.get("items", [])
            dependencies = input.data.get("dependencies", [])
            project_start = input.data.get("project_start_date")

            if not items:
                return SkillOutput(
                    result={"critical_path": [], "items_with_float": {}, "project_duration": 0},
                    confidence=0.0,
                    evidence=[],
                    metadata={"error": "No items provided"},
                )

            # Build graph
            graph = self._build_graph(items, dependencies)

            # Check for cycles
            cycle = self._detect_cycle(graph)
            if cycle:
                return SkillOutput(
                    result={"critical_path": [], "items_with_float": {}, "project_duration": 0},
                    confidence=0.0,
                    evidence=[],
                    metadata={"error": f"Cycle detected: {' -> '.join(cycle)}"},
                    error=f"Cycle detected in dependencies: {' -> '.join(cycle)}",
                )

            # Get topological order
            topo_order = self._topological_sort(graph)

            # Forward pass
            self._forward_pass(graph, topo_order)

            # Backward pass
            self._backward_pass(graph, topo_order)

            # Calculate floats and identify critical path
            critical_path = self._calculate_floats_and_critical_path(graph)

            # Build result
            items_with_float = self._build_items_with_float(graph)
            project_duration = self._get_project_duration(graph)

            return SkillOutput(
                result={
                    "critical_path": critical_path,
                    "items_with_float": items_with_float,
                    "project_duration": project_duration,
                },
                confidence=0.95,
                evidence=[
                    {"source_type": "cpm_calculation", "items_analyzed": len(items)},
                ],
                metadata={
                    "total_items": len(items),
                    "total_dependencies": len(dependencies),
                    "critical_items": len(critical_path),
                },
            )

        except Exception as e:
            logger.error(f"CPM calculation error: {e}", exc_info=True)
            return SkillOutput(
                result={"critical_path": [], "items_with_float": {}, "project_duration": 0},
                confidence=0.0,
                evidence=[],
                metadata={},
                error=str(e),
            )

    def _build_graph(self, items: List[Dict], dependencies: List[Dict]) -> Dict[str, WbsNode]:
        """Build graph from items and dependencies."""
        graph: Dict[str, WbsNode] = {}

        # Create nodes
        for item in items:
            item_id = item.get("id")
            if not item_id:
                continue

            start_date = self._parse_date(item.get("startDate") or item.get("plannedStartDate"))
            end_date = self._parse_date(item.get("endDate") or item.get("plannedEndDate"))

            # Calculate duration
            if start_date and end_date:
                duration = (end_date - start_date).days + 1
            else:
                duration = item.get("duration", 1)

            graph[item_id] = WbsNode(
                id=item_id,
                name=item.get("name", ""),
                duration=max(1, duration),  # Minimum 1 day
                start_date=start_date,
                end_date=end_date,
            )

        # Add dependencies
        for dep in dependencies:
            pred_id = dep.get("predecessorId")
            succ_id = dep.get("successorId")

            if pred_id in graph and succ_id in graph:
                graph[pred_id].successors.append(succ_id)
                graph[succ_id].predecessors.append(pred_id)

        return graph

    def _parse_date(self, date_str: Optional[str]) -> Optional[datetime]:
        """Parse date string to datetime."""
        if not date_str:
            return None
        try:
            # Handle ISO format
            if "T" in date_str:
                return datetime.fromisoformat(date_str.replace("Z", "+00:00"))
            return datetime.strptime(date_str, "%Y-%m-%d")
        except (ValueError, TypeError):
            return None

    def _detect_cycle(self, graph: Dict[str, WbsNode]) -> Optional[List[str]]:
        """Detect cycle in the graph using DFS."""
        WHITE, GRAY, BLACK = 0, 1, 2
        color = {node_id: WHITE for node_id in graph}
        parent = {}

        def dfs(node_id: str, path: List[str]) -> Optional[List[str]]:
            color[node_id] = GRAY
            path.append(node_id)

            for succ_id in graph[node_id].successors:
                if succ_id not in graph:
                    continue
                if color[succ_id] == GRAY:
                    # Found cycle
                    cycle_start = path.index(succ_id)
                    return path[cycle_start:] + [succ_id]
                if color[succ_id] == WHITE:
                    result = dfs(succ_id, path)
                    if result:
                        return result

            path.pop()
            color[node_id] = BLACK
            return None

        for node_id in graph:
            if color[node_id] == WHITE:
                result = dfs(node_id, [])
                if result:
                    return result

        return None

    def _topological_sort(self, graph: Dict[str, WbsNode]) -> List[str]:
        """Return nodes in topological order."""
        in_degree = {node_id: len(node.predecessors) for node_id, node in graph.items()}
        queue = deque([node_id for node_id, degree in in_degree.items() if degree == 0])
        result = []

        while queue:
            node_id = queue.popleft()
            result.append(node_id)

            for succ_id in graph[node_id].successors:
                if succ_id in in_degree:
                    in_degree[succ_id] -= 1
                    if in_degree[succ_id] == 0:
                        queue.append(succ_id)

        # Add orphan nodes (no dependencies at all)
        for node_id in graph:
            if node_id not in result:
                result.append(node_id)

        return result

    def _forward_pass(self, graph: Dict[str, WbsNode], topo_order: List[str]) -> None:
        """
        Forward pass: Calculate ES (Early Start) and EF (Early Finish).

        ES = max(EF of all predecessors), or 0 if no predecessors
        EF = ES + Duration
        """
        for node_id in topo_order:
            node = graph[node_id]

            if not node.predecessors:
                node.early_start = 0
            else:
                # ES = max(EF of predecessors)
                max_ef = 0
                for pred_id in node.predecessors:
                    if pred_id in graph:
                        max_ef = max(max_ef, graph[pred_id].early_finish)
                node.early_start = max_ef

            node.early_finish = node.early_start + node.duration

    def _backward_pass(self, graph: Dict[str, WbsNode], topo_order: List[str]) -> None:
        """
        Backward pass: Calculate LS (Late Start) and LF (Late Finish).

        LF = min(LS of all successors), or project_end if no successors
        LS = LF - Duration
        """
        # Find project end (max EF)
        project_end = max(node.early_finish for node in graph.values())

        # Process in reverse topological order
        for node_id in reversed(topo_order):
            node = graph[node_id]

            if not node.successors:
                node.late_finish = project_end
            else:
                # LF = min(LS of successors)
                min_ls = float("inf")
                for succ_id in node.successors:
                    if succ_id in graph:
                        min_ls = min(min_ls, graph[succ_id].late_start)
                node.late_finish = min_ls if min_ls != float("inf") else project_end

            node.late_start = node.late_finish - node.duration

    def _calculate_floats_and_critical_path(self, graph: Dict[str, WbsNode]) -> List[str]:
        """
        Calculate Total Float and Free Float, identify critical path.

        Total Float = LS - ES = LF - EF
        Free Float = min(ES of successors) - EF
        Critical Path = items where Total Float = 0
        """
        critical_path = []

        for node_id, node in graph.items():
            # Total Float
            node.total_float = node.late_start - node.early_start

            # Free Float
            if not node.successors:
                node.free_float = 0
            else:
                min_successor_es = min(
                    graph[succ_id].early_start
                    for succ_id in node.successors
                    if succ_id in graph
                )
                node.free_float = min_successor_es - node.early_finish

            # Critical path items have zero total float
            if node.total_float == 0:
                node.is_critical = True
                critical_path.append(node_id)

        # Sort critical path by early start
        critical_path.sort(key=lambda nid: graph[nid].early_start)

        return critical_path

    def _build_items_with_float(self, graph: Dict[str, WbsNode]) -> Dict[str, Dict]:
        """Build items_with_float result dictionary."""
        result = {}

        for node_id, node in graph.items():
            result[node_id] = {
                "name": node.name,
                "duration": node.duration,
                "earlyStart": node.early_start,
                "earlyFinish": node.early_finish,
                "lateStart": node.late_start,
                "lateFinish": node.late_finish,
                "totalFloat": node.total_float,
                "freeFloat": node.free_float,
                "isCritical": node.is_critical,
            }

        return result

    def _get_project_duration(self, graph: Dict[str, WbsNode]) -> int:
        """Get total project duration (max early finish)."""
        if not graph:
            return 0
        return max(node.early_finish for node in graph.values())


class CriticalPathAnalyzer:
    """
    Standalone analyzer for use outside of skill framework.
    Can be called directly from routes/API endpoints.
    """

    def __init__(self):
        self.skill = CriticalPathSkill()

    def analyze(
        self,
        items: List[Dict],
        dependencies: List[Dict],
        project_start_date: Optional[str] = None,
    ) -> Dict[str, Any]:
        """
        Analyze critical path for given items and dependencies.

        Args:
            items: List of WBS items with id, name, startDate, endDate
            dependencies: List of dependencies with predecessorId, successorId
            project_start_date: Optional project start date

        Returns:
            Dict with critical_path, items_with_float, project_duration
        """
        skill_input = SkillInput(
            data={
                "items": items,
                "dependencies": dependencies,
                "project_start_date": project_start_date,
            },
            context={},
        )

        output = self.skill.execute(skill_input)

        if output.error:
            return {
                "success": False,
                "error": output.error,
                "data": None,
            }

        return {
            "success": True,
            "error": None,
            "data": output.result,
        }
