"""
Value Metrics Collector - Collection and Aggregation

Provides:
- Metric observation recording
- Aggregation and reporting
- Trend analysis
- Dashboard data
"""

from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from collections import defaultdict
import threading
import statistics
import logging

from . import (
    MetricDefinition,
    MetricObservation,
    MetricReport,
    MetricCategory,
    ALL_METRICS,
)

logger = logging.getLogger(__name__)


class ValueMetricsCollector:
    """
    Collector for value metrics.

    Records observations, calculates aggregations, and provides
    reports for business value measurement.

    Example:
        collector = ValueMetricsCollector()

        # Record observation
        collector.record("report_generation_time", 3.5, project_id="proj1")

        # Get report
        report = collector.get_report("report_generation_time", "weekly")

        # Get dashboard data
        dashboard = collector.get_dashboard_data()
    """

    def __init__(self):
        """Initialize collector with pre-defined metrics."""
        self._metrics: Dict[str, MetricDefinition] = {
            m.name: m for m in ALL_METRICS
        }
        self._observations: Dict[str, List[MetricObservation]] = defaultdict(list)
        self._lock = threading.Lock()

    def register_metric(self, metric: MetricDefinition) -> None:
        """Register a custom metric definition."""
        with self._lock:
            self._metrics[metric.name] = metric
            logger.info(f"Registered metric: {metric.name}")

    def record(
        self,
        metric_name: str,
        value: float,
        project_id: str = None,
        user_id: str = None,
        context: Dict[str, Any] = None,
    ) -> None:
        """
        Record a metric observation.

        Args:
            metric_name: Name of the metric
            value: Observed value
            project_id: Associated project
            user_id: Associated user
            context: Additional context
        """
        observation = MetricObservation(
            metric_name=metric_name,
            value=value,
            project_id=project_id,
            user_id=user_id,
            context=context or {},
        )

        with self._lock:
            self._observations[metric_name].append(observation)

            # Keep only last 10000 observations per metric
            if len(self._observations[metric_name]) > 10000:
                self._observations[metric_name] = self._observations[metric_name][-10000:]

    def get_observations(
        self,
        metric_name: str,
        since: datetime = None,
        project_id: str = None,
        limit: int = 1000,
    ) -> List[MetricObservation]:
        """
        Get observations for a metric.

        Args:
            metric_name: Name of the metric
            since: Filter observations after this time
            project_id: Filter by project
            limit: Maximum observations to return

        Returns:
            List of observations
        """
        observations = self._observations.get(metric_name, [])

        if since:
            since_iso = since.isoformat()
            observations = [o for o in observations if o.timestamp >= since_iso]

        if project_id:
            observations = [o for o in observations if o.project_id == project_id]

        return observations[-limit:]

    def get_report(
        self,
        metric_name: str,
        period: str = "weekly",
        project_id: str = None,
    ) -> Optional[MetricReport]:
        """
        Get aggregated report for a metric.

        Args:
            metric_name: Name of the metric
            period: Report period (daily, weekly, monthly)
            project_id: Filter by project

        Returns:
            Metric report or None
        """
        # Calculate period start
        now = datetime.utcnow()
        if period == "daily":
            since = now - timedelta(days=1)
        elif period == "weekly":
            since = now - timedelta(weeks=1)
        elif period == "monthly":
            since = now - timedelta(days=30)
        else:
            since = now - timedelta(weeks=1)

        observations = self.get_observations(metric_name, since, project_id)

        if not observations:
            return None

        values = [o.value for o in observations]
        metric_def = self._metrics.get(metric_name)

        # Calculate trend
        trend = self._calculate_trend(values)

        # Calculate improvement vs baseline
        improvement = None
        if metric_def and metric_def.baseline is not None:
            current = values[-1]
            baseline = metric_def.baseline

            if metric_def.higher_is_better:
                improvement = ((current - baseline) / baseline) * 100 if baseline != 0 else 0
            else:
                improvement = ((baseline - current) / baseline) * 100 if baseline != 0 else 0

        return MetricReport(
            metric_name=metric_name,
            period=period,
            observations=len(observations),
            current_value=values[-1],
            average=statistics.mean(values),
            min_value=min(values),
            max_value=max(values),
            trend=trend,
            improvement=improvement,
        )

    def get_category_report(
        self,
        category: MetricCategory,
        period: str = "weekly",
    ) -> Dict[str, Any]:
        """
        Get report for all metrics in a category.

        Args:
            category: Metric category
            period: Report period

        Returns:
            Category report dict
        """
        reports = []

        for name, metric in self._metrics.items():
            if metric.category == category:
                report = self.get_report(name, period)
                if report:
                    reports.append({
                        "metric": metric.to_dict(),
                        "report": report.to_dict(),
                    })

        return {
            "category": category.value,
            "period": period,
            "metrics": reports,
            "metric_count": len(reports),
        }

    def get_dashboard_data(self) -> Dict[str, Any]:
        """
        Get data for value metrics dashboard.

        Returns:
            Dashboard data dict
        """
        dashboard = {
            "generated_at": datetime.utcnow().isoformat(),
            "categories": {},
            "highlights": [],
            "overall_score": 0.0,
        }

        total_improvement = 0
        improvement_count = 0

        for category in MetricCategory:
            category_report = self.get_category_report(category)
            dashboard["categories"][category.value] = category_report

            # Calculate highlights
            for metric_data in category_report["metrics"]:
                report = metric_data["report"]
                metric = metric_data["metric"]

                if report.get("improvement") is not None:
                    total_improvement += report["improvement"]
                    improvement_count += 1

                    # Highlight significant improvements
                    if report["improvement"] > 50:
                        dashboard["highlights"].append({
                            "metric": metric["name"],
                            "improvement": report["improvement"],
                            "message": f"{metric['name']} improved by {report['improvement']:.1f}%",
                        })

        # Calculate overall score (average improvement)
        if improvement_count > 0:
            dashboard["overall_score"] = total_improvement / improvement_count

        return dashboard

    def get_efficiency_summary(self) -> Dict[str, Any]:
        """Get efficiency metrics summary."""
        report = self.get_category_report(MetricCategory.EFFICIENCY)

        total_time_saved = 0
        for metric_data in report["metrics"]:
            metric = metric_data["metric"]
            rep = metric_data["report"]

            if metric.get("baseline") and rep.get("current_value"):
                baseline = metric["baseline"]
                current = rep["current_value"]

                # For time metrics (lower is better)
                if not metric.get("higher_is_better", True):
                    time_saved = baseline - current
                    total_time_saved += time_saved

        return {
            "category": "efficiency",
            "total_time_saved": total_time_saved,
            "time_unit": "minutes",
            "metrics": report["metrics"],
        }

    def get_quality_summary(self) -> Dict[str, Any]:
        """Get quality metrics summary."""
        report = self.get_category_report(MetricCategory.QUALITY)

        avg_quality = 0
        quality_metrics = []

        for metric_data in report["metrics"]:
            rep = metric_data["report"]
            if rep.get("current_value"):
                quality_metrics.append(rep["current_value"])

        if quality_metrics:
            avg_quality = statistics.mean(quality_metrics)

        return {
            "category": "quality",
            "average_quality_score": avg_quality,
            "metrics": report["metrics"],
        }

    def get_adoption_summary(self) -> Dict[str, Any]:
        """Get adoption metrics summary."""
        report = self.get_category_report(MetricCategory.ADOPTION)

        acceptance_rate = None
        for metric_data in report["metrics"]:
            if metric_data["metric"]["name"] == "ai_response_acceptance":
                acceptance_rate = metric_data["report"].get("current_value")
                break

        return {
            "category": "adoption",
            "acceptance_rate": acceptance_rate,
            "metrics": report["metrics"],
        }

    def get_cost_summary(self) -> Dict[str, Any]:
        """Get cost metrics summary."""
        report = self.get_category_report(MetricCategory.COST)

        total_savings = 0
        for metric_data in report["metrics"]:
            metric = metric_data["metric"]
            rep = metric_data["report"]

            if "cost" in metric["name"].lower() and metric.get("baseline"):
                baseline = metric["baseline"]
                current = rep.get("current_value", baseline)
                savings = baseline - current
                total_savings += savings

        return {
            "category": "cost",
            "estimated_monthly_savings": total_savings,
            "currency": "USD",
            "metrics": report["metrics"],
        }

    def export_csv(self, metric_name: str = None) -> str:
        """
        Export observations to CSV format.

        Args:
            metric_name: Specific metric or all if None

        Returns:
            CSV string
        """
        lines = ["metric_name,value,timestamp,project_id,user_id"]

        metrics_to_export = [metric_name] if metric_name else list(self._observations.keys())

        for name in metrics_to_export:
            for obs in self._observations.get(name, []):
                lines.append(
                    f"{obs.metric_name},{obs.value},{obs.timestamp},"
                    f"{obs.project_id or ''},{obs.user_id or ''}"
                )

        return "\n".join(lines)

    def _calculate_trend(self, values: List[float]) -> str:
        """Calculate trend from values."""
        if len(values) < 3:
            return "stable"

        # Compare first third to last third
        third = len(values) // 3
        first_avg = statistics.mean(values[:third]) if third > 0 else values[0]
        last_avg = statistics.mean(values[-third:]) if third > 0 else values[-1]

        diff_pct = ((last_avg - first_avg) / first_avg * 100) if first_avg != 0 else 0

        if diff_pct > 5:
            return "increasing"
        elif diff_pct < -5:
            return "decreasing"
        else:
            return "stable"

    def reset(self, metric_name: str = None) -> None:
        """Reset observations."""
        with self._lock:
            if metric_name:
                self._observations[metric_name] = []
            else:
                self._observations.clear()


# Global collector instance
_global_collector: Optional[ValueMetricsCollector] = None


def get_collector() -> ValueMetricsCollector:
    """Get the global value metrics collector."""
    global _global_collector
    if _global_collector is None:
        _global_collector = ValueMetricsCollector()
    return _global_collector
