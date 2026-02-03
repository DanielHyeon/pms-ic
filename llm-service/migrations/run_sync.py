#!/usr/bin/env python3
"""
Run PostgreSQL to Neo4j sync manually.

Usage:
    python run_sync.py [full|incremental]
"""

import sys
import logging
from migrations.pg_neo4j_sync import PGNeo4jSyncService, SyncConfig

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "full"

    # SyncConfig uses environment variables with sensible defaults for Docker
    config = SyncConfig()
    service = PGNeo4jSyncService(config)

    try:
        print(f"Running {mode} sync...")

        if mode == "full":
            result = service.full_sync()
        else:
            result = service.incremental_sync()

        print(f"\nSync completed: success={result.success}")
        print(f"Total duration: {result.total_duration_ms:.2f}ms")

        print("\nEntity results:")
        for entity_type, entity_result in result.entity_results.items():
            status = "OK" if entity_result.success else "FAILED"
            print(f"  {entity_type}: {entity_result.records_synced} synced [{status}]")
            if entity_result.error:
                print(f"    Error: {entity_result.error}")

        print("\nRelationship results:")
        for rel_type, rel_result in result.relationship_results.items():
            status = "OK" if rel_result.success else "FAILED"
            print(f"  {rel_type}: {rel_result.records_synced} synced [{status}]")
            if rel_result.error:
                print(f"    Error: {rel_result.error}")

    except Exception as e:
        print(f"Sync failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
    finally:
        service.close()


if __name__ == "__main__":
    main()
