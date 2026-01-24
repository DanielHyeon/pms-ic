#!/bin/bash

# Chatbot Diagnostic Script

echo "=========================================="
echo "Chatbot Diagnostic Script"
echo "=========================================="

# LLM Service Health Check
echo ""
echo "1. LLM Service Health Check..."
LLM_HEALTH=$(curl -s -w "\n%{http_code}" http://localhost:8000/health 2>/dev/null)
LLM_HTTP_CODE=$(echo "$LLM_HEALTH" | tail -n1)
LLM_BODY=$(echo "$LLM_HEALTH" | sed '$d')

if [ "$LLM_HTTP_CODE" = "200" ]; then
    echo "✅ LLM Service: Running (port 8000)"
    echo "   Response: $LLM_BODY"
else
    echo "❌ LLM Service: Error (HTTP $LLM_HTTP_CODE)"
    echo "   Check if LLM service is running:"
    echo "   docker-compose ps llm-service"
    echo "   docker-compose logs llm-service | tail -50"
fi

# Backend Health Check
echo ""
echo "2. Backend Health Check..."
BACKEND_HEALTH=$(curl -s -w "\n%{http_code}" http://localhost:8083/actuator/health 2>/dev/null)
BACKEND_HTTP_CODE=$(echo "$BACKEND_HEALTH" | tail -n1)

if [ "$BACKEND_HTTP_CODE" = "200" ]; then
    echo "✅ Backend: Running (port 8083)"
else
    echo "❌ Backend: Error (HTTP $BACKEND_HTTP_CODE)"
    echo "   Check if backend is running:"
    echo "   docker-compose ps backend"
    echo "   docker-compose logs backend | tail -50"
fi

# Neo4j Health Check
echo ""
echo "3. Neo4j Health Check..."
NEO4J_HEALTH=$(curl -s -w "\n%{http_code}" http://localhost:7474 2>/dev/null)
NEO4J_HTTP_CODE=$(echo "$NEO4J_HEALTH" | tail -n1)

if [ "$NEO4J_HTTP_CODE" = "200" ]; then
    echo "✅ Neo4j: Running (port 7474/7687)"
else
    echo "❌ Neo4j: Error (HTTP $NEO4J_HTTP_CODE)"
    echo "   Check if Neo4j is running:"
    echo "   docker-compose ps neo4j"
    echo "   docker-compose logs neo4j | tail -50"
fi

# LLM Service Chat API Test
echo ""
echo "4. LLM Chat API Test..."
LLM_TEST=$(curl -s -w "\n%{http_code}" -X POST http://localhost:8000/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello","context":[],"retrieved_docs":[]}' 2>/dev/null)
LLM_TEST_CODE=$(echo "$LLM_TEST" | tail -n1)
LLM_TEST_BODY=$(echo "$LLM_TEST" | sed '$d')

if [ "$LLM_TEST_CODE" = "200" ]; then
    echo "✅ LLM Chat API: Working"
    echo "   Response: $(echo "$LLM_TEST_BODY" | head -c 100)..."
else
    echo "❌ LLM Chat API: Error (HTTP $LLM_TEST_CODE)"
    echo "   Response: $LLM_TEST_BODY"
fi

# Docker Container Status
echo ""
echo "5. Docker Container Status..."
echo "----------------------------------------"
docker-compose ps | grep -E "llm-service|backend|neo4j" || echo "Containers not found."

# Recent Logs
echo ""
echo "6. Recent Backend Logs (chat related)..."
echo "----------------------------------------"
docker-compose logs backend 2>/dev/null | grep -i "chat\|llm\|ai" | tail -10 || echo "No logs found."

echo ""
echo "=========================================="
echo "Diagnostic Complete"
echo "=========================================="
echo ""
echo "Troubleshooting:"
echo "1. Restart LLM service: docker-compose restart llm-service"
echo "2. Restart Backend: docker-compose restart backend"
echo "3. Restart Neo4j: docker-compose restart neo4j"
echo "4. Restart all: docker-compose restart"
echo ""
echo "View logs:"
echo "  docker-compose logs -f llm-service"
echo "  docker-compose logs -f backend"
echo ""
