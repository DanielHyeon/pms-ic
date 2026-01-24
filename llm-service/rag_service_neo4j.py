"""
Neo4j 기반 GraphRAG 서비스
벡터 검색 + 그래프 관계를 Neo4j 단일 DB에서 처리
프로젝트 파티셔닝 + 권한 기반 접근 제어 지원

참조: https://github.com/gongwon-nayeon/graphrag-tools-retriever
"""

import logging
import os
import uuid
from typing import Dict, List, Optional
from neo4j import GraphDatabase
from sentence_transformers import SentenceTransformer

from document_parser import DocumentParser, LayoutAwareChunker

logger = logging.getLogger(__name__)

# Role-based access levels (higher = more access privileges)
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

def get_access_level(role: str) -> int:
    """Get access level for a role name."""
    return ROLE_ACCESS_LEVELS.get(role.upper() if role else "MEMBER", 1)

class ToolsRetriever:
    """상황에 따라 검색 전략을 선택하는 간단한 ToolsRetriever."""

    def __init__(self, search_fn):
        self.search_fn = search_fn

    def retrieve(
        self,
        query: str,
        top_k: int = 3,
        filter_metadata: Optional[Dict] = None,
    ) -> List[Dict]:
        strategy = self._select_strategy(query, filter_metadata)
        use_graph_expansion = strategy == "graph"
        logger.info("ToolsRetriever strategy=%s, use_graph_expansion=%s", strategy, use_graph_expansion)
        return self.search_fn(
            query=query,
            top_k=top_k,
            filter_metadata=filter_metadata,
            use_graph_expansion=use_graph_expansion,
        )

    def _select_strategy(self, query: str, filter_metadata: Optional[Dict]) -> str:
        query_lower = query.lower()

        graph_keywords = [
            "관계", "연관", "연계", "연결", "흐름", "순서", "단계", "프로세스",
            "이전", "다음", "전후", "맥락", "연속", "의존",
        ]
        vector_keywords = ["정의", "의미", "뭐", "무엇", "설명", "개요", "차이", "비교"]
        domain_vector_keywords = [
            "플래닝 포커", "planning poker", "스크럼", "scrum", "xp",
            "extreme programming", "칸반", "kanban",
        ]

        # 각 키워드 매칭 확인 및 로깅
        matched_graph = [kw for kw in graph_keywords if kw in query_lower]
        matched_vector = [kw for kw in vector_keywords if kw in query_lower]
        matched_domain = [kw for kw in domain_vector_keywords if kw in query_lower]

        logger.info(f"🔍 ToolsRetriever strategy selection for query: '{query}'")
        logger.info(f"  - Graph keywords matched: {matched_graph}")
        logger.info(f"  - Vector keywords matched: {matched_vector}")
        logger.info(f"  - Domain keywords matched: {matched_domain}")
        logger.info(f"  - Filter metadata: {filter_metadata}")
        logger.info(f"  - Query length: {len(query_lower)}")

        if any(keyword in query_lower for keyword in graph_keywords):
            logger.info("  ✅ Selected strategy: GRAPH (graph keywords matched)")
            return "graph"
        if any(keyword in query_lower for keyword in vector_keywords):
            logger.info("  ✅ Selected strategy: VECTOR (vector keywords matched)")
            return "vector"
        if any(keyword in query_lower for keyword in domain_vector_keywords):
            logger.info("  ✅ Selected strategy: VECTOR (domain keywords matched)")
            return "vector"
        if filter_metadata:
            logger.info("  ✅ Selected strategy: VECTOR (filter metadata present)")
            return "vector"
        if len(query_lower) <= 12:
            logger.info("  ✅ Selected strategy: VECTOR (short query)")
            return "vector"
        logger.info("  ✅ Selected strategy: GRAPH (default)")
        return "graph"


class RAGServiceNeo4j:
    """Neo4j 기반 GraphRAG 서비스 - 벡터 + 그래프 통합"""

    def __init__(self):
        # Neo4j 연결 설정
        neo4j_uri = os.getenv("NEO4J_URI", "bolt://localhost:7687")
        neo4j_user = os.getenv("NEO4J_USER", "neo4j")
        neo4j_password = os.getenv("NEO4J_PASSWORD", "pmspassword123")

        logger.info(f"Connecting to Neo4j at {neo4j_uri}")
        self.driver = GraphDatabase.driver(neo4j_uri, auth=(neo4j_user, neo4j_password))

        # 임베딩 모델 로드
        embedding_device = os.getenv("EMBEDDING_DEVICE", "cpu")
        logger.info(f"Loading embedding model on device: {embedding_device}...")

        try:
            self.embedding_model = SentenceTransformer(
                'intfloat/multilingual-e5-large',
                device=embedding_device
            )
        except Exception as e:
            logger.warning(f"Failed to load embedding model on {embedding_device}: {e}")
            embedding_device = "cpu"
            self.embedding_model = SentenceTransformer(
                'intfloat/multilingual-e5-large',
                device=embedding_device
            )

        self.embedding_dim = 1024
        logger.info("Embedding model loaded successfully")

        # Document parser initialization (heuristic-based)
        logger.info("Initializing document parser (heuristic mode)...")
        self.parser = DocumentParser(use_mock=True)

        self.chunker = LayoutAwareChunker(max_chunk_size=800, overlap=100)
        self.tools_retriever = ToolsRetriever(self._search_impl)

        # 초기 설정
        self._initialize_database()

    def _initialize_database(self):
        """데이터베이스 초기 설정 (제약조건, 인덱스 생성)"""
        with self.driver.session() as session:
            try:
                # 1. 유니크 제약조건 생성
                constraints = [
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (d:Document) REQUIRE d.doc_id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (c:Chunk) REQUIRE c.chunk_id IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (cat:Category) REQUIRE cat.name IS UNIQUE",
                    "CREATE CONSTRAINT IF NOT EXISTS FOR (p:Project) REQUIRE p.project_id IS UNIQUE",
                ]

                for constraint in constraints:
                    try:
                        session.run(constraint)
                    except Exception as e:
                        logger.debug(f"Constraint already exists or error: {e}")

                # 2. Create indexes for access control filtering
                indexes = [
                    "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.project_id)",
                    "CREATE INDEX IF NOT EXISTS FOR (c:Chunk) ON (c.access_level)",
                    "CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.project_id)",
                    "CREATE INDEX IF NOT EXISTS FOR (d:Document) ON (d.access_level)",
                ]
                for index in indexes:
                    try:
                        session.run(index)
                    except Exception as e:
                        logger.debug(f"Index already exists or error: {e}")

                # 2. 벡터 인덱스 생성
                try:
                    session.run("""
                        CREATE VECTOR INDEX chunk_embeddings IF NOT EXISTS
                        FOR (c:Chunk)
                        ON c.embedding
                        OPTIONS {
                            indexConfig: {
                                `vector.dimensions`: $dimensions,
                                `vector.similarity_function`: 'cosine'
                            }
                        }
                    """, dimensions=self.embedding_dim)
                    logger.info("✅ Vector index created/verified successfully")
                except Exception as e:
                    logger.warning(f"Vector index creation: {e}")

                # 3. Fulltext index for hybrid search (keyword matching)
                try:
                    session.run("""
                        CREATE FULLTEXT INDEX chunk_fulltext IF NOT EXISTS
                        FOR (c:Chunk)
                        ON EACH [c.content, c.title]
                    """)
                    logger.info("✅ Fulltext index created/verified successfully")
                except Exception as e:
                    logger.warning(f"Fulltext index creation: {e}")

                logger.info("✅ Neo4j database initialized successfully")

            except Exception as e:
                logger.error(f"Failed to initialize database: {e}", exc_info=True)

    def add_documents(self, documents: List[Dict[str, str]]) -> int:
        """여러 문서를 Neo4j에 추가"""
        success_count = 0
        for document in documents:
            if self.add_document(document):
                success_count += 1
        return success_count

    def add_document(self, document: Dict[str, str]) -> bool:
        """단일 문서를 Neo4j 그래프 + 벡터로 추가 (프로젝트 파티셔닝 + 권한 제어 지원)"""
        try:
            doc_id = document.get("id")
            content = document.get("content", "")
            metadata = document.get("metadata", {}) or {}

            if not doc_id or not content:
                logger.error("Document must have 'id' and 'content'")
                return False

            title = metadata.get("title") or metadata.get("file_name") or doc_id
            category = metadata.get("category", "general")
            file_type = metadata.get("file_type", "unknown")

            # Access control metadata
            project_id = metadata.get("project_id", "default")
            uploaded_by_user_id = metadata.get("uploaded_by_user_id", "system")
            uploaded_by_role = metadata.get("uploaded_by_role", "MEMBER")
            access_level = int(metadata.get("access_level", get_access_level(uploaded_by_role)))

            # 구조 파싱 및 청킹
            logger.info(f"Parsing document {doc_id} with DocumentParser...")
            blocks = self.parser.parse_document(content, metadata)
            chunks = self.chunker.chunk_blocks(blocks)

            logger.info(
                "Document %s parsed into %d blocks and %d chunks",
                doc_id,
                len(blocks),
                len(chunks),
            )

            with self.driver.session() as session:
                # 1. Project 노드 생성/조회
                session.run("""
                    MERGE (p:Project {project_id: $project_id})
                """, project_id=project_id)

                # 2. Document 노드 생성 (권한 정보 포함)
                session.run("""
                    MERGE (d:Document {doc_id: $doc_id})
                    SET d.title = $title,
                        d.content = $content,
                        d.file_type = $file_type,
                        d.file_path = $file_path,
                        d.created_at = $created_at,
                        d.project_id = $project_id,
                        d.uploaded_by_user_id = $uploaded_by_user_id,
                        d.uploaded_by_role = $uploaded_by_role,
                        d.access_level = $access_level
                """, doc_id=doc_id, title=title, content=content[:1000],
                           file_type=file_type,
                           file_path=metadata.get("file_path", ""),
                           created_at=metadata.get("created_at", ""),
                           project_id=project_id,
                           uploaded_by_user_id=uploaded_by_user_id,
                           uploaded_by_role=uploaded_by_role,
                           access_level=access_level)

                # 3. Project -> Document 관계
                session.run("""
                    MATCH (p:Project {project_id: $project_id})
                    MATCH (d:Document {doc_id: $doc_id})
                    MERGE (p)-[:HAS_DOCUMENT]->(d)
                """, project_id=project_id, doc_id=doc_id)

                # 4. Category 노드와 관계 생성
                session.run("""
                    MERGE (cat:Category {name: $category})
                    WITH cat
                    MATCH (d:Document {doc_id: $doc_id})
                    MERGE (d)-[:BELONGS_TO]->(cat)
                """, category=category, doc_id=doc_id)

                # 5. Chunk 노드들 생성 및 관계 설정
                chunk_ids = []
                for i, chunk_data in enumerate(chunks):
                    chunk_id = str(uuid.uuid4())
                    chunk_content = chunk_data["content"]
                    chunk_metadata = chunk_data["metadata"]

                    # 임베딩 생성
                    embedding_text = f"passage: {chunk_content}"
                    embedding = self.embedding_model.encode(embedding_text).tolist()

                    # Chunk 노드 생성 (권한 정보 포함 for faster filtering)
                    session.run("""
                        MERGE (c:Chunk {chunk_id: $chunk_id})
                        SET c.content = $content,
                            c.chunk_index = $chunk_index,
                            c.title = $title,
                            c.doc_id = $doc_id,
                            c.structure_type = $structure_type,
                            c.has_table = $has_table,
                            c.has_list = $has_list,
                            c.section_title = $section_title,
                            c.page_number = $page_number,
                            c.embedding = $embedding,
                            c.project_id = $project_id,
                            c.access_level = $access_level
                    """, chunk_id=chunk_id, content=chunk_content,
                               chunk_index=i, title=title, doc_id=doc_id,
                               structure_type=chunk_metadata.get("structure_type", "paragraph"),
                               has_table=bool(chunk_metadata.get("has_table", False)),
                               has_list=bool(chunk_metadata.get("has_list", False)),
                               section_title=chunk_metadata.get("section_title", ""),
                               page_number=int(chunk_metadata.get("page_number", 0)),
                               embedding=embedding,
                               project_id=project_id,
                               access_level=access_level)

                    # Document -> Chunk 관계 생성
                    session.run("""
                        MATCH (d:Document {doc_id: $doc_id})
                        MATCH (c:Chunk {chunk_id: $chunk_id})
                        MERGE (d)-[:HAS_CHUNK]->(c)
                    """, doc_id=doc_id, chunk_id=chunk_id)

                    chunk_ids.append(chunk_id)

                # 4. 순차 청크 간 NEXT_CHUNK 관계 생성
                if len(chunk_ids) > 1:
                    session.run("""
                        MATCH (d:Document {doc_id: $doc_id})-[:HAS_CHUNK]->(c:Chunk)
                        WITH c ORDER BY c.chunk_index
                        WITH collect(c) AS chunks
                        UNWIND range(0, size(chunks)-2) AS i
                        WITH chunks[i] AS curr, chunks[i+1] AS next
                        MERGE (curr)-[:NEXT_CHUNK]->(next)
                    """, doc_id=doc_id)

            logger.info(f"✅ Added document {doc_id} with {len(chunks)} chunks to Neo4j")
            return True

        except Exception as e:
            logger.error(f"Failed to add document to Neo4j: {e}", exc_info=True)
            return False

    def search(
        self,
        query: str,
        top_k: int = 3,
        filter_metadata: Optional[Dict] = None,
        use_graph_expansion: bool = True
    ) -> List[Dict]:
        """
        Neo4j 기반 GraphRAG 검색

        Args:
            query: 검색 쿼리
            top_k: 반환할 결과 개수
            filter_metadata: 메타데이터 필터 (예: {"category": "보험"})
            use_graph_expansion: 그래프 확장 사용 여부 (순차 컨텍스트)
        """
        tools_mode = os.getenv("TOOLS_RETRIEVER_MODE", "auto").lower()
        if tools_mode in {"graph", "vector"}:
            forced_graph = tools_mode == "graph"
            logger.info("ToolsRetriever forced mode=%s", tools_mode)
            return self._search_impl(
                query=query,
                top_k=top_k,
                filter_metadata=filter_metadata,
                use_graph_expansion=forced_graph,
            )

        if not use_graph_expansion:
            logger.info("ToolsRetriever bypassed (use_graph_expansion=False)")
            return self._search_impl(
                query=query,
                top_k=top_k,
                filter_metadata=filter_metadata,
                use_graph_expansion=False,
            )

        return self.tools_retriever.retrieve(
            query=query,
            top_k=top_k,
            filter_metadata=filter_metadata,
        )

    def _search_impl(
        self,
        query: str,
        top_k: int = 3,
        filter_metadata: Optional[Dict] = None,
        use_graph_expansion: bool = True,
    ) -> List[Dict]:
        try:
            # Hybrid search weights (configurable via environment)
            # Keyword-first approach: prioritize exact matches over semantic similarity
            vector_weight = float(os.getenv("HYBRID_VECTOR_WEIGHT", "0.4"))
            keyword_weight = float(os.getenv("HYBRID_KEYWORD_WEIGHT", "0.6"))
            use_hybrid = os.getenv("HYBRID_SEARCH_ENABLED", "true").lower() == "true"

            # 쿼리 임베딩 생성
            query_with_prefix = f"query: {query}"
            logger.info(f"🔍 _search_impl called: query='{query}', top_k={top_k}, use_graph_expansion={use_graph_expansion}")
            logger.info(f"  - Hybrid search: enabled={use_hybrid}, vector_weight={vector_weight}, keyword_weight={keyword_weight}")
            query_embedding = self.embedding_model.encode(query_with_prefix).tolist()
            logger.info(f"  - Generated embedding vector of length: {len(query_embedding)}")

            # Extract access control filters
            project_id = filter_metadata.get("project_id") if filter_metadata else None
            user_access_level = int(filter_metadata.get("user_access_level", 6)) if filter_metadata else 6
            logger.info(f"  - Access control: project_id={project_id}, user_access_level={user_access_level}")

            with self.driver.session() as session:
                if use_graph_expansion:
                    # GraphRAG: 벡터 검색 + 순차 컨텍스트 확장 + 권한 필터
                    cypher_query = """
                        CALL db.index.vector.queryNodes('chunk_embeddings', $top_k_fetch, $embedding)
                        YIELD node AS c, score

                        // Access control filter: project + role level + global 'default' docs
                        WHERE ($project_id IS NULL OR c.project_id = $project_id OR c.project_id = 'default')
                          AND c.access_level <= $user_access_level

                        // 순차 컨텍스트 확장
                        OPTIONAL MATCH (prev:Chunk)-[:NEXT_CHUNK]->(c)
                        OPTIONAL MATCH (c)-[:NEXT_CHUNK]->(next:Chunk)

                        // 문서 및 카테고리 정보
                        MATCH (d:Document)-[:HAS_CHUNK]->(c)
                        WHERE d.access_level <= $user_access_level
                        OPTIONAL MATCH (d)-[:BELONGS_TO]->(cat:Category)

                        // 같은 카테고리의 다른 최신 문서 (권한 필터 적용)
                        OPTIONAL MATCH (cat)<-[:BELONGS_TO]-(related:Document)
                        WHERE related <> d
                          AND related.access_level <= $user_access_level
                          AND ($project_id IS NULL OR related.project_id = $project_id OR related.project_id = 'default')

                        RETURN
                            c.chunk_id AS chunk_id,
                            c.content AS content,
                            c.title AS title,
                            c.chunk_index AS chunk_index,
                            c.structure_type AS structure_type,
                            c.has_table AS has_table,
                            c.has_list AS has_list,
                            c.project_id AS chunk_project_id,
                            c.access_level AS chunk_access_level,
                            score,
                            prev.content AS prev_context,
                            next.content AS next_context,
                            d.doc_id AS doc_id,
                            d.title AS doc_title,
                            d.file_path AS file_path,
                            d.project_id AS doc_project_id,
                            d.access_level AS doc_access_level,
                            cat.name AS category,
                            collect(DISTINCT {
                                doc_id: related.doc_id,
                                title: related.title,
                                created_at: related.created_at
                            })[0..3] AS related_docs
                        ORDER BY score DESC
                        LIMIT $top_k
                    """
                else:
                    # 단순 벡터 검색 + 권한 필터
                    cypher_query = """
                        CALL db.index.vector.queryNodes('chunk_embeddings', $top_k_fetch, $embedding)
                        YIELD node AS c, score

                        // Access control filter + global 'default' docs
                        WHERE ($project_id IS NULL OR c.project_id = $project_id OR c.project_id = 'default')
                          AND c.access_level <= $user_access_level

                        MATCH (d:Document)-[:HAS_CHUNK]->(c)
                        WHERE d.access_level <= $user_access_level
                        OPTIONAL MATCH (d)-[:BELONGS_TO]->(cat:Category)

                        RETURN
                            c.chunk_id AS chunk_id,
                            c.content AS content,
                            c.title AS title,
                            c.structure_type AS structure_type,
                            c.project_id AS chunk_project_id,
                            c.access_level AS chunk_access_level,
                            score,
                            d.doc_id AS doc_id,
                            d.title AS doc_title,
                            d.project_id AS doc_project_id,
                            d.access_level AS doc_access_level,
                            cat.name AS category
                        ORDER BY score DESC
                        LIMIT $top_k
                    """

                logger.info(f"  - Executing {'graph expansion' if use_graph_expansion else 'simple vector'} search with top_k_fetch={top_k * 3}")
                result = session.run(
                    cypher_query,
                    embedding=query_embedding,
                    top_k=top_k,
                    top_k_fetch=top_k * 3,  # Fetch more to account for filtered results
                    project_id=project_id,
                    user_access_level=user_access_level
                )

                # 결과 포맷팅
                results = []
                record_count = 0
                for record in result:
                    record_count += 1
                    item = {
                        "chunk_id": record.get("chunk_id"),
                        "content": record.get("content"),
                        "metadata": {
                            "title": record.get("title"),
                            "doc_id": record.get("doc_id"),
                            "doc_title": record.get("doc_title"),
                            "chunk_index": record.get("chunk_index"),
                            "structure_type": record.get("structure_type"),
                            "has_table": record.get("has_table"),
                            "has_list": record.get("has_list"),
                            "category": record.get("category"),
                            "file_path": record.get("file_path"),
                            "project_id": record.get("doc_project_id") or record.get("chunk_project_id"),
                            "access_level": record.get("doc_access_level") or record.get("chunk_access_level"),
                        },
                        "distance": 1 - record.get("score", 0),  # 유사도 -> 거리 변환
                        "relevance_score": record.get("score", 0),
                    }

                    # 순차 컨텍스트 추가
                    if use_graph_expansion:
                        prev_context = record.get("prev_context")
                        next_context = record.get("next_context")
                        related_docs = record.get("related_docs", [])

                        if prev_context or next_context or related_docs:
                            item["context"] = {}
                            if prev_context:
                                item["context"]["prev"] = prev_context
                            if next_context:
                                item["context"]["next"] = next_context
                            if related_docs:
                                item["context"]["related_docs"] = [
                                    doc for doc in related_docs if doc.get("doc_id")
                                ]

                    results.append(item)

                logger.info(f"  - Vector search returned {record_count} results")

                # Hybrid search: Add keyword search results
                if use_hybrid and query.strip():
                    keyword_results = self._keyword_search(
                        session, query, top_k * 2, project_id, user_access_level
                    )
                    logger.info(f"  - Keyword search returned {len(keyword_results)} results")

                    # Select merge method: "rrf" (default), "weighted", or "rrf_rerank"
                    merge_method = os.getenv("HYBRID_MERGE_METHOD", "rrf").lower()
                    logger.info(f"  - Merge method: {merge_method}")

                    if merge_method == "rrf":
                        # RRF (Reciprocal Rank Fusion) - rank-based merging
                        results = self._merge_hybrid_rrf(
                            results, keyword_results, top_k
                        )
                    elif merge_method == "rrf_rerank":
                        # RRF + Cross-encoder reranking
                        results = self._merge_hybrid_rrf(
                            results, keyword_results, top_k * 3  # Get more candidates for reranking
                        )
                        results = self._rerank_results(query, results, top_k)
                    else:
                        # Default: Weighted scoring
                        results = self._merge_hybrid_results(
                            results, keyword_results, vector_weight, keyword_weight, top_k
                        )
                    logger.info(f"  - Hybrid merge produced {len(results)} results")

                # 카테고리 필터 적용 (메타데이터 필터) - 권한 필터는 이미 Cypher에서 적용됨
                if filter_metadata and "category" in filter_metadata:
                    filter_category = filter_metadata["category"]
                    results = [r for r in results if r["metadata"].get("category") == filter_category]

                logger.info(f"  - Access control filtered: project_id={project_id}, user_level={user_access_level}")

                # top_k 개만 반환
                results = results[:top_k]

                logger.info(f"✅ Found {len(results)} results for query: {query[:50]}...")
                if len(results) > 0:
                    logger.info(f"  - Top result score: {results[0].get('relevance_score', 0):.4f}")
                    logger.info(f"  - Top result preview: {results[0].get('content', '')[:100]}...")
                else:
                    logger.warning("  ⚠️ No results found! Checking if vector index exists...")

                return results

        except Exception as e:
            logger.error(f"Search failed: {e}", exc_info=True)
            return []

    def _keyword_search(
        self,
        session,
        query: str,
        top_k: int,
        project_id: Optional[str],
        user_access_level: int
    ) -> List[Dict]:
        """Perform keyword-based fulltext search with title boost and definition detection."""
        try:
            import re

            # Extract core keywords (remove question markers like ~란, ~이란, ~무엇 etc.)
            core_query = re.sub(r'(이?란|란\?|무엇|뭐|어떻게|왜|에 대해|에대해|설명|알려줘|해줘)\s*$', '', query).strip()
            is_definition_query = bool(re.search(r'(이?란|무엇|뭐야|뭔가요)\s*$', query))

            # Use core_query for Lucene search (better results without question markers)
            search_query = core_query or query
            escaped_query = self._escape_lucene_query(search_query)

            logger.info(f"  - Keyword search: search_query='{search_query}', core_query='{core_query}', is_definition={is_definition_query}")

            keyword_query = """
                CALL db.index.fulltext.queryNodes('chunk_fulltext', $query)
                YIELD node AS c, score

                WHERE ($project_id IS NULL OR c.project_id = $project_id OR c.project_id = 'default')
                  AND c.access_level <= $user_access_level

                MATCH (d:Document)-[:HAS_CHUNK]->(c)
                WHERE d.access_level <= $user_access_level
                OPTIONAL MATCH (d)-[:BELONGS_TO]->(cat:Category)

                RETURN
                    c.chunk_id AS chunk_id,
                    c.content AS content,
                    c.title AS title,
                    c.structure_type AS structure_type,
                    c.project_id AS chunk_project_id,
                    c.access_level AS chunk_access_level,
                    score,
                    d.doc_id AS doc_id,
                    d.title AS doc_title,
                    d.project_id AS doc_project_id,
                    d.access_level AS doc_access_level,
                    cat.name AS category
                ORDER BY score DESC
                LIMIT $top_k
            """

            result = session.run(
                keyword_query,
                parameters={
                    "query": escaped_query,
                    "top_k": top_k,
                    "project_id": project_id,
                    "user_access_level": user_access_level
                }
            )

            # Collect all results first to find max score for normalization
            raw_results = list(result)
            max_raw_score = max((r.get("score", 0) for r in raw_results), default=1.0)
            if max_raw_score == 0:
                max_raw_score = 1.0

            keyword_results = []
            for record in raw_results:
                raw_score = record.get("score", 0)
                content = record.get("content") or ""
                title = record.get("title") or ""

                # Normalize using max score in result set (relative ranking)
                normalized_score = raw_score / max_raw_score

                # Title boost: if core query keywords appear in title
                title_boost = 0.0
                if core_query and core_query.lower() in title.lower():
                    title_boost = 0.3
                    logger.debug(f"  - Title boost applied for: {title[:50]}")

                # Definition boost: if this looks like a definition (contains the term followed by explanation patterns)
                definition_boost = 0.0
                if is_definition_query and core_query:
                    # Check if content contains definition patterns like "X라 불리는", "X는 ~이다", "X(영문)라"
                    definition_patterns = [
                        rf'{re.escape(core_query)}[은는이가]\s',  # X는, X은, X이, X가
                        rf'{re.escape(core_query)}\s*\([^)]+\)\s*(라|란)',  # X(english)라
                        rf'{re.escape(core_query)}.*방법',  # X 방법
                    ]
                    for pattern in definition_patterns:
                        if re.search(pattern, content, re.IGNORECASE):
                            definition_boost = 0.4
                            logger.debug("  - Definition boost applied for pattern match")
                            break

                # Apply boosts
                boosted_score = min(normalized_score + title_boost + definition_boost, 1.0)

                item = {
                    "chunk_id": record.get("chunk_id"),
                    "content": content,
                    "metadata": {
                        "title": title,
                        "doc_id": record.get("doc_id"),
                        "doc_title": record.get("doc_title"),
                        "structure_type": record.get("structure_type"),
                        "category": record.get("category"),
                        "project_id": record.get("doc_project_id") or record.get("chunk_project_id"),
                        "access_level": record.get("doc_access_level") or record.get("chunk_access_level"),
                    },
                    "keyword_score": boosted_score,
                    "raw_keyword_score": raw_score,
                    "title_boost": title_boost,
                    "definition_boost": definition_boost,
                }
                keyword_results.append(item)

            # Re-sort by boosted keyword_score (boosts may change ranking)
            keyword_results.sort(key=lambda x: x.get("keyword_score", 0), reverse=True)

            # Log top keyword results with boost details
            for i, item in enumerate(keyword_results[:3]):
                logger.info(
                    f"  - Keyword rank {i+1}: raw={item.get('raw_keyword_score', 0):.2f}, "
                    f"title_boost={item.get('title_boost', 0):.1f}, "
                    f"def_boost={item.get('definition_boost', 0):.1f}, "
                    f"final={item.get('keyword_score', 0):.3f}"
                )

            return keyword_results

        except Exception as e:
            logger.warning(f"Keyword search failed (will use vector-only): {e}")
            return []

    def _escape_lucene_query(self, query: str) -> str:
        """Escape special Lucene query characters."""
        special_chars = ['+', '-', '&&', '||', '!', '(', ')', '{', '}', '[', ']', '^', '"', '~', '*', '?', ':', '\\', '/']
        escaped = query
        for char in special_chars:
            escaped = escaped.replace(char, f'\\{char}')
        return escaped

    def _merge_hybrid_results(
        self,
        vector_results: List[Dict],
        keyword_results: List[Dict],
        vector_weight: float,
        keyword_weight: float,
        top_k: int
    ) -> List[Dict]:
        """Merge vector and keyword search results with weighted scoring."""
        # Create lookup by chunk_id
        merged = {}

        # Add vector results
        for item in vector_results:
            chunk_id = item.get("chunk_id")
            if chunk_id:
                merged[chunk_id] = {
                    **item,
                    "vector_score": item.get("relevance_score", 0),
                    "keyword_score": 0,
                    "search_type": "vector"
                }

        # Merge keyword results
        for item in keyword_results:
            chunk_id = item.get("chunk_id")
            if chunk_id:
                if chunk_id in merged:
                    # Found in both - combine scores
                    merged[chunk_id]["keyword_score"] = item.get("keyword_score", 0)
                    merged[chunk_id]["search_type"] = "hybrid"
                else:
                    # Only in keyword results
                    merged[chunk_id] = {
                        **item,
                        "vector_score": 0,
                        "keyword_score": item.get("keyword_score", 0),
                        "relevance_score": 0,
                        "distance": 1.0,
                        "search_type": "keyword"
                    }

        # Calculate combined scores
        for chunk_id, item in merged.items():
            vector_score = item.get("vector_score", 0)
            keyword_score = item.get("keyword_score", 0)

            # Weighted combination
            combined_score = (vector_score * vector_weight) + (keyword_score * keyword_weight)

            # Boost if found in both searches
            if item.get("search_type") == "hybrid":
                combined_score *= 1.1  # 10% boost for appearing in both

            item["relevance_score"] = min(combined_score, 1.0)
            item["distance"] = 1 - item["relevance_score"]

        # Sort by combined score and return top_k
        sorted_results = sorted(merged.values(), key=lambda x: x.get("relevance_score", 0), reverse=True)

        # Log hybrid search details
        for i, item in enumerate(sorted_results[:3]):
            logger.info(
                f"  - Rank {i+1}: {item.get('search_type')} "
                f"(v={item.get('vector_score', 0):.3f}, k={item.get('keyword_score', 0):.3f}, "
                f"combined={item.get('relevance_score', 0):.3f})"
            )

        return sorted_results[:top_k]

    def _merge_hybrid_rrf(
        self,
        vector_results: List[Dict],
        keyword_results: List[Dict],
        top_k: int,
        k: int = 60
    ) -> List[Dict]:
        """
        Merge using Reciprocal Rank Fusion (RRF).

        RRF score = Σ 1/(k + rank) for each ranking list

        Unlike weighted scoring, RRF is rank-based and doesn't depend on
        absolute score values, making it more robust to score scale differences.

        Args:
            vector_results: Results from vector search (ordered by similarity)
            keyword_results: Results from keyword search (ordered by BM25/Lucene score)
            top_k: Number of results to return
            k: RRF constant (default 60, as per original paper)

        Returns:
            Merged results sorted by RRF score
        """
        rrf_scores = {}  # chunk_id -> {"rrf_score": float, "data": dict, "ranks": dict}

        # Calculate RRF contribution from vector results
        for rank, item in enumerate(vector_results, start=1):
            chunk_id = item.get("chunk_id")
            if chunk_id:
                rrf_score = 1.0 / (k + rank)
                rrf_scores[chunk_id] = {
                    "rrf_score": rrf_score,
                    "data": item,
                    "ranks": {"vector": rank, "keyword": None},
                    "search_type": "vector"
                }

        # Calculate RRF contribution from keyword results
        for rank, item in enumerate(keyword_results, start=1):
            chunk_id = item.get("chunk_id")
            if chunk_id:
                rrf_contribution = 1.0 / (k + rank)

                if chunk_id in rrf_scores:
                    # Found in both - add RRF scores
                    rrf_scores[chunk_id]["rrf_score"] += rrf_contribution
                    rrf_scores[chunk_id]["ranks"]["keyword"] = rank
                    rrf_scores[chunk_id]["search_type"] = "hybrid"
                    # Prefer keyword data if it has higher keyword_score
                    if item.get("keyword_score", 0) > rrf_scores[chunk_id]["data"].get("keyword_score", 0):
                        rrf_scores[chunk_id]["data"]["keyword_score"] = item.get("keyword_score", 0)
                else:
                    # Only in keyword results
                    rrf_scores[chunk_id] = {
                        "rrf_score": rrf_contribution,
                        "data": {**item, "vector_score": 0, "distance": 1.0},
                        "ranks": {"vector": None, "keyword": rank},
                        "search_type": "keyword"
                    }

        # Build final results with RRF score as relevance_score
        results = []
        for chunk_id, info in rrf_scores.items():
            result = info["data"].copy()
            result["relevance_score"] = info["rrf_score"]
            result["rrf_score"] = info["rrf_score"]
            result["search_type"] = info["search_type"]
            result["rrf_ranks"] = info["ranks"]
            # Normalize distance for compatibility (invert RRF to distance-like metric)
            # RRF max is ~0.033 (1/61 + 1/61), so we scale it
            result["distance"] = max(0, 1 - (info["rrf_score"] * 30))  # Scale for visibility
            results.append(result)

        # Sort by RRF score (descending)
        results.sort(key=lambda x: x.get("rrf_score", 0), reverse=True)

        # Log RRF merge details
        logger.info(f"  - RRF merge: {len(vector_results)} vector + {len(keyword_results)} keyword = {len(results)} unique")
        for i, item in enumerate(results[:5]):
            ranks = item.get("rrf_ranks", {})
            logger.info(
                f"    Rank {i+1}: {item.get('search_type')} "
                f"(v_rank={ranks.get('vector', '-')}, k_rank={ranks.get('keyword', '-')}, "
                f"rrf={item.get('rrf_score', 0):.4f})"
            )

        return results[:top_k]

    def _rerank_results(
        self,
        query: str,
        results: List[Dict],
        top_k: int,
        model_name: str = None
    ) -> List[Dict]:
        """
        Rerank results using a Cross-Encoder model.

        Cross-encoders jointly encode query and document together,
        providing more accurate relevance scores than bi-encoders
        at the cost of higher latency.

        Args:
            query: Original search query
            results: Candidate results to rerank
            top_k: Number of top results to return
            model_name: Cross-encoder model name (default from env)

        Returns:
            Reranked results sorted by cross-encoder score
        """
        if not results:
            return results

        # Get model name from env if not specified
        if model_name is None:
            model_name = os.getenv(
                "RERANKER_MODEL",
                "cross-encoder/ms-marco-MiniLM-L-6-v2"  # Fast, good quality
            )

        try:
            from sentence_transformers import CrossEncoder

            # Lazy load the cross-encoder model
            if not hasattr(self, "_cross_encoder") or self._cross_encoder_name != model_name:
                logger.info(f"Loading cross-encoder model: {model_name}")
                self._cross_encoder = CrossEncoder(model_name, max_length=512)
                self._cross_encoder_name = model_name

            # Prepare query-document pairs for scoring
            pairs = []
            for result in results:
                content = result.get("content", "")
                title = result.get("title", "")
                # Combine title and content for better context
                doc_text = f"{title}\n{content}" if title else content
                pairs.append([query, doc_text])

            # Get cross-encoder scores
            logger.info(f"  - Reranking {len(pairs)} candidates with {model_name}")
            scores = self._cross_encoder.predict(pairs, show_progress_bar=False)

            # Add cross-encoder scores to results
            for i, result in enumerate(results):
                result["cross_encoder_score"] = float(scores[i])
                result["original_rank"] = i + 1

            # Sort by cross-encoder score (descending)
            results.sort(key=lambda x: x.get("cross_encoder_score", 0), reverse=True)

            # Update relevance_score with cross-encoder score (normalized to 0-1)
            # Cross-encoder scores are typically logits, so we apply sigmoid
            import math
            for result in results:
                ce_score = result.get("cross_encoder_score", 0)
                # Sigmoid normalization
                normalized = 1 / (1 + math.exp(-ce_score))
                result["relevance_score"] = normalized
                result["distance"] = 1 - normalized

            # Log reranking details
            logger.info(f"  - Reranking complete, top results:")
            for i, item in enumerate(results[:5]):
                logger.info(
                    f"    Rank {i+1} (was {item.get('original_rank', '?')}): "
                    f"ce_score={item.get('cross_encoder_score', 0):.3f}, "
                    f"relevance={item.get('relevance_score', 0):.3f}"
                )

            return results[:top_k]

        except ImportError:
            logger.warning("sentence-transformers not available for reranking, skipping")
            return results[:top_k]
        except Exception as e:
            logger.error(f"Reranking failed: {e}", exc_info=True)
            return results[:top_k]

    def delete_document(self, doc_id: str) -> bool:
        """문서 삭제 (Document 및 연결된 Chunk들 삭제)"""
        try:
            with self.driver.session() as session:
                result = session.run("""
                    MATCH (d:Document {doc_id: $doc_id})
                    OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
                    DETACH DELETE d, c
                    RETURN count(d) AS deleted_count
                """, doc_id=doc_id)

                record = result.single()
                deleted_count = record["deleted_count"] if record else 0

                if deleted_count > 0:
                    logger.info(f"✅ Deleted document {doc_id}")
                    return True
                else:
                    logger.warning(f"Document {doc_id} not found")
                    return False

        except Exception as e:
            logger.error(f"Failed to delete document {doc_id}: {e}", exc_info=True)
            return False

    def get_collection_stats(self) -> Dict:
        """Neo4j 상태 정보 반환 (프로젝트별 통계 포함)"""
        try:
            with self.driver.session() as session:
                # 문서 및 청크 수 조회
                result = session.run("""
                    MATCH (d:Document)
                    OPTIONAL MATCH (d)-[:HAS_CHUNK]->(c:Chunk)
                    RETURN count(DISTINCT d) AS doc_count, count(c) AS chunk_count
                """)
                record = result.single()

                # 카테고리별 통계
                category_stats = session.run("""
                    MATCH (d:Document)-[:BELONGS_TO]->(cat:Category)
                    RETURN cat.name AS category, count(d) AS doc_count
                    ORDER BY doc_count DESC
                """).data()

                # 프로젝트별 통계
                project_stats = session.run("""
                    MATCH (p:Project)-[:HAS_DOCUMENT]->(d:Document)
                    RETURN p.project_id AS project_id, count(d) AS doc_count
                    ORDER BY doc_count DESC
                """).data()

                # 권한 레벨별 통계
                access_level_stats = session.run("""
                    MATCH (d:Document)
                    RETURN d.access_level AS access_level, count(d) AS doc_count
                    ORDER BY access_level DESC
                """).data()

                return {
                    "vector_db": "neo4j",
                    "graph_db": "neo4j",
                    "status": "available",
                    "total_documents": record["doc_count"] if record else 0,
                    "total_chunks": record["chunk_count"] if record else 0,
                    "vector_size": self.embedding_dim,
                    "categories": category_stats,
                    "projects": project_stats,
                    "access_levels": access_level_stats,
                    "graph_rag_enabled": True,
                    "access_control_enabled": True,
                }

        except Exception as e:
            logger.error(f"Failed to get stats: {e}", exc_info=True)
            return {
                "vector_db": "neo4j",
                "status": "error",
                "error": str(e),
            }

    def close(self):
        """Neo4j 드라이버 종료"""
        if self.driver:
            self.driver.close()
            logger.info("Neo4j driver closed")
