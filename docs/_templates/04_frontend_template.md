# [Component/Feature] Frontend Documentation

> **Status**: Draft | Review | Final
> **Last Updated**: YYYY-MM-DD
> **Author**: [Name]

<!-- affects: api, backend -->
<!-- requires-update: 02_api/ -->

---

## Questions This Document Answers

- Why does the UI look and behave this way?
- How does state flow through this feature?
- How does it connect to APIs?
- What happens when things go wrong?

---

## 1. Feature Overview

### Purpose

<!-- What user problem does this UI solve? -->

### User Flow

```
[User action] -> [Component] -> [API call] -> [Result display]
```

---

## 2. Component Architecture

### Component Tree

```
FeatureContainer
├── HeaderSection
│   └── ActionButtons
├── ContentArea
│   ├── FilterPanel
│   └── DataList
│       └── ListItem
└── FooterActions
```

### Component Responsibilities

| Component | Responsibility | Does NOT Do |
|-----------|---------------|-------------|
| Container | State management, API calls | UI rendering details |
| ContentArea | Layout, child coordination | Business logic |
| DataList | List rendering, virtualization | Data fetching |

---

## 3. State Management

### State Structure

```typescript
interface FeatureState {
  data: DataItem[];
  loading: boolean;
  error: string | null;
  filters: FilterOptions;
  selectedIds: string[];
}
```

### State Flow

| Action | State Change | Side Effects |
|--------|--------------|--------------|
| Load data | loading: true -> data populated | API call |
| Select item | selectedIds updated | None |
| Apply filter | filters updated | Refetch data |

### State Location

| State | Where | Why |
|-------|-------|-----|
| User data | Global (Context) | Shared across features |
| Feature data | Local (useState) | Feature-specific |
| UI state | Component | Not needed elsewhere |

---

## 4. API Integration

### API Bindings

| UI Action | API Endpoint | Request | Response Handling |
|-----------|--------------|---------|-------------------|
| Load list | GET /api/v1/resource | Query params | Set data state |
| Create item | POST /api/v1/resource | Body | Add to list, show toast |
| Delete item | DELETE /api/v1/resource/{id} | Path param | Remove from list |

### Request/Response Mapping

```typescript
// API Response -> UI Model
const mapResponseToUI = (response: ApiResponse): UIModel => ({
  id: response.id,
  displayName: response.name,
  status: mapStatus(response.status),
});
```

---

## 5. Optimistic UI

### What Updates Optimistically

| Action | Optimistic Behavior | Rollback Condition |
|--------|---------------------|-------------------|
| Create | Add to list immediately | API error |
| Delete | Remove from list immediately | API error |
| Update | Update in place | API error |

### Rollback Handling

```typescript
// Pattern
try {
  optimisticallyUpdate(data);
  await apiCall(data);
} catch (error) {
  rollback(previousState);
  showError(error);
}
```

---

## 6. Error Handling

### Error Types

| Error Type | Display | Recovery Action |
|------------|---------|-----------------|
| Network error | Toast + retry button | Retry request |
| Validation error | Inline field errors | Fix and resubmit |
| Auth error | Redirect to login | Re-authenticate |
| Server error | Error page | Contact support |

### Error UI Patterns

- **Toast**: Transient errors, user can continue
- **Inline**: Field-specific validation errors
- **Modal**: Blocking errors requiring action
- **Page**: Unrecoverable errors

---

## 7. Loading States

### Loading Indicators

| State | Indicator | User Can |
|-------|-----------|----------|
| Initial load | Skeleton | Nothing |
| Refresh | Spinner overlay | Wait |
| Pagination | Row skeleton | Scroll existing |
| Action pending | Button spinner | Cancel (if applicable) |

---

## 8. Accessibility

### Keyboard Navigation

| Key | Action |
|-----|--------|
| Tab | Move focus |
| Enter | Activate |
| Escape | Close/cancel |
| Arrow keys | Navigate list |

### ARIA Labels

| Element | Label | Role |
|---------|-------|------|
| Action button | "Create new item" | button |
| List | "Item list" | list |
| Status badge | "[Status] status" | status |

---

## 9. Testing Strategy

### Unit Tests

- Component renders correctly
- State changes work as expected
- Error states display properly

### Integration Tests

- API mocking scenarios
- User flow completion
- Error recovery flows

---

## Related Documents

- [02_api/[resource].md](../02_api/[resource].md) - API specification
- [state_management.md](./state_management.md) - Global state patterns
- [api_binding.md](./api_binding.md) - API integration patterns

---

*Without frontend docs, backend changes API arbitrarily.*
