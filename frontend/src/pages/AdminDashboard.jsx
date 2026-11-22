import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { Button, Input, StatCard, ProgressBar, Spinner, Alert, Modal } from '../components/ui';
import {
  Users,
  FolderKanban,
  CheckCircle2,
  AlertTriangle,
  Plus,
  Eye,
  Pencil,
  Trash2,
  Calendar,
  Layers,
  Search,
} from 'lucide-react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export function AdminDashboard() {
  const navigate = useNavigate();

  const [analytics, setAnalytics] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [allGroups, setAllGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [feedback, setFeedback] = useState({ text: '', type: 'success' });

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState('create'); // 'create' | 'edit'
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    dueDate: '',
    oneDriveLink: '',
    assignToAll: true,
    groupIds: [],
  });
  const [groupSearchQuery, setGroupSearchQuery] = useState('');
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [formFieldErrors, setFormFieldErrors] = useState({});

  const [deletingAssignment, setDeletingAssignment] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchData = async () => {
    try {
      setError('');
      const [analyticsRes, assignRes, groupsRes] = await Promise.all([
        api.get('/api/analytics'),
        api.get('/api/assignments'),
        api.get('/api/groups'),
      ]);
      setAnalytics(analyticsRes);
      setAssignments(assignRes.assignments || []);
      setAllGroups(groupsRes.groups || []);
    } catch (err) {
      setError(err.message || 'Failed to fetch dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const openCreateModal = () => {
    setModalMode('create');
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      dueDate: '',
      oneDriveLink: '',
      assignToAll: true,
      groupIds: [],
    });
    setFormError('');
    setFormFieldErrors({});
    setGroupSearchQuery('');
    setIsModalOpen(true);
  };

  const openEditModal = (a) => {
    setModalMode('edit');
    setEditingId(a.id);
    // Convert date to datetime-local format YYYY-MM-DDThh:mm
    const dateObj = new Date(a.dueDate);
    const tzOffset = dateObj.getTimezoneOffset() * 60000;
    const localISOTime = new Date(dateObj.getTime() - tzOffset).toISOString().slice(0, 16);

    setFormData({
      title: a.title,
      description: a.description || '',
      dueDate: localISOTime,
      oneDriveLink: a.oneDriveLink,
      assignToAll: a.assignToAll,
      groupIds: a.groupIds || [],
    });
    setFormError('');
    setFormFieldErrors({});
    setGroupSearchQuery('');
    setIsModalOpen(true);
  };

  const handleToggleGroup = (groupId) => {
    setFormData((prev) => {
      const exists = prev.groupIds.includes(groupId);
      return {
        ...prev,
        groupIds: exists
          ? prev.groupIds.filter((id) => id !== groupId)
          : [...prev.groupIds, groupId],
      };
    });
  };

  const handleFormSubmit = async (e) => {
    e.preventDefault();
    setFormError('');

    const errs = {};
    if (!formData.title.trim()) errs.title = 'Assignment title is required.';
    if (!formData.dueDate) errs.dueDate = 'Due date is required.';
    if (!formData.oneDriveLink.trim()) errs.oneDriveLink = 'OneDrive link is required.';
    else if (!/^https?:\/\/\S+$/i.test(formData.oneDriveLink.trim())) errs.oneDriveLink = 'Link must start with http:// or https://';
    if (!formData.assignToAll && formData.groupIds.length === 0) errs.groups = 'Select at least one group or choose "All students".';
    setFormFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setFormLoading(true);
    try {
      const payload = {
        title: formData.title.trim(),
        description: formData.description.trim(),
        dueDate: new Date(formData.dueDate).toISOString(),
        oneDriveLink: formData.oneDriveLink.trim(),
        assignToAll: formData.assignToAll,
        groupIds: formData.assignToAll ? [] : formData.groupIds,
      };

      if (modalMode === 'create') {
        await api.post('/api/assignments', payload);
        setFeedback({ text: 'Assignment created successfully!', type: 'success' });
      } else {
        await api.put(`/api/assignments/${editingId}`, payload);
        setFeedback({ text: 'Assignment updated successfully!', type: 'success' });
      }

      setIsModalOpen(false);
      await fetchData();
    } catch (err) {
      setFormError(err.message || 'Failed to save assignment.');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDeleteAssignment = async () => {
    if (!deletingAssignment) return;
    setDeleteLoading(true);
    try {
      await api.delete(`/api/assignments/${deletingAssignment.id}`);
      setFeedback({ text: 'Assignment deleted successfully.', type: 'info' });
      setDeletingAssignment(null);
      await fetchData();
    } catch (err) {
      setFeedback({ text: err.message || 'Failed to delete assignment.', type: 'danger' });
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return <Spinner size="lg" className="my-16" />;
  }

  const totals = analytics?.totals || {};
  const filteredGroups = allGroups.filter((g) =>
    g.name.toLowerCase().includes(groupSearchQuery.toLowerCase())
  );

  // Recharts data preparation for assignments chart: confirmed vs remaining
  const assignmentChartData = (analytics?.assignments || []).map((a) => ({
    name: a.title.length > 20 ? `${a.title.slice(0, 18)}...` : a.title,
    fullTitle: a.title,
    confirmed: a.confirmed,
    remaining: Math.max(0, a.targeted - a.confirmed),
  }));

  const groupChartData = (analytics?.groups || []).map((g) => ({
    name: g.name,
    percent: g.percent,
  }));

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink">Professor Dashboard</h1>
          <p className="text-sm text-text-2 mt-1">
            Overview of course performance, student groups, and assignment submissions.
          </p>
        </div>
        <Button variant="primary" onClick={openCreateModal}>
          <Plus className="w-4 h-4 mr-1.5" /> New Assignment
        </Button>
      </div>

      {feedback.text && (
        <Alert
          variant={feedback.type}
          message={feedback.text}
          onAction={() => setFeedback({ text: '', type: 'success' })}
        />
      )}

      {error && <Alert variant="danger" message={error} action="Retry" onAction={fetchData} />}

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3.5 sm:gap-4">
        <StatCard
          label="Students"
          value={totals.students || 0}
          subtitle={`${totals.ungroupedStudents || 0} ungrouped`}
          icon={Users}
        />
        <StatCard
          label="Groups"
          value={totals.groups || 0}
          subtitle="Collaborative teams"
          icon={FolderKanban}
        />
        <StatCard
          label="Assignments"
          value={totals.assignments || 0}
          subtitle="Total published"
          icon={Layers}
        />
        <StatCard
          label="Overall Progress"
          value={`${totals.overallCompletionPercent || 0}%`}
          subtitle="Total submissions"
          icon={CheckCircle2}
        />
        <StatCard
          label="Overdue"
          value={totals.overdueAssignments || 0}
          subtitle="Past submission deadline"
          icon={AlertTriangle}
          className={totals.overdueAssignments > 0 ? 'border-danger/30' : ''}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-surface p-5 rounded border border-line shadow-subtle">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
              Assignment Submissions (Confirmed vs Remaining)
            </h2>
            <p className="text-xs text-text-3">Breakdown of group completions per assignment</p>
          </div>

          {assignmentChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-text-3">
              No assignments available to chart.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={assignmentChartData} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#667085', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#667085', fontSize: 11 }} allowDecimals={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E6EC',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />
                  <Bar dataKey="confirmed" name="Confirmed" fill="#0E7C86" stackId="a" />
                  <Bar dataKey="remaining" name="Remaining" fill="#D5DAE1" stackId="a" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        <div className="bg-surface p-5 rounded border border-line shadow-subtle">
          <div className="mb-4">
            <h2 className="text-sm font-semibold text-text uppercase tracking-wide">
              Group Completion Rate (%)
            </h2>
            <p className="text-xs text-text-3">Completion percentage across assigned deliverables</p>
          </div>

          {groupChartData.length === 0 ? (
            <div className="h-64 flex items-center justify-center text-xs text-text-3">
              No groups formed yet.
            </div>
          ) : (
            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={groupChartData} margin={{ top: 10, right: 10, left: -10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#E2E6EC" vertical={false} />
                  <XAxis dataKey="name" tick={{ fill: '#667085', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#667085', fontSize: 11 }} domain={[0, 100]} />
                  <Tooltip
                    formatter={(val) => [`${val}%`, 'Completion']}
                    contentStyle={{
                      backgroundColor: '#FFFFFF',
                      borderColor: '#E2E6EC',
                      borderRadius: '8px',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="percent" name="Progress (%)" fill="#0E7C86" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      </div>

      <section className="bg-surface rounded border border-line shadow-subtle overflow-hidden">
        <div className="p-5 border-b border-line flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-text">Assignments</h2>
            <p className="text-xs text-text-3">Manage deadlines, audience targeting, and monitor submissions</p>
          </div>
          <span className="text-xs text-text-3">
            {assignments.length} total
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="p-8 text-center text-sm text-text-2">
            No assignments created yet. Click "New Assignment" to post one.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-canvas border-b border-line text-xs font-semibold text-text-3 uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Title</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4">Audience</th>
                  <th className="py-3 px-4 min-w-[160px]">Completion</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {assignments.map((a) => {
                  const dueDate = new Date(a.dueDate);
                  const isOverdue = dueDate < new Date();

                  return (
                    <tr key={a.id} className="hover:bg-canvas transition-colors">
                      <td className="py-3.5 px-4 font-medium text-text">
                        <div className="font-semibold text-ink">{a.title}</div>
                        <div className="text-xs text-text-3 truncate max-w-xs">{a.description}</div>
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-2">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-text-3" />
                          <span>{dueDate.toLocaleDateString()}</span>
                        </div>
                        {isOverdue && <span className="text-danger font-medium text-[11px]">Overdue</span>}
                      </td>
                      <td className="py-3.5 px-4 whitespace-nowrap text-xs text-text-2">
                        {a.assignToAll ? (
                          <span className="bg-brand-tint text-brand-dark px-2 py-0.5 rounded font-medium">
                            All Students
                          </span>
                        ) : (
                          <span className="bg-neutral-tint text-text-2 px-2 py-0.5 rounded font-medium">
                            {a.targeted} {a.targeted === 1 ? 'Group' : 'Groups'}
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <ProgressBar current={a.confirmed} total={a.targeted} />
                      </td>
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/assignments/${a.id}`)}
                            title="View Submissions" aria-label={`View submissions for ${a.title}`}
                            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded hover:bg-canvas text-brand hover:text-brand-dark transition-colors"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => openEditModal(a)}
                            title="Edit Assignment" aria-label={`Edit ${a.title}`}
                            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded hover:bg-canvas text-text-2 hover:text-text transition-colors"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeletingAssignment(a)}
                            title="Delete Assignment" aria-label={`Delete ${a.title}`}
                            className="inline-flex items-center justify-center min-w-[40px] min-h-[40px] rounded hover:bg-canvas text-danger hover:opacity-80 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={modalMode === 'create' ? 'Create New Assignment' : 'Edit Assignment'}
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleFormSubmit} noValidate className="space-y-4">
          {formError && <Alert variant="danger" message={formError} />}

          <Input
            label="Title"
            id="title"
            required
            error={formFieldErrors.title}
            placeholder="e.g. Milestone 1: Requirements"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />

          <div className="w-full space-y-1.5">
            <label htmlFor="description" className="block text-sm font-medium text-text">
              Description
            </label>
            <textarea
              id="description"
              rows={3}
              className="w-full px-3 py-2 text-sm bg-white border border-line rounded text-text placeholder-text-3 focus:outline-none focus:border-brand focus:ring-[3px] focus:ring-brand-tint"
              placeholder="Provide instructions and criteria..."
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            />
          </div>

          <Input
            label="Due Date & Time"
            id="dueDate"
            type="datetime-local"
            required
            error={formFieldErrors.dueDate}
            value={formData.dueDate}
            onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
          />

          <Input
            label="OneDrive Submission Link"
            id="oneDriveLink"
            type="url"
            required
            error={formFieldErrors.oneDriveLink}
            placeholder="https://onedrive.live.com/..."
            helperText="Where students will upload their team files before confirming."
            value={formData.oneDriveLink}
            onChange={(e) => setFormData({ ...formData, oneDriveLink: e.target.value })}
          />

          <div className="space-y-2 pt-1">
            <label className="block text-sm font-medium text-text">Target Audience</label>
            <div className="flex gap-4 text-sm">
              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={formData.assignToAll}
                  onChange={() => setFormData({ ...formData, assignToAll: true, groupIds: [] })}
                  className="text-brand focus:ring-brand"
                />
                <span>All Students</span>
              </label>

              <label className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="audience"
                  checked={!formData.assignToAll}
                  onChange={() => setFormData({ ...formData, assignToAll: false })}
                  className="text-brand focus:ring-brand"
                />
                <span>Specific Groups</span>
              </label>
            </div>
          </div>

          {!formData.assignToAll && (
            <div className="p-3 bg-canvas border border-line rounded space-y-2">
              {formFieldErrors.groups && <p className="text-xs text-danger">{formFieldErrors.groups}</p>}
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-3 text-text-3" />
                <input
                  type="text"
                  placeholder="Search groups..."
                  className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-line rounded focus:outline-none focus:border-brand"
                  value={groupSearchQuery}
                  onChange={(e) => setGroupSearchQuery(e.target.value)}
                />
              </div>

              <div className="max-h-36 overflow-y-auto space-y-1 text-xs">
                {filteredGroups.length === 0 ? (
                  <p className="text-text-3 py-2 text-center">No groups found.</p>
                ) : (
                  filteredGroups.map((g) => {
                    const isChecked = formData.groupIds.includes(g.id);
                    return (
                      <label
                        key={g.id}
                        className="flex items-center gap-2 p-1.5 hover:bg-surface rounded cursor-pointer"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleGroup(g.id)}
                          className="rounded text-brand focus:ring-brand"
                        />
                        <span className="font-medium text-text">{g.name}</span>
                        <span className="text-text-3">({g.members?.length || 0} members)</span>
                      </label>
                    );
                  })
                )}
              </div>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-3 border-t border-line">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
              disabled={formLoading}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" isLoading={formLoading}>
              {modalMode === 'create' ? 'Create Assignment' : 'Save Changes'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={Boolean(deletingAssignment)}
        onClose={() => setDeletingAssignment(null)}
        title="Delete Assignment"
      >
        {deletingAssignment && (
          <div className="space-y-4">
            <p className="text-sm text-text">
              Are you sure you want to delete <strong>{deletingAssignment.title}</strong>? All associated group submissions will be permanently removed.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button
                variant="secondary"
                onClick={() => setDeletingAssignment(null)}
                disabled={deleteLoading}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteAssignment}
                isLoading={deleteLoading}
              >
                Delete Assignment
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
