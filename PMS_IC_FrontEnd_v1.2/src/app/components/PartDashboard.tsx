import { useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import {
  Target, AlertTriangle, CheckCircle2, Clock, TrendingUp,
  Users, Layers, FileText, ArrowLeft, RefreshCw
} from 'lucide-react';
import { usePartDashboard, usePartMetrics, useParts } from '../../hooks/api/useParts';
import { useProject } from '../../contexts/ProjectContext';
import { Part, PART_STATUS_INFO } from '../../types/part';
import { StatValue } from './dashboard/StatValue';

interface PartDashboardProps {
  partId?: string;
  onBack?: () => void;
}

export default function PartDashboard({ partId: initialPartId, onBack }: PartDashboardProps) {
  const { currentProject } = useProject();
  const projectId = currentProject?.id || '';

  const { data: parts = [], isLoading: partsLoading } = useParts(projectId);
  const [selectedPartId, setSelectedPartId] = useState<string>(initialPartId || '');

  const activePartId = selectedPartId || parts[0]?.id || '';

  const { data: dashboard, isLoading: dashboardLoading, refetch: refetchDashboard } = usePartDashboard(projectId, activePartId);
  const { data: metrics, isLoading: metricsLoading } = usePartMetrics(projectId, activePartId);

  const isLoading = partsLoading || dashboardLoading || metricsLoading;
  const selectedPart = parts.find(p => p.id === activePartId);

  if (!projectId) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-gray-600">Please select a project first.</p>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Part Dashboard...</p>
        </div>
      </div>
    );
  }

  const completionRate = metrics?.completionRate ??
    (dashboard && dashboard.totalStoryPoints > 0
      ? Math.round((dashboard.completedStoryPoints / dashboard.totalStoryPoints) * 100)
      : 0);

  // Story points distribution for pie chart
  const storyPointsData = dashboard ? [
    { name: 'Completed', value: dashboard.completedStoryPoints, color: '#22c55e' },
    { name: 'In Progress', value: dashboard.inProgressStoryPoints, color: '#3b82f6' },
    { name: 'Planned', value: dashboard.plannedStoryPoints, color: '#e5e7eb' },
  ].filter(d => d.value > 0) : [];

  // Status distribution for bar chart
  const statusData = dashboard ? [
    { status: 'Features', total: dashboard.featureCount },
    { status: 'Stories', total: dashboard.storyCount, completed: dashboard.completedStoryCount, inProgress: dashboard.inProgressStoryCount },
    { status: 'Tasks', total: dashboard.taskCount, completed: dashboard.completedTaskCount, blocked: dashboard.blockedTaskCount },
  ] : [];

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <ArrowLeft size={20} className="text-gray-600" />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Part Dashboard (PL Cockpit)</h1>
            <p className="text-gray-600 mt-1">Part Leader view for work area management</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={activePartId}
            onChange={(e) => setSelectedPartId(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            {parts.map((part: Part) => (
              <option key={part.id} value={part.id}>
                {part.name}
              </option>
            ))}
          </select>
          <button
            onClick={() => refetchDashboard()}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            title="Refresh"
          >
            <RefreshCw size={20} className="text-gray-600" />
          </button>
        </div>
      </div>

      {/* Part Info Banner */}
      {selectedPart && (
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-200 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                <Layers className="text-blue-600" size={24} />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-gray-900">{selectedPart.name}</h2>
                <div className="flex items-center gap-3 mt-1">
                  <span className="text-sm text-gray-600">PL: {selectedPart.leaderName || 'Not assigned'}</span>
                  <span className={`text-xs px-2 py-0.5 rounded-full ${PART_STATUS_INFO[selectedPart.status].bgColor} ${PART_STATUS_INFO[selectedPart.status].color}`}>
                    {PART_STATUS_INFO[selectedPart.status].label}
                  </span>
                </div>
              </div>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">Period</p>
              <p className="text-sm font-medium text-gray-700">{selectedPart.startDate} ~ {selectedPart.endDate}</p>
            </div>
          </div>
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completion Rate</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{completionRate}%</p>
              <p className="text-xs text-gray-600 mt-1">
                {dashboard?.completedStoryPoints || 0} / {dashboard?.totalStoryPoints || 0} SP
              </p>
            </div>
            <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
              <Target className="text-blue-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Active Stories</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{dashboard?.inProgressStoryCount || 0}</p>
              <p className="text-xs text-blue-600 mt-1 flex items-center gap-1">
                <Clock size={14} />
                <span>In Progress</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-green-100 rounded-full flex items-center justify-center">
              <TrendingUp className="text-green-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Blocked Tasks</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{dashboard?.blockedTaskCount || 0}</p>
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                <AlertTriangle size={14} />
                <span>Requires attention</span>
              </p>
            </div>
            <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
              <AlertTriangle className="text-amber-600" size={28} />
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Completed Tasks</p>
              <p className="text-3xl font-semibold text-gray-900 mt-2">{dashboard?.completedTaskCount || 0}</p>
              <p className="text-xs text-gray-600 mt-1">of {dashboard?.taskCount || 0} total</p>
            </div>
            <div className="w-14 h-14 bg-purple-100 rounded-full flex items-center justify-center">
              <CheckCircle2 className="text-purple-600" size={28} />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Story Points Distribution */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Story Points Distribution</h3>
          <div className="flex items-center gap-6">
            <ResponsiveContainer width="50%" height={200}>
              <PieChart>
                <Pie
                  data={storyPointsData}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {storyPointsData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                  <span className="text-sm text-gray-600">Completed</span>
                </div>
                <span className="font-semibold">{dashboard?.completedStoryPoints || 0} SP</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500"></div>
                  <span className="text-sm text-gray-600">In Progress</span>
                </div>
                <span className="font-semibold">{dashboard?.inProgressStoryPoints || 0} SP</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-300"></div>
                  <span className="text-sm text-gray-600">Planned</span>
                </div>
                <span className="font-semibold">{dashboard?.plannedStoryPoints || 0} SP</span>
              </div>
              <hr className="my-2" />
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Total</span>
                <span className="font-bold text-blue-600">{dashboard?.totalStoryPoints || 0} SP</span>
              </div>
            </div>
          </div>
        </div>

        {/* Work Items Overview */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 className="font-semibold text-gray-900 mb-4">Work Items Overview</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={statusData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="status" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="total" fill="#e5e7eb" name="Total" radius={[4, 4, 0, 0]} />
              <Bar dataKey="completed" fill="#22c55e" name="Completed" radius={[4, 4, 0, 0]} />
              <Bar dataKey="inProgress" fill="#3b82f6" name="In Progress" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Velocity</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              <StatValue value={metrics.velocity} format={(v) => v.toFixed(1)} naReason="No sprint data available" />
            </p>
            <p className="text-xs text-gray-500">SP/Sprint</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">WIP Count</p>
            <p className="text-2xl font-bold text-blue-700 mt-1">
              <StatValue value={metrics.wipCount} naReason="No WIP data" />
            </p>
            <p className="text-xs text-gray-500">Active items</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Avg Cycle Time</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              <StatValue value={metrics.avgCycleTime} format={(v) => v.toFixed(1)} naReason="No cycle time data" />
            </p>
            <p className="text-xs text-gray-500">Days</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-4 text-center">
            <p className="text-sm text-gray-500">Avg Lead Time</p>
            <p className="text-2xl font-bold text-gray-900 mt-1">
              <StatValue value={metrics.avgLeadTime} format={(v) => v.toFixed(1)} naReason="No lead time data" />
            </p>
            <p className="text-xs text-gray-500">Days</p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center">
              <FileText className="text-indigo-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Features</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboard?.featureCount || 0}</p>
          <p className="text-sm text-gray-500 mt-1">Total features in this part</p>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
              <Layers className="text-green-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Stories</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboard?.storyCount || 0}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-green-600">{dashboard?.completedStoryCount || 0} done</span>
            <span className="text-gray-300">|</span>
            <span className="text-sm text-blue-600">{dashboard?.inProgressStoryCount || 0} active</span>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center">
              <Users className="text-amber-600" size={20} />
            </div>
            <h3 className="font-semibold text-gray-900">Open Issues</h3>
          </div>
          <p className="text-3xl font-bold text-gray-900">{dashboard?.openIssueCount || 0}</p>
          <p className="text-sm text-red-600 mt-1">
            {dashboard?.highPriorityIssueCount || 0} high priority
          </p>
        </div>
      </div>
    </div>
  );
}
