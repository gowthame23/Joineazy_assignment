import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import { StatCard, Badge, Spinner, Alert } from '../components/ui';
import {
  ArrowLeft,
  Calendar,
  ExternalLink,
  Users,
  Search,
  CheckCircle2,
  Clock,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

export function AssignmentTracking() {
  const { id } = useParams();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [activeTab, setActiveTab] = useState('group'); // 'group' | 'student'
  const [statusFilter, setStatusFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  const fetchData = async () => {
    try {
      setError('');
      const res = await api.get(`/api/assignments/${id}/submissions`);
      setData(res);
    } catch (err) {
      setError(err.message || 'Failed to load assignment tracking details.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [id]);

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  if (loading) {
    return <Spinner size="lg" className="my-16" />;
  }

  if (error || !data) {
    return (
      <div className="space-y-4">
        <Link to="/dashboard" className="inline-flex items-center text-sm font-semibold text-brand hover:underline">
          <ArrowLeft className="w-4 h-4 mr-1.5" /> Back to Dashboard
        </Link>
        <Alert variant="danger" message={error || 'Assignment details could not be loaded.'} action="Retry" onAction={fetchData} />
      </div>
    );
  }

  const { assignment, summary, groups, students } = data;
  const dueDate = new Date(assignment.dueDate);
  const isOverdue = dueDate < new Date();

  // Filter groups
  const filteredGroups = groups.filter((g) => {
    const matchesSearch = g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      g.members.some(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()) || m.email.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || g.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  // Filter students
  const filteredStudents = students.filter((s) => {
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (s.studentId && s.studentId.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (s.groupName && s.groupName.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="space-y-6">
      {/* Back Link & Header */}
      <div>
        <Link
          to="/dashboard"
          className="inline-flex items-center text-xs font-semibold text-text-3 hover:text-text transition-colors mb-3"
        >
          <ArrowLeft className="w-3.5 h-3.5 mr-1" /> Back to Professor Dashboard
        </Link>
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-semibold text-ink">{assignment.title}</h1>
              {assignment.assignToAll ? (
                <span className="text-xs bg-brand-tint text-brand-dark px-2.5 py-0.5 rounded font-semibold">
                  All Students
                </span>
              ) : (
                <span className="text-xs bg-neutral-tint text-text-2 px-2.5 py-0.5 rounded font-semibold">
                  {summary.groups} Targeted Groups
                </span>
              )}
            </div>
            <p className="text-sm text-text-2 mt-1 max-w-2xl">
              {assignment.description || 'No description provided.'}
            </p>
          </div>

          <a
            href={assignment.oneDriveLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-brand bg-brand-tint hover:bg-brand-tint/70 rounded transition-colors"
          >
            <ExternalLink className="w-4 h-4" /> Open OneDrive Folder
          </a>
        </div>
      </div>

      {/* Due Date & Deadline Banner */}
      <div className="flex items-center gap-2 text-xs text-text-2 bg-surface p-3 rounded border border-line">
        <Calendar className="w-4 h-4 text-text-3" />
        <span>Due Date: <strong>{dueDate.toLocaleDateString()}</strong> at {dueDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        {isOverdue && <Badge status="overdue" text="Deadline Passed" className="ml-2" />}
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Confirmed"
          value={summary.confirmed}
          subtitle={`${summary.percent}% completion`}
          icon={CheckCircle2}
        />
        <StatCard
          label="Awaiting Confirmation"
          value={summary.pending}
          subtitle="Step 1 completed"
          icon={Clock}
        />
        <StatCard
          label="Not Submitted"
          value={summary.notSubmitted}
          subtitle="Pending action"
          icon={Users}
        />
        <StatCard
          label="Overall Progress"
          value={`${summary.percent}%`}
          subtitle={`${summary.confirmed} of ${summary.groups} groups`}
          icon={CheckCircle2}
        />
      </div>

      {/* Main Tracking Table Card */}
      <div className="bg-surface rounded border border-line shadow-subtle overflow-hidden">
        {/* View Tabs & Search Bar */}
        <div className="p-4 border-b border-line flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div role="tablist" aria-label="Tracking view" className="flex bg-canvas p-1 rounded border border-line">
            <button
              type="button"
              onClick={() => { setActiveTab('group'); if (statusFilter === 'no-group') setStatusFilter('all'); }}
              role="tab"
              aria-selected={activeTab === 'group'}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'group'
                  ? 'bg-surface text-ink shadow-subtle'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              Group-wise View ({groups.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('student')}
              role="tab"
              aria-selected={activeTab === 'student'}
              className={`px-4 py-1.5 text-xs font-semibold rounded transition-colors ${
                activeTab === 'student'
                  ? 'bg-surface text-ink shadow-subtle'
                  : 'text-text-3 hover:text-text'
              }`}
            >
              Student-wise View ({students.length})
            </button>
          </div>

          {/* Search & Status Filters */}
          <div className="flex items-center gap-3">
            {/* Status Filter */}
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-line rounded text-text focus:outline-none focus:border-brand"
            >
              <option value="all">All Statuses</option>
              <option value="confirmed">Confirmed</option>
              <option value="pending">Awaiting confirmation</option>
              <option value="not_submitted">Not submitted</option>
              {activeTab === 'student' && <option value="no-group">No group</option>}
            </select>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-text-3" />
              <input
                type="text"
                aria-label="Search"
                placeholder={activeTab === 'group' ? 'Search group or student...' : 'Search student or ID...'}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-48 sm:w-60 h-9 pl-8 pr-3 text-xs bg-white border border-line rounded text-text placeholder-text-3 focus:outline-none focus:border-brand"
              />
            </div>
          </div>
        </div>

        {/* Tab 1: Group-wise View */}
        {activeTab === 'group' && (
          <div className="divide-y divide-line">
            {filteredGroups.length === 0 ? (
              <div className="p-8 text-center text-xs text-text-3">
                No groups match the selected filters.
              </div>
            ) : (
              filteredGroups.map((g) => {
                const isExpanded = Boolean(expandedGroups[g.id]);

                return (
                  <div key={g.id} className="p-4 hover:bg-canvas/50 transition-colors">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <button
                          type="button"
                          onClick={() => toggleGroupExpand(g.id)}
                          className="p-1 rounded hover:bg-canvas text-text-3 hover:text-text"
                          aria-label="Toggle group members"
                        >
                          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                        </button>
                        <div>
                          <div className="font-semibold text-sm text-text flex items-center gap-2">
                            <span>{g.name}</span>
                            <span className="text-xs text-text-3">({g.members.length} members)</span>
                          </div>
                          {g.confirmedBy && (
                            <div className="text-xs text-text-3 mt-0.5">
                              Confirmed by <strong>{g.confirmedBy}</strong> on {new Date(g.confirmedAt).toLocaleDateString()}
                            </div>
                          )}
                        </div>
                      </div>

                      <div>
                        {g.status === 'confirmed' ? (
                          <Badge status="submitted" text="Confirmed" />
                        ) : g.status === 'pending' ? (
                          <Badge status="awaiting" text="Awaiting confirmation" />
                        ) : (
                          <Badge status="not_submitted" text="Not submitted" />
                        )}
                      </div>
                    </div>

                    {/* Expandable Group Members */}
                    {isExpanded && (
                      <div className="mt-3 pl-8 pt-2 border-t border-line/60">
                        <div className="text-xs font-semibold text-text-3 uppercase tracking-wider mb-2">
                          Team Members:
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                          {g.members.map((m) => (
                            <div
                              key={m.id}
                              className="p-2 rounded bg-surface border border-line text-xs flex items-center justify-between"
                            >
                              <div>
                                <div className="font-medium text-text">{m.name}</div>
                                <div className="text-[11px] text-text-3">{m.email}</div>
                              </div>
                              {m.isConfirmer && (
                                <span className="text-[10px] bg-brand-tint text-brand-dark px-1.5 py-0.5 rounded font-semibold">
                                  Confirmer
                                </span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* Tab 2: Student-wise View */}
        {activeTab === 'student' && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas border-b border-line text-xs font-semibold text-text-3 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Student</th>
                  <th className="py-3 px-4">Student ID</th>
                  <th className="py-3 px-4">Group</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Role in Submission</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-xs text-text-3">
                      No students match the selected filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map((s) => (
                    <tr key={s.id} className="hover:bg-canvas transition-colors">
                      <td className="py-3 px-4 font-medium text-text">
                        <div>{s.name}</div>
                        <div className="text-xs text-text-3">{s.email}</div>
                      </td>
                      <td className="py-3 px-4 text-xs text-text-2">
                        {s.studentId || <span className="text-text-3">—</span>}
                      </td>
                      <td className="py-3 px-4 text-xs text-text">
                        {s.groupName || <span className="text-text-3 italic">Ungrouped</span>}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {s.status === 'confirmed' ? (
                          <Badge status="submitted" text="Confirmed" />
                        ) : s.status === 'pending' ? (
                          <Badge status="awaiting" text="Awaiting confirmation" />
                        ) : s.status === 'no-group' ? (
                          <Badge status="no-group" text="No group" />
                        ) : (
                          <Badge status="not_submitted" text="Not submitted" />
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {s.isConfirmer ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-brand bg-brand-tint px-2 py-0.5 rounded">
                            <CheckCircle2 className="w-3.5 h-3.5" /> Confirmed this
                          </span>
                        ) : (
                          <span className="text-xs text-text-3">—</span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
