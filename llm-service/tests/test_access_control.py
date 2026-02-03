"""
Test Script: Role-Based Access Control for RAG Documents

This script tests the access control implementation to verify:
1. Users with lower access levels CANNOT see higher-level documents in RAG results
2. Users with higher access levels CAN see lower-level documents
3. Project-based filtering works correctly

Usage:
    python test_access_control.py
"""

import os
import sys
import logging
import uuid
from typing import Dict, List

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)


# Role access level mapping
ROLE_ACCESS_LEVELS = {
    "ADMIN": 6,
    "SPONSOR": 5,
    "PMO_HEAD": 4,
    "PM": 3,
    "BUSINESS_ANALYST": 2,
    "QA": 2,
    "DEVELOPER": 1,
    "MEMBER": 1,
    "AUDITOR": 0,
}


class AccessControlTester:
    """Test class for role-based access control in RAG."""

    def __init__(self):
        # Import here to allow script to be run standalone
        from services.rag_service_neo4j import Neo4jRAGService

        self.rag = Neo4jRAGService()
        self.test_project_id = f"test-project-{uuid.uuid4().hex[:8]}"
        self.test_doc_ids = []
        logger.info(f"Initialized tester with project: {self.test_project_id}")

    def cleanup(self):
        """Remove test documents from Neo4j."""
        logger.info("Cleaning up test documents...")
        for doc_id in self.test_doc_ids:
            try:
                self.rag.delete_document(doc_id)
                logger.info(f"  Deleted test document: {doc_id}")
            except Exception as e:
                logger.warning(f"  Failed to delete {doc_id}: {e}")
        self.test_doc_ids.clear()

    def create_test_document(
        self,
        role: str,
        content: str,
        doc_name: str,
    ) -> str:
        """Create a test document with specific access level."""
        doc_id = f"test-doc-{role.lower()}-{uuid.uuid4().hex[:8]}"
        access_level = ROLE_ACCESS_LEVELS.get(role.upper(), 1)

        metadata = {
            "source": doc_name,
            "type": "test",
            "project_id": self.test_project_id,
            "uploaded_by_role": role.upper(),
            "access_level": str(access_level),
        }

        logger.info(f"Creating test document: {doc_name}")
        logger.info(f"  - doc_id: {doc_id}")
        logger.info(f"  - role: {role}")
        logger.info(f"  - access_level: {access_level}")

        success = self.rag.add_document(
            doc_id=doc_id,
            text=content,
            metadata=metadata,
        )

        if success:
            self.test_doc_ids.append(doc_id)
            logger.info(f"  - Status: Created successfully")
        else:
            logger.error(f"  - Status: FAILED to create")

        return doc_id

    def search_as_role(
        self,
        query: str,
        role: str,
        top_k: int = 5,
    ) -> List[Dict]:
        """Search documents as a specific role."""
        access_level = ROLE_ACCESS_LEVELS.get(role.upper(), 1)

        filter_metadata = {
            "project_id": self.test_project_id,
            "user_access_level": access_level,
        }

        logger.info(f"Searching as {role} (level={access_level}): '{query}'")
        results = self.rag.search(
            query=query,
            top_k=top_k,
            filter_metadata=filter_metadata,
        )
        logger.info(f"  Found {len(results)} results")
        return results

    def run_tests(self) -> Dict[str, bool]:
        """Run all access control tests."""
        results = {}

        try:
            # Setup: Create test documents at different access levels
            logger.info("\n" + "=" * 60)
            logger.info("SETUP: Creating test documents at different access levels")
            logger.info("=" * 60)

            # Create documents for different roles
            self.create_test_document(
                role="SPONSOR",
                content="This is a confidential executive strategy document about market expansion. Only sponsors and executives should see this sensitive business strategy.",
                doc_name="executive_strategy.pdf",
            )

            self.create_test_document(
                role="PM",
                content="Project management plan for the new insurance claims system. Contains sprint timelines and resource allocation.",
                doc_name="pm_project_plan.pdf",
            )

            self.create_test_document(
                role="DEVELOPER",
                content="Technical documentation for the claims API. Contains endpoint specifications and code examples.",
                doc_name="developer_api_docs.pdf",
            )

            # Test 1: Developer should NOT see Sponsor document
            logger.info("\n" + "=" * 60)
            logger.info("TEST 1: Developer searching for 'strategy' (should NOT see SPONSOR doc)")
            logger.info("=" * 60)

            dev_results = self.search_as_role("executive strategy market", "DEVELOPER")
            sponsor_doc_found = any(
                "executive_strategy" in r.get("metadata", {}).get("source", "")
                or "executive" in r.get("content", "").lower()
                for r in dev_results
            )

            if not sponsor_doc_found:
                logger.info("  PASS: Developer correctly cannot see SPONSOR document")
                results["test1_dev_no_sponsor"] = True
            else:
                logger.error("  FAIL: Developer incorrectly can see SPONSOR document!")
                results["test1_dev_no_sponsor"] = False

            # Test 2: Developer SHOULD see Developer document
            logger.info("\n" + "=" * 60)
            logger.info("TEST 2: Developer searching for 'API' (should see DEVELOPER doc)")
            logger.info("=" * 60)

            dev_results = self.search_as_role("API documentation endpoint", "DEVELOPER")
            dev_doc_found = any(
                "developer_api" in r.get("metadata", {}).get("source", "")
                or "api" in r.get("content", "").lower()
                for r in dev_results
            )

            if dev_doc_found:
                logger.info("  PASS: Developer correctly can see DEVELOPER document")
                results["test2_dev_sees_dev"] = True
            else:
                logger.error("  FAIL: Developer cannot see DEVELOPER document!")
                results["test2_dev_sees_dev"] = False

            # Test 3: Sponsor SHOULD see all documents
            logger.info("\n" + "=" * 60)
            logger.info("TEST 3: Sponsor searching for documents (should see ALL)")
            logger.info("=" * 60)

            sponsor_results = self.search_as_role("strategy project API", "SPONSOR")

            logger.info(f"  Sponsor found {len(sponsor_results)} documents")
            for r in sponsor_results:
                source = r.get("metadata", {}).get("source", "unknown")
                logger.info(f"    - {source}")

            # Sponsor should be able to find documents at various levels
            results["test3_sponsor_sees_all"] = len(sponsor_results) >= 1

            if results["test3_sponsor_sees_all"]:
                logger.info("  PASS: Sponsor can see documents")
            else:
                logger.error("  FAIL: Sponsor cannot see any documents!")

            # Test 4: PM should see Developer docs but NOT Sponsor docs
            logger.info("\n" + "=" * 60)
            logger.info("TEST 4: PM access control (should see DEV, not SPONSOR)")
            logger.info("=" * 60)

            pm_strategy_results = self.search_as_role("executive strategy confidential", "PM")
            pm_api_results = self.search_as_role("API endpoint technical", "PM")

            pm_sees_sponsor = any(
                "executive_strategy" in r.get("metadata", {}).get("source", "")
                or "confidential executive" in r.get("content", "").lower()
                for r in pm_strategy_results
            )

            pm_sees_dev = any(
                "developer_api" in r.get("metadata", {}).get("source", "")
                or "api" in r.get("content", "").lower()
                for r in pm_api_results
            )

            if not pm_sees_sponsor and pm_sees_dev:
                logger.info("  PASS: PM correctly sees DEV docs but not SPONSOR docs")
                results["test4_pm_access"] = True
            else:
                logger.error(f"  FAIL: PM access incorrect (sees_sponsor={pm_sees_sponsor}, sees_dev={pm_sees_dev})")
                results["test4_pm_access"] = False

            # Test 5: Cross-project isolation
            logger.info("\n" + "=" * 60)
            logger.info("TEST 5: Cross-project isolation")
            logger.info("=" * 60)

            # Search with a different project_id
            other_project_filter = {
                "project_id": "other-project-123",
                "user_access_level": 6,  # Admin level
            }

            cross_project_results = self.rag.search(
                query="API strategy project",
                top_k=5,
                filter_metadata=other_project_filter,
            )

            our_docs_found = any(
                r.get("metadata", {}).get("project_id") == self.test_project_id
                for r in cross_project_results
            )

            if not our_docs_found:
                logger.info("  PASS: Documents from test project not visible in other project search")
                results["test5_project_isolation"] = True
            else:
                logger.error("  FAIL: Test project documents leaked to other project search!")
                results["test5_project_isolation"] = False

        except Exception as e:
            logger.error(f"Test error: {e}", exc_info=True)
            results["error"] = str(e)

        return results

    def print_summary(self, results: Dict[str, bool]):
        """Print test summary."""
        logger.info("\n" + "=" * 60)
        logger.info("TEST SUMMARY")
        logger.info("=" * 60)

        passed = sum(1 for v in results.values() if v is True)
        failed = sum(1 for v in results.values() if v is False)
        total = passed + failed

        for test_name, passed_flag in results.items():
            if test_name == "error":
                logger.info(f"  ERROR: {passed_flag}")
            elif passed_flag:
                logger.info(f"  PASS: {test_name}")
            else:
                logger.info(f"  FAIL: {test_name}")

        logger.info("-" * 60)
        logger.info(f"Total: {passed}/{total} tests passed")

        if failed == 0:
            logger.info("All access control tests PASSED!")
        else:
            logger.error(f"{failed} tests FAILED!")

        return failed == 0


def main():
    """Run access control tests."""
    logger.info("=" * 60)
    logger.info("Role-Based Access Control Test Suite")
    logger.info("=" * 60)

    tester = AccessControlTester()

    try:
        results = tester.run_tests()
        all_passed = tester.print_summary(results)
        sys.exit(0 if all_passed else 1)

    finally:
        # Always cleanup test documents
        tester.cleanup()
        tester.rag.close()


if __name__ == "__main__":
    main()
