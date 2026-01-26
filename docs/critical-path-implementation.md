# Critical Path Method (CPM) Implementation Plan

## Overview

WBS Gantt Chart에서 크리티컬 패스(Critical Path)를 계산하고 시각화하는 기능 구현 계획서.

## 1. Architecture

```
┌─────────────────────┐
│     Frontend        │
│  (WbsGanttChart)    │
│  - 크리티컬 패스 표시│
│  - Float/Slack 표시 │
└─────────┬───────────┘
          │ GET /api/projects/{id}/wbs/critical-path
          ▼
┌─────────────────────┐
│     Backend         │
│  (Spring Boot)      │
│  - API Endpoint     │
│  - 캐싱 (Redis)     │
└─────────┬───────────┘
          │ HTTP Request
          ▼
┌─────────────────────┐
│    llm-service      │
│  (Python/Flask)     │
│  - CPM Algorithm    │
│  - Graph Analysis   │
└─────────────────────┘
```

## 2. CPM Algorithm

### 2.1 Forward Pass (ES, EF 계산)
```
ES (Early Start) = max(EF of all predecessors)
EF (Early Finish) = ES + Duration
```

### 2.2 Backward Pass (LS, LF 계산)
```
LF (Late Finish) = min(LS of all successors)
LS (Late Start) = LF - Duration
```

### 2.3 Float/Slack 계산
```
Total Float = LS - ES = LF - EF
Free Float = min(ES of successors) - EF
```

### 2.4 Critical Path
```
Critical Path = Float가 0인 모든 작업들의 경로
```

## 3. Implementation Tasks

### 3.1 Phase 1: llm-service CPM Algorithm

**File**: `llm-service/skills/critical_path_skill.py`

```python
class CriticalPathSkill(BaseSkill):
    """Calculate Critical Path for WBS items."""

    def execute(self, input: SkillInput) -> SkillOutput:
        items = input.data.get("items", [])
        dependencies = input.data.get("dependencies", [])

        # Build graph
        graph = self._build_graph(items, dependencies)

        # Forward pass
        self._forward_pass(graph)

        # Backward pass
        self._backward_pass(graph)

        # Calculate floats and find critical path
        critical_path = self._find_critical_path(graph)

        return SkillOutput(
            result={
                "critical_path": critical_path,
                "items_with_float": self._get_items_with_float(graph),
                "project_duration": self._get_project_duration(graph),
            },
            confidence=0.95,
        )
```

**Response Format**:
```json
{
  "critical_path": ["item-001", "item-003", "item-007"],
  "items_with_float": {
    "item-001": { "es": 0, "ef": 5, "ls": 0, "lf": 5, "total_float": 0, "free_float": 0 },
    "item-002": { "es": 0, "ef": 3, "ls": 2, "lf": 5, "total_float": 2, "free_float": 2 }
  },
  "project_duration": 45
}
```

### 3.2 Phase 2: Backend API

**File**: `WbsCriticalPathController.java`

```java
@RestController
@RequestMapping("/api/projects/{projectId}/wbs")
public class WbsCriticalPathController {

    @GetMapping("/critical-path")
    public ResponseEntity<CriticalPathResponse> getCriticalPath(
        @PathVariable String projectId
    ) {
        // 1. Get WBS items and dependencies from DB
        // 2. Call llm-service for CPM calculation
        // 3. Cache result in Redis (TTL: 5 min)
        // 4. Return response
    }
}
```

**Caching Strategy**:
- Key: `critical-path:{projectId}`
- TTL: 5 minutes
- Invalidate on: WBS item update, dependency change

### 3.3 Phase 3: Frontend Visualization

**File**: `WbsGanttChart.tsx`

#### 3.3.1 New State
```typescript
interface CriticalPathData {
  criticalPath: string[];
  itemsWithFloat: Record<string, {
    es: number;
    ef: number;
    ls: number;
    lf: number;
    totalFloat: number;
    freeFloat: number;
  }>;
  projectDuration: number;
}

const [criticalPathData, setCriticalPathData] = useState<CriticalPathData | null>(null);
const [showCriticalPath, setShowCriticalPath] = useState(false);
```

#### 3.3.2 Visual Indicators

| Element | Normal | Critical Path |
|---------|--------|---------------|
| Bar Color | Gradient (type-based) | Red gradient |
| Border | None | 2px solid red |
| Dependency Line | Gray dashed | Red solid, thicker |
| Float Display | Hidden | Show slack bar |

#### 3.3.3 UI Components

```tsx
// Critical path toggle in toolbar
<label className="flex items-center gap-2">
  <input
    type="checkbox"
    checked={showCriticalPath}
    onChange={(e) => setShowCriticalPath(e.target.checked)}
  />
  <span className="text-sm text-gray-600">크리티컬 패스</span>
</label>

// Critical path bar styling
const getBarColor = (item: GanttItem): string => {
  if (showCriticalPath && criticalPathData?.criticalPath.includes(item.id)) {
    return 'bg-gradient-to-r from-red-600 to-red-400 ring-2 ring-red-500';
  }
  // ... existing logic
};

// Float indicator
{showCriticalPath && floatData && floatData.totalFloat > 0 && (
  <div
    className="absolute bg-gray-200 opacity-50"
    style={{
      left: barStyle.left + barStyle.width,
      width: floatData.totalFloat * cellWidth,
    }}
  />
)}
```

### 3.4 Phase 4: Legend & Info Panel

```tsx
// Add to legend
{showCriticalPath && (
  <>
    <div className="flex items-center gap-2">
      <div className="w-3 h-3 rounded bg-red-500 ring-2 ring-red-300" />
      <span className="text-xs text-gray-600">크리티컬 패스</span>
    </div>
    <div className="flex items-center gap-2">
      <div className="w-6 h-3 bg-gray-200" />
      <span className="text-xs text-gray-600">여유 시간 (Float)</span>
    </div>
  </>
)}

// Info panel on hover
<Tooltip>
  <div className="text-xs">
    <p>ES: {floatData.es}일 | EF: {floatData.ef}일</p>
    <p>LS: {floatData.ls}일 | LF: {floatData.lf}일</p>
    <p>Total Float: {floatData.totalFloat}일</p>
  </div>
</Tooltip>
```

## 4. API Specification

### 4.1 Get Critical Path

```
GET /api/projects/{projectId}/wbs/critical-path
```

**Response**:
```json
{
  "success": true,
  "data": {
    "criticalPath": ["wbs-item-001", "wbs-item-003", "wbs-item-007"],
    "projectDuration": 45,
    "itemsWithFloat": {
      "wbs-item-001": {
        "earlyStart": 0,
        "earlyFinish": 5,
        "lateStart": 0,
        "lateFinish": 5,
        "totalFloat": 0,
        "freeFloat": 0,
        "isCritical": true
      }
    },
    "calculatedAt": "2026-01-27T10:30:00Z"
  }
}
```

## 5. Database Changes

No schema changes required. Uses existing:
- `project.wbs_items`
- `project.wbs_tasks`
- `project.wbs_dependencies`

## 6. Performance Considerations

### 6.1 Caching
- Redis cache with 5-minute TTL
- Invalidation triggers:
  - WBS item create/update/delete
  - Dependency create/delete
  - Date changes

### 6.2 Calculation Optimization
- Only recalculate when dependencies change
- Use topological sort for efficient traversal
- Limit to visible items in large projects

## 7. Testing Plan

### 7.1 Unit Tests
- CPM algorithm correctness
- Edge cases (cycles, orphans, parallel paths)
- Float calculation accuracy

### 7.2 Integration Tests
- API endpoint response format
- Cache invalidation
- Frontend data binding

### 7.3 Visual Tests
- Critical path highlighting
- Float bar display
- Dependency line coloring

## 8. Timeline

| Phase | Task | Effort |
|-------|------|--------|
| 1 | llm-service CPM algorithm | Medium |
| 2 | Backend API + caching | Small |
| 3 | Frontend visualization | Medium |
| 4 | Testing & polish | Small |

## 9. Future Enhancements

- [ ] Multiple critical paths detection
- [ ] What-if analysis (delay simulation)
- [ ] Resource-constrained critical path
- [ ] PERT estimation (optimistic/pessimistic)
- [ ] Monte Carlo simulation for duration
