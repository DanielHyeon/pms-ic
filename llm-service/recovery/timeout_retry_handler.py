"""
Timeout and Retry Handler for Gemma 3 12B Q5
Implements timeout and retry logic
"""

import logging
import signal
import threading
from typing import Callable, Any, Optional, Tuple
from contextlib import contextmanager
from dataclasses import dataclass
from functools import wraps
import time

logger = logging.getLogger(__name__)


@dataclass
class TimeoutRetryConfig:
    """Timeout and retry configuration"""
    timeout_seconds: int = 30
    max_retries: int = 3
    backoff_factor: float = 1.5  # Exponential backoff factor
    initial_delay_ms: int = 100
    max_delay_ms: int = 5000
    jitter_enabled: bool = True  # Add jitter


class TimeoutException(Exception):
    """Timeout exception"""
    pass


class RetryableException(Exception):
    """Retryable exception"""
    pass


class TimeoutHandler:
    """Timeout handler (thread-based)"""

    def __init__(self, timeout_seconds: int):
        self.timeout_seconds = timeout_seconds
        self.result = None
        self.exception = None
        self.thread = None
        self.completed = False

    def run_with_timeout(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with timeout"""
        self.completed = False
        self.result = None
        self.exception = None

        def target():
            try:
                self.result = func(*args, **kwargs)
            except Exception as e:
                self.exception = e
            finally:
                self.completed = True

        self.thread = threading.Thread(target=target, daemon=True)
        self.thread.start()
        self.thread.join(timeout=self.timeout_seconds)

        if self.thread.is_alive():
            logger.warning(f"Function timed out after {self.timeout_seconds} seconds")
            raise TimeoutException(
                f"Operation timed out after {self.timeout_seconds} seconds"
            )

        if self.exception:
            raise self.exception

        return self.result


class RetryHandler:
    """Retry handler (exponential backoff + jitter)"""

    def __init__(self, config: TimeoutRetryConfig):
        self.config = config

    def get_backoff_delay(self, attempt: int) -> float:
        """Calculate retry delay (milliseconds)"""
        import random

        delay = self.config.initial_delay_ms * (self.config.backoff_factor ** attempt)
        delay = min(delay, self.config.max_delay_ms)

        if self.config.jitter_enabled:
            # Add jitter: random value in 0~10% of delay range
            jitter = random.uniform(0, delay * 0.1)  # 10% jitter
            delay += jitter

        return delay / 1000  # Convert to seconds

    def should_retry(self, attempt: int, exception: Exception) -> bool:
        """Determine if retry is possible"""
        if attempt >= self.config.max_retries:
            logger.info(f"Max retries ({self.config.max_retries}) reached")
            return False

        # Do not retry for specific exceptions
        non_retryable_exceptions = (TypeError, ValueError, AttributeError, KeyError)
        if isinstance(exception, non_retryable_exceptions):
            logger.debug(f"Non-retryable exception: {type(exception).__name__}")
            return False

        logger.info(f"Attempt {attempt + 1}/{self.config.max_retries} will be retried")
        return True

    def execute_with_retry(
        self,
        func: Callable,
        *args,
        on_retry_callback: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """
        Execute function with retry logic

        Args:
            func: Function to execute
            *args: Function arguments
            on_retry_callback: Callback to invoke on retry (passes attempt_num, delay_seconds)
            **kwargs: Function keyword arguments

        Returns:
            Function execution result
        """
        last_exception = None

        for attempt in range(self.config.max_retries):
            try:
                logger.info(f"Executing with retry: attempt {attempt + 1}/{self.config.max_retries}")
                return func(*args, **kwargs)

            except Exception as e:
                last_exception = e
                logger.warning(f"Attempt {attempt + 1} failed: {type(e).__name__}: {str(e)}")

                if not self.should_retry(attempt, e):
                    raise

                # Wait before retry
                delay = self.get_backoff_delay(attempt)
                logger.info(f"Retrying in {delay:.2f} seconds...")

                if on_retry_callback:
                    on_retry_callback(attempt + 1, delay)

                time.sleep(delay)

        # Max retries reached
        raise last_exception


class CombinedTimeoutRetry:
    """Combined timeout + retry handler"""

    def __init__(self, config: TimeoutRetryConfig):
        self.config = config
        self.timeout_handler = TimeoutHandler(config.timeout_seconds)
        self.retry_handler = RetryHandler(config)

    def execute(
        self,
        func: Callable,
        *args,
        on_retry_callback: Optional[Callable] = None,
        **kwargs
    ) -> Any:
        """
        Execute function with both timeout and retry applied
        """
        def func_with_timeout(*args, **kwargs):
            return self.timeout_handler.run_with_timeout(func, *args, **kwargs)

        return self.retry_handler.execute_with_retry(
            func_with_timeout,
            *args,
            on_retry_callback=on_retry_callback,
            **kwargs
        )


def with_timeout_retry(config: TimeoutRetryConfig):
    """
    Decorator: Automatically apply timeout and retry

    Usage:
        @with_timeout_retry(TimeoutRetryConfig(timeout_seconds=30, max_retries=3))
        def my_function():
            pass
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(*args, **kwargs):
            handler = CombinedTimeoutRetry(config)
            return handler.execute(func, *args, **kwargs)
        return wrapper
    return decorator


@contextmanager
def timeout_context(seconds: int):
    """
    Context manager: Execute code block within specified time

    Usage:
        with timeout_context(30):
            expensive_operation()
    """
    timeout_handler = TimeoutHandler(seconds)

    def signal_handler(signum, frame):
        raise TimeoutException(f"Operation timed out after {seconds} seconds")

    # Signal-based timeout setup (Unix only)
    try:
        signal.signal(signal.SIGALRM, signal_handler)
        signal.alarm(seconds)
        yield
    finally:
        signal.alarm(0)  # Cancel timeout


class AdaptiveTimeoutRetry:
    """Adaptive timeout and retry handler"""

    def __init__(self, initial_config: TimeoutRetryConfig):
        self.initial_config = initial_config
        self.current_config = TimeoutRetryConfig(**initial_config.__dict__)
        self.execution_history = []

    def record_execution(
        self,
        success: bool,
        execution_time_seconds: float,
        timeout_occurred: bool = False
    ):
        """Record execution history"""
        self.execution_history.append({
            "success": success,
            "execution_time": execution_time_seconds,
            "timeout_occurred": timeout_occurred,
            "timestamp": time.time()
        })

        # Keep only the last 10 records
        if len(self.execution_history) > 10:
            self.execution_history = self.execution_history[-10:]

    def adjust_config(self):
        """Adjust configuration based on execution history"""
        if len(self.execution_history) < 3:
            return

        recent_history = self.execution_history[-3:]
        timeout_count = sum(1 for h in recent_history if h["timeout_occurred"])
        avg_time = sum(h["execution_time"] for h in recent_history) / len(recent_history)

        # Increase timeout if timeouts are frequent
        if timeout_count >= 2:
            new_timeout = int(self.current_config.timeout_seconds * 1.5)
            logger.info(f"Increasing timeout from {self.current_config.timeout_seconds}s to {new_timeout}s")
            self.current_config.timeout_seconds = new_timeout

        # Decrease timeout if mostly successful (increase max request throughput)
        success_count = sum(1 for h in recent_history if h["success"])
        if success_count == 3 and self.current_config.timeout_seconds > self.initial_config.timeout_seconds:
            new_timeout = max(self.initial_config.timeout_seconds,
                            int(self.current_config.timeout_seconds * 0.8))
            logger.info(f"Decreasing timeout from {self.current_config.timeout_seconds}s to {new_timeout}s")
            self.current_config.timeout_seconds = new_timeout

    def execute_with_adaptation(
        self,
        func: Callable,
        *args,
        **kwargs
    ) -> Any:
        """Execute with adaptive timeout and retry"""
        handler = CombinedTimeoutRetry(self.current_config)
        start_time = time.time()
        timeout_occurred = False

        try:
            result = handler.execute(func, *args, **kwargs)
            execution_time = time.time() - start_time
            self.record_execution(success=True, execution_time_seconds=execution_time)
            self.adjust_config()
            return result

        except TimeoutException:
            execution_time = time.time() - start_time
            timeout_occurred = True
            self.record_execution(
                success=False,
                execution_time_seconds=execution_time,
                timeout_occurred=timeout_occurred
            )
            self.adjust_config()
            raise

        except Exception as e:
            execution_time = time.time() - start_time
            self.record_execution(
                success=False,
                execution_time_seconds=execution_time,
                timeout_occurred=timeout_occurred
            )
            raise


# Default configuration (for Gemma 3 12B Q5)
DEFAULT_GEMMA3_TIMEOUT_RETRY_CONFIG = TimeoutRetryConfig(
    timeout_seconds=30,  # 30 second timeout
    max_retries=3,       # Max 3 retries
    backoff_factor=1.5,
    initial_delay_ms=100,
    max_delay_ms=5000,
    jitter_enabled=True
)
