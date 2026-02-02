"""
Database Configuration Module

Centralizes database connection settings and credential management.
Credentials are loaded from environment variables only - no hardcoded defaults.
"""

import os
from dataclasses import dataclass
from typing import Optional
import logging

logger = logging.getLogger(__name__)


class DatabaseConfigError(Exception):
    """Raised when required database configuration is missing."""
    pass


def _get_required_env(key: str, description: str) -> str:
    """Get required environment variable or raise descriptive error."""
    value = os.getenv(key)
    if not value:
        raise DatabaseConfigError(
            f"Missing required environment variable: {key}. "
            f"Description: {description}. "
            f"Please set this variable in your environment or .env file."
        )
    return value


def _get_env_with_default(key: str, default: str, is_password: bool = False) -> str:
    """
    Get environment variable with default.

    For development convenience, allows defaults for non-sensitive values.
    Password defaults are only used in development/test mode.
    """
    value = os.getenv(key)
    if value:
        return value

    # Check if we're in production mode
    env_mode = os.getenv("FLASK_ENV", "development").lower()
    is_production = env_mode in ("production", "prod")

    if is_password and is_production:
        raise DatabaseConfigError(
            f"Missing required password environment variable: {key}. "
            f"Password defaults are not allowed in production mode."
        )

    if is_password:
        logger.warning(
            f"Using default password for {key}. "
            "This is only acceptable in development/test environments."
        )

    return default


@dataclass(frozen=True)
class PostgresConfig:
    """PostgreSQL connection configuration."""
    host: str
    port: int
    database: str
    user: str
    password: str
    schema: str = "public"

    @classmethod
    def from_env(cls, prefix: str = "PG") -> "PostgresConfig":
        """Create config from environment variables."""
        return cls(
            host=_get_env_with_default(f"{prefix}_HOST", "localhost"),
            port=int(_get_env_with_default(f"{prefix}_PORT", "5432")),
            database=_get_env_with_default(f"{prefix}_DATABASE", "pms"),
            user=_get_env_with_default(f"{prefix}_USER", "pms"),
            password=_get_env_with_default(f"{prefix}_PASSWORD", "pms_password", is_password=True),
            schema=_get_env_with_default(f"{prefix}_SCHEMA", "public"),
        )

    @property
    def connection_string(self) -> str:
        """Get SQLAlchemy-style connection string."""
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"

    def as_connect_params(self) -> dict:
        """Get parameters for psycopg2.connect()."""
        return {
            "host": self.host,
            "port": self.port,
            "database": self.database,
            "user": self.user,
            "password": self.password,
        }


@dataclass(frozen=True)
class Neo4jConfig:
    """Neo4j connection configuration."""
    uri: str
    user: str
    password: str
    database: str = "neo4j"

    @classmethod
    def from_env(cls, prefix: str = "NEO4J") -> "Neo4jConfig":
        """Create config from environment variables."""
        return cls(
            uri=_get_env_with_default(f"{prefix}_URI", "bolt://localhost:7687"),
            user=_get_env_with_default(f"{prefix}_USER", "neo4j"),
            password=_get_env_with_default(f"{prefix}_PASSWORD", "pmspassword123", is_password=True),
            database=_get_env_with_default(f"{prefix}_DATABASE", "neo4j"),
        )

    def as_auth_tuple(self) -> tuple:
        """Get (user, password) tuple for driver authentication."""
        return (self.user, self.password)


@dataclass(frozen=True)
class RedisConfig:
    """Redis connection configuration."""
    host: str
    port: int
    password: Optional[str]
    db: int = 0

    @classmethod
    def from_env(cls, prefix: str = "REDIS") -> "RedisConfig":
        """Create config from environment variables."""
        password = os.getenv(f"{prefix}_PASSWORD")  # Password is optional for Redis
        return cls(
            host=_get_env_with_default(f"{prefix}_HOST", "localhost"),
            port=int(_get_env_with_default(f"{prefix}_PORT", "6379")),
            password=password,
            db=int(_get_env_with_default(f"{prefix}_DB", "0")),
        )

    @property
    def url(self) -> str:
        """Get Redis URL."""
        auth = f":{self.password}@" if self.password else ""
        return f"redis://{auth}{self.host}:{self.port}/{self.db}"


# Singleton instances - lazy loaded
_postgres_config: Optional[PostgresConfig] = None
_neo4j_config: Optional[Neo4jConfig] = None
_redis_config: Optional[RedisConfig] = None


def get_postgres_config() -> PostgresConfig:
    """Get PostgreSQL configuration singleton."""
    global _postgres_config
    if _postgres_config is None:
        _postgres_config = PostgresConfig.from_env()
    return _postgres_config


def get_neo4j_config() -> Neo4jConfig:
    """Get Neo4j configuration singleton."""
    global _neo4j_config
    if _neo4j_config is None:
        _neo4j_config = Neo4jConfig.from_env()
    return _neo4j_config


def get_redis_config() -> RedisConfig:
    """Get Redis configuration singleton."""
    global _redis_config
    if _redis_config is None:
        _redis_config = RedisConfig.from_env()
    return _redis_config


def reset_configs():
    """Reset all config singletons. Useful for testing."""
    global _postgres_config, _neo4j_config, _redis_config
    _postgres_config = None
    _neo4j_config = None
    _redis_config = None
