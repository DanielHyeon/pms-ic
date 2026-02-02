"""
Alert Service for Text2Query

Monitors metrics and triggers alerts when thresholds are exceeded.
Supports multiple notification channels.
"""
import logging
from typing import Optional, Dict, Any, List, Callable
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from collections import defaultdict

logger = logging.getLogger(__name__)


class AlertLevel(str, Enum):
    """Severity levels for alerts."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertType(str, Enum):
    """Types of alerts."""
    SUCCESS_RATE_LOW = "success_rate_low"
    LATENCY_HIGH = "latency_high"
    ERROR_SPIKE = "error_spike"
    COST_BUDGET_EXCEEDED = "cost_budget_exceeded"
    TOKEN_USAGE_HIGH = "token_usage_high"
    QUALITY_SCORE_LOW = "quality_score_low"
    CORRECTION_RATE_HIGH = "correction_rate_high"
    MODEL_ERROR = "model_error"
    CUSTOM = "custom"


class AlertStatus(str, Enum):
    """Status of an alert."""
    ACTIVE = "active"
    ACKNOWLEDGED = "acknowledged"
    RESOLVED = "resolved"
    SILENCED = "silenced"


@dataclass
class Alert:
    """
    Single alert instance.

    Contains all information about a triggered alert.
    """
    alert_id: str
    alert_type: AlertType
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime = field(default_factory=datetime.now)
    status: AlertStatus = AlertStatus.ACTIVE

    # Context
    metric_name: Optional[str] = None
    metric_value: Optional[float] = None
    threshold: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Resolution
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_notes: Optional[str] = None

    def acknowledge(self, by: str = "system"):
        """Acknowledge the alert."""
        self.status = AlertStatus.ACKNOWLEDGED
        self.metadata["acknowledged_by"] = by
        self.metadata["acknowledged_at"] = datetime.now().isoformat()

    def resolve(self, by: str = "system", notes: str = ""):
        """Resolve the alert."""
        self.status = AlertStatus.RESOLVED
        self.resolved_at = datetime.now()
        self.resolved_by = by
        self.resolution_notes = notes

    def silence(self, duration_minutes: int = 60):
        """Silence the alert temporarily."""
        self.status = AlertStatus.SILENCED
        self.metadata["silenced_until"] = (
            datetime.now() + timedelta(minutes=duration_minutes)
        ).isoformat()

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "alert_id": self.alert_id,
            "alert_type": self.alert_type.value,
            "level": self.level.value,
            "title": self.title,
            "message": self.message,
            "timestamp": self.timestamp.isoformat(),
            "status": self.status.value,
            "metric_name": self.metric_name,
            "metric_value": self.metric_value,
            "threshold": self.threshold,
            "metadata": self.metadata,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "resolved_by": self.resolved_by,
            "resolution_notes": self.resolution_notes,
        }


@dataclass
class AlertRule:
    """
    Rule for triggering alerts.

    Defines conditions and thresholds for alerting.
    """
    name: str
    alert_type: AlertType
    level: AlertLevel
    enabled: bool = True

    # Thresholds
    threshold: float = 0.0
    comparison: str = "lt"  # lt, gt, eq, lte, gte

    # Evaluation
    evaluation_window_minutes: int = 5
    min_samples: int = 1

    # Rate limiting
    cooldown_minutes: int = 15

    # Notification
    notification_channels: List[str] = field(default_factory=lambda: ["log"])

    def evaluate(self, value: float) -> bool:
        """Check if value triggers this rule."""
        if self.comparison == "lt":
            return value < self.threshold
        elif self.comparison == "gt":
            return value > self.threshold
        elif self.comparison == "eq":
            return value == self.threshold
        elif self.comparison == "lte":
            return value <= self.threshold
        elif self.comparison == "gte":
            return value >= self.threshold
        return False


# Default alert rules
DEFAULT_ALERT_RULES = [
    AlertRule(
        name="Low Success Rate",
        alert_type=AlertType.SUCCESS_RATE_LOW,
        level=AlertLevel.ERROR,
        threshold=0.7,  # Alert if < 70%
        comparison="lt",
        evaluation_window_minutes=5,
    ),
    AlertRule(
        name="High Latency",
        alert_type=AlertType.LATENCY_HIGH,
        level=AlertLevel.WARNING,
        threshold=5000,  # Alert if > 5000ms
        comparison="gt",
        evaluation_window_minutes=5,
    ),
    AlertRule(
        name="Error Spike",
        alert_type=AlertType.ERROR_SPIKE,
        level=AlertLevel.ERROR,
        threshold=10,  # Alert if > 10 errors in window
        comparison="gt",
        evaluation_window_minutes=5,
    ),
    AlertRule(
        name="High Correction Rate",
        alert_type=AlertType.CORRECTION_RATE_HIGH,
        level=AlertLevel.WARNING,
        threshold=0.5,  # Alert if > 50% need correction
        comparison="gt",
        evaluation_window_minutes=10,
    ),
    AlertRule(
        name="Low Quality Score",
        alert_type=AlertType.QUALITY_SCORE_LOW,
        level=AlertLevel.WARNING,
        threshold=60,  # Alert if < 60/100
        comparison="lt",
        evaluation_window_minutes=15,
    ),
    AlertRule(
        name="Daily Budget Exceeded",
        alert_type=AlertType.COST_BUDGET_EXCEEDED,
        level=AlertLevel.CRITICAL,
        threshold=1.0,  # 100% of budget
        comparison="gte",
        cooldown_minutes=60,  # Only alert once per hour
    ),
]


class AlertService:
    """
    Service for managing alerts.

    Features:
    - Rule-based alert triggering
    - Multiple notification channels
    - Alert history and management
    - Rate limiting and cooldowns
    - Custom alert handlers
    """

    def __init__(
        self,
        rules: Optional[List[AlertRule]] = None,
        custom_handlers: Optional[Dict[str, Callable[[Alert], None]]] = None,
        retention_hours: int = 72
    ):
        """
        Initialize the alert service.

        Args:
            rules: Alert rules (defaults to DEFAULT_ALERT_RULES)
            custom_handlers: Custom notification handlers
            retention_hours: Hours to retain alert history
        """
        self.rules = rules if rules is not None else list(DEFAULT_ALERT_RULES)
        self.custom_handlers = custom_handlers or {}
        self.retention_hours = retention_hours

        # Alert storage
        self._alerts: List[Alert] = []
        self._alert_counter = 0

        # Cooldown tracking
        self._last_alert_time: Dict[str, datetime] = {}

        # Built-in notification handlers
        self._handlers: Dict[str, Callable[[Alert], None]] = {
            "log": self._log_handler,
            "console": self._console_handler,
            **self.custom_handlers
        }

    def check_metric(
        self,
        metric_name: str,
        value: float,
        metadata: Optional[Dict[str, Any]] = None
    ) -> List[Alert]:
        """
        Check a metric value against all rules.

        Args:
            metric_name: Name of the metric
            value: Current metric value
            metadata: Additional context

        Returns:
            List of triggered alerts
        """
        triggered = []

        for rule in self.rules:
            if not rule.enabled:
                continue

            if not rule.evaluate(value):
                continue

            # Check cooldown
            cooldown_key = f"{rule.name}:{metric_name}"
            if cooldown_key in self._last_alert_time:
                elapsed = datetime.now() - self._last_alert_time[cooldown_key]
                if elapsed.total_seconds() < rule.cooldown_minutes * 60:
                    continue

            # Create alert
            alert = self._create_alert(rule, metric_name, value, metadata)
            triggered.append(alert)

            # Update cooldown
            self._last_alert_time[cooldown_key] = datetime.now()

            # Send notifications
            self._notify(alert, rule.notification_channels)

        return triggered

    def trigger_alert(
        self,
        alert_type: AlertType,
        level: AlertLevel,
        title: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None,
        channels: Optional[List[str]] = None
    ) -> Alert:
        """
        Manually trigger an alert.

        Args:
            alert_type: Type of alert
            level: Severity level
            title: Alert title
            message: Alert message
            metadata: Additional context
            channels: Notification channels (default: ["log"])

        Returns:
            Created Alert
        """
        self._alert_counter += 1
        alert = Alert(
            alert_id=f"alert-{self._alert_counter:06d}",
            alert_type=alert_type,
            level=level,
            title=title,
            message=message,
            metadata=metadata or {}
        )

        self._alerts.append(alert)
        self._cleanup_old_alerts()

        # Send notifications
        self._notify(alert, channels or ["log"])

        return alert

    def _create_alert(
        self,
        rule: AlertRule,
        metric_name: str,
        value: float,
        metadata: Optional[Dict[str, Any]]
    ) -> Alert:
        """Create an alert from a triggered rule."""
        self._alert_counter += 1

        comparison_text = {
            "lt": "below",
            "gt": "above",
            "eq": "equal to",
            "lte": "at or below",
            "gte": "at or above"
        }.get(rule.comparison, rule.comparison)

        alert = Alert(
            alert_id=f"alert-{self._alert_counter:06d}",
            alert_type=rule.alert_type,
            level=rule.level,
            title=rule.name,
            message=(
                f"{metric_name} is {comparison_text} threshold: "
                f"{value:.2f} (threshold: {rule.threshold})"
            ),
            metric_name=metric_name,
            metric_value=value,
            threshold=rule.threshold,
            metadata=metadata or {}
        )

        self._alerts.append(alert)
        self._cleanup_old_alerts()

        return alert

    def _notify(self, alert: Alert, channels: List[str]) -> None:
        """Send alert to notification channels."""
        for channel in channels:
            if channel in self._handlers:
                try:
                    self._handlers[channel](alert)
                except Exception as e:
                    logger.error(f"Failed to send alert to {channel}: {e}")
            else:
                logger.warning(f"Unknown notification channel: {channel}")

    def _log_handler(self, alert: Alert) -> None:
        """Log alert handler."""
        log_fn = {
            AlertLevel.INFO: logger.info,
            AlertLevel.WARNING: logger.warning,
            AlertLevel.ERROR: logger.error,
            AlertLevel.CRITICAL: logger.critical,
        }.get(alert.level, logger.warning)

        log_fn(f"[ALERT:{alert.alert_type.value}] {alert.title}: {alert.message}")

    def _console_handler(self, alert: Alert) -> None:
        """Console print handler."""
        level_emoji = {
            AlertLevel.INFO: "i",
            AlertLevel.WARNING: "!",
            AlertLevel.ERROR: "X",
            AlertLevel.CRITICAL: "XX",
        }.get(alert.level, "!")

        print(f"[{level_emoji}] {alert.title}: {alert.message}")

    def _cleanup_old_alerts(self) -> None:
        """Remove alerts older than retention period."""
        cutoff = datetime.now() - timedelta(hours=self.retention_hours)
        self._alerts = [a for a in self._alerts if a.timestamp > cutoff]

    def add_handler(self, name: str, handler: Callable[[Alert], None]) -> None:
        """Add a custom notification handler."""
        self._handlers[name] = handler

    def add_rule(self, rule: AlertRule) -> None:
        """Add a new alert rule."""
        self.rules.append(rule)

    def enable_rule(self, rule_name: str) -> bool:
        """Enable an alert rule by name."""
        for rule in self.rules:
            if rule.name == rule_name:
                rule.enabled = True
                return True
        return False

    def disable_rule(self, rule_name: str) -> bool:
        """Disable an alert rule by name."""
        for rule in self.rules:
            if rule.name == rule_name:
                rule.enabled = False
                return True
        return False

    def acknowledge_alert(self, alert_id: str, by: str = "user") -> bool:
        """Acknowledge an alert by ID."""
        for alert in self._alerts:
            if alert.alert_id == alert_id:
                alert.acknowledge(by)
                return True
        return False

    def resolve_alert(self, alert_id: str, by: str = "user", notes: str = "") -> bool:
        """Resolve an alert by ID."""
        for alert in self._alerts:
            if alert.alert_id == alert_id:
                alert.resolve(by, notes)
                return True
        return False

    def get_active_alerts(self) -> List[Alert]:
        """Get all active (unresolved) alerts."""
        return [a for a in self._alerts if a.status == AlertStatus.ACTIVE]

    def get_alerts_by_level(self, level: AlertLevel) -> List[Alert]:
        """Get alerts by severity level."""
        return [a for a in self._alerts if a.level == level]

    def get_alerts_by_type(self, alert_type: AlertType) -> List[Alert]:
        """Get alerts by type."""
        return [a for a in self._alerts if a.alert_type == alert_type]

    def get_alert_summary(self) -> Dict[str, Any]:
        """
        Get summary of current alert status.

        Returns:
            Dictionary with alert counts and details
        """
        active = [a for a in self._alerts if a.status == AlertStatus.ACTIVE]

        # Count by level
        by_level = defaultdict(int)
        for alert in active:
            by_level[alert.level.value] += 1

        # Count by type
        by_type = defaultdict(int)
        for alert in active:
            by_type[alert.alert_type.value] += 1

        return {
            "total_active": len(active),
            "by_level": dict(by_level),
            "by_type": dict(by_type),
            "critical_count": by_level.get("critical", 0),
            "error_count": by_level.get("error", 0),
            "warning_count": by_level.get("warning", 0),
            "recent_alerts": [a.to_dict() for a in active[-10:]],
            "rules_enabled": sum(1 for r in self.rules if r.enabled),
            "rules_total": len(self.rules),
        }

    def get_all_alerts(self, limit: int = 100) -> List[Dict[str, Any]]:
        """Get all alerts (for debugging)."""
        return [a.to_dict() for a in self._alerts[-limit:]]


# Singleton instance
_alert_service: Optional[AlertService] = None


def get_alert_service(**kwargs) -> AlertService:
    """Get or create the alert service singleton."""
    global _alert_service
    if _alert_service is None:
        _alert_service = AlertService(**kwargs)
    return _alert_service


def reset_alert_service() -> None:
    """Reset the alert service singleton (for testing)."""
    global _alert_service
    _alert_service = None
