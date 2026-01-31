# Component Structure

> **Version**: 1.0 | **Status**: Final | **Last Updated**: 2026-01-31

<!-- affects: frontend -->

---

## Questions This Document Answers

- How are components organized?
- What components exist for each feature?
- Where should new components be added?

---

## 1. Directory Structure

```
src/app/components/
├── ui/                 # Base UI components (shadcn/ui)
├── common/             # Shared feature components
├── chat/               # AI chat components
├── phases/             # Phase management
├── wbs/                # Work breakdown structure
├── backlog/            # Backlog & sprint
├── lineage/            # Data lineage
├── templates/          # Template management
├── integration/        # WBS-Backlog integration
├── statistics/         # Statistics & reports
├── pmo-console/        # PMO dashboard widgets
├── roles/              # Role management
├── settings/           # Settings components
└── figma/              # Design system components
```

---

## 2. UI Components (shadcn/ui)

Base components in `ui/` directory:

| Component | Purpose |
|-----------|---------|
| `button.tsx` | Primary action button |
| `input.tsx` | Text input field |
| `select.tsx` | Dropdown select |
| `dialog.tsx` | Modal dialogs |
| `card.tsx` | Content card container |
| `table.tsx` | Data table |
| `tabs.tsx` | Tab navigation |
| `sidebar.tsx` | Side navigation |
| `form.tsx` | Form controls |
| `toast.tsx` | Notifications |

---

## 3. Feature Components

### Dashboard & Overview

| Component | Purpose |
|-----------|---------|
| `Dashboard.tsx` | Main dashboard with project overview |
| `PartDashboard.tsx` | Team/part-specific dashboard |
| `StatisticsPage.tsx` | Project statistics |
| `PmoConsolePage.tsx` | PMO management console |

### Project Management

| Component | Purpose |
|-----------|---------|
| `ProjectManagement.tsx` | Project CRUD operations |
| `ProjectSelector.tsx` | Project selection dropdown |
| `ProjectNotSelectedMessage.tsx` | Empty state for no project |

### Phase Management (`phases/`)

| Component | Purpose |
|-----------|---------|
| `PhaseList.tsx` | List of project phases |
| `PhaseCard.tsx` | Individual phase display |
| `DeliverablesList.tsx` | Phase deliverables |
| `GateApprovalDialog.tsx` | Gate approval modal |

### WBS Management (`wbs/`)

| Component | Purpose |
|-----------|---------|
| `WbsOverviewTree.tsx` | Tree view of WBS |
| `WbsGanttChart.tsx` | Gantt chart timeline |
| `WbsProgressBar.tsx` | Progress visualization |
| `WbsSnapshotList.tsx` | Version snapshots |

### Backlog & Sprint (`backlog/`)

| Component | Purpose |
|-----------|---------|
| `SprintPanel.tsx` | Sprint board view |
| `EpicFormModal.tsx` | Epic creation/edit |
| `FeatureFormModal.tsx` | Feature management |

### AI Chat (`chat/`)

| Component | Purpose |
|-----------|---------|
| `AIAssistant.tsx` | Main chat interface |
| `EvidencePanel.tsx` | RAG source display |
| `ApprovalDialog.tsx` | AI action approval |

### Data Lineage (`lineage/`)

| Component | Purpose |
|-----------|---------|
| `LineageManagement.tsx` | Lineage main view |
| `LineageGraph.tsx` | Neo4j graph visualization |
| `LineageTimeline.tsx` | Timeline view |
| `ImpactAnalysis.tsx` | Change impact analysis |

### Common Components (`common/`)

| Component | Purpose |
|-----------|---------|
| `DeliverableManagement.tsx` | Deliverable CRUD |
| `MeetingManagement.tsx` | Meeting management |
| `IssueManagement.tsx` | Issue tracking |
| `StatisticsCard.tsx` | Stats display card |
| `FilterBar.tsx` | Filter controls |

---

## 4. Component Patterns

### Feature Component Structure

```tsx
// Feature component with hooks
export function ProjectManagement() {
  // State hooks
  const { currentProject } = useProject();
  const { user } = useAuthStore();

  // Query hooks
  const { data: projects, isLoading } = useProjects();
  const createMutation = useCreateProject();

  // Local state
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  // Handlers
  const handleCreate = async (data) => {
    await createMutation.mutateAsync(data);
    setIsDialogOpen(false);
  };

  // Render
  if (isLoading) return <Skeleton />;

  return (
    <div className="p-4">
      <Header onAdd={() => setIsDialogOpen(true)} />
      <ProjectList projects={projects} />
      <CreateDialog open={isDialogOpen} onSubmit={handleCreate} />
    </div>
  );
}
```

### Presentational Component

```tsx
// Pure display component
interface ProjectCardProps {
  project: Project;
  onEdit: () => void;
  onDelete: () => void;
}

export function ProjectCard({ project, onEdit, onDelete }: ProjectCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{project.name}</CardTitle>
      </CardHeader>
      <CardContent>
        <p>{project.description}</p>
        <Badge>{project.status}</Badge>
      </CardContent>
      <CardFooter>
        <Button onClick={onEdit}>Edit</Button>
        <Button variant="destructive" onClick={onDelete}>Delete</Button>
      </CardFooter>
    </Card>
  );
}
```

---

## 5. Index Files

Each feature directory has an `index.ts` for exports:

```typescript
// components/phases/index.ts
export { PhaseList } from './PhaseList';
export { PhaseCard } from './PhaseCard';
export { DeliverablesList } from './DeliverablesList';
export * from './types';
export * from './constants';
```

---

## 6. Type Definitions

Types are organized by feature:

```typescript
// components/phases/types.ts
export interface PhaseListProps {
  projectId: string;
  onPhaseSelect: (phaseId: string) => void;
}

export interface PhaseCardProps {
  phase: Phase;
  isEditable: boolean;
  onEdit: () => void;
}
```

---

## 7. Constants

Feature-specific constants:

```typescript
// components/phases/constants.ts
export const PHASE_STATUSES = [
  { value: 'NOT_STARTED', label: 'Not Started' },
  { value: 'IN_PROGRESS', label: 'In Progress' },
  { value: 'COMPLETED', label: 'Completed' },
  { value: 'ON_HOLD', label: 'On Hold' },
];

export const GATE_STATUSES = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'SUBMITTED', label: 'Submitted' },
  { value: 'APPROVED', label: 'Approved' },
  { value: 'REJECTED', label: 'Rejected' },
];
```

---

## 8. Where to Add New Components

| Component Type | Location |
|----------------|----------|
| Base UI component | `components/ui/` |
| Feature component | `components/{feature}/` |
| Shared utility component | `components/common/` |
| Page-level component | `components/{PageName}.tsx` |
| Dialog/Modal | `components/{feature}/modals/` or `dialogs/` |
| Reusable widget | `components/common/` |

---

## 9. Naming Conventions

| Type | Convention | Example |
|------|------------|---------|
| Component file | PascalCase | `ProjectCard.tsx` |
| Hook file | camelCase with use prefix | `useProjects.ts` |
| Type file | lowercase | `types.ts` |
| Constants file | lowercase | `constants.ts` |
| Index file | lowercase | `index.ts` |

---

## 10. Best Practices

### DO

- Keep components small and focused
- Use TypeScript for all props
- Export from index files
- Separate logic from presentation
- Use shadcn/ui components as base

### DON'T

- Create deeply nested component hierarchies
- Put business logic in presentational components
- Duplicate component code
- Skip TypeScript types
- Create components without clear purpose

---

*Last Updated: 2026-01-31*
