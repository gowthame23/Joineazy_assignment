import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import { Button, Input, Badge, ProgressBar, Spinner, Alert, Modal } from '../components/ui';
import { formatRelativeDueDate, formatDateTime } from '../utils/date';
import { Users, ExternalLink, UserPlus, Trash2, CheckCircle2, Calendar, LogOut } from 'lucide-react';

export function StudentDashboard() {
  const { user } = useAuth();

  const [group, setGroup] = useState(null);
  const [assignments, setAssignments] = useState([]);
  const [hasGroup, setHasGroup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionMessage, setActionMessage] = useState({ text: '', type: 'success' });

  const [newGroupName, setNewGroupName] = useState('');
  const [createGroupLoading, setCreateGroupLoading] = useState(false);
  const [newMemberIdentifier, setNewMemberIdentifier] = useState('');
  const [addMemberLoading, setAddMemberLoading] = useState(false);

  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [modalStep, setModalStep] = useState(1); // 1 or 2
  const [submittingStep, setSubmittingStep] = useState(false);
  const [modalError, setModalError] = useState('');

  const fetchData = async () => {
    try {
      setError('');
      const [groupRes, assignRes] = await Promise.all([
        api.get('/api/groups/me'),
        api.get('/api/assignments'),
      ]);

      setGroup(groupRes.group);
      setHasGroup(Boolean(groupRes.group));
      setAssignments(assignRes.assignments || []);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleCreateGroup = async (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;

    setCreateGroupLoading(true);
    setActionMessage({ text: '', type: 'success' });
    try {
      const res = await api.post('/api/groups', { name: newGroupName.trim() });
      setGroup(res.group);
      setHasGroup(true);
      setNewGroupName('');
      setActionMessage({ text: `Group "${res.group.name}" created successfully!`, type: 'success' });
      await fetchData(); // Refresh assignments
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to create group.', type: 'danger' });
    } finally {
      setCreateGroupLoading(false);
    }
  };

  const handleAddMember = async (e) => {
    e.preventDefault();
    if (!newMemberIdentifier.trim()) return;

    setAddMemberLoading(true);
    setActionMessage({ text: '', type: 'success' });
    try {
      const res = await api.post('/api/groups/me/members', {
        identifier: newMemberIdentifier.trim(),
      });
      setGroup(res.group);
      setNewMemberIdentifier('');
      setActionMessage({ text: 'Team member added successfully!', type: 'success' });
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to add member.', type: 'danger' });
    } finally {
      setAddMemberLoading(false);
    }
  };

  const handleRemoveMember = async (targetUserId, isSelf) => {
    const confirmPrompt = isSelf
      ? 'Are you sure you want to leave this group?'
      : 'Are you sure you want to remove this member?';
    if (!window.confirm(confirmPrompt)) return;

    setActionMessage({ text: '', type: 'success' });
    try {
      const res = await api.delete(`/api/groups/me/members/${targetUserId}`);
      setGroup(res.group);
      if (!res.group || isSelf) {
        setHasGroup(false);
        setActionMessage({ text: 'You have left the group.', type: 'info' });
      } else {
        setActionMessage({ text: 'Member removed successfully.', type: 'success' });
      }
      await fetchData();
    } catch (err) {
      setActionMessage({ text: err.message || 'Operation failed.', type: 'danger' });
    }
  };

  const openSubmitModal = (assignment, step = 1) => {
    setSelectedAssignment(assignment);
    setModalStep(step);
    setModalError('');
  };

  const closeSubmitModal = () => {
    setSelectedAssignment(null);
    setModalStep(1);
    setModalError('');
    setSubmittingStep(false);
  };

  const handleStep1Submit = async () => {
    if (!selectedAssignment) return;
    setSubmittingStep(true);
    setModalError('');
    try {
      await api.post(`/api/assignments/${selectedAssignment.id}/submission/request`);
      setModalStep(2);
      // The server now holds a 'pending' submission: refresh in the background so the card
      // behind the modal is correct even if the student closes the dialog before step 2.
      fetchData();
    } catch (err) {
      setModalError(err.message || 'Failed to register submission request.');
    } finally {
      setSubmittingStep(false);
    }
  };

  const handleStep2Confirm = async () => {
    if (!selectedAssignment) return;
    setSubmittingStep(true);
    setModalError('');
    try {
      await api.post(`/api/assignments/${selectedAssignment.id}/submission/confirm`);
      closeSubmitModal();
      setActionMessage({ text: `Submission for "${selectedAssignment.title}" confirmed!`, type: 'success' });
      await fetchData();
    } catch (err) {
      setModalError(err.message || 'Failed to confirm submission.');
    } finally {
      setSubmittingStep(false);
    }
  };

  const handleCancelPending = async (assignmentId) => {
    if (!window.confirm('Cancel this pending submission request?')) return;
    try {
      await api.delete(`/api/assignments/${assignmentId}/submission/request`);
      setActionMessage({ text: 'Pending submission request cancelled.', type: 'info' });
      await fetchData();
    } catch (err) {
      setActionMessage({ text: err.message || 'Failed to cancel request.', type: 'danger' });
    }
  };

  if (loading) {
    return <Spinner size="lg" className="my-16" />;
  }

  const isLeader = group && group.leaderId === user?.id;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold text-ink">Welcome, {user?.name}</h1>
        <p className="text-sm text-text-2 mt-1">
          Track group collaboration, view course assignments, and submit your deliverables.
        </p>
      </div>

      {actionMessage.text && (
        <Alert
          variant={actionMessage.type}
          message={actionMessage.text}
          onAction={() => setActionMessage({ text: '', type: 'success' })}
        />
      )}

      {error && <Alert variant="danger" message={error} action="Retry" onAction={fetchData} />}

      <section className="bg-surface rounded border border-line p-5 shadow-subtle">
        <div className="flex items-center justify-between pb-4 border-b border-line mb-4">
          <div className="flex items-center gap-2.5">
            <Users className="w-5 h-5 text-brand" />
            <h2 className="text-lg font-semibold text-text">
              {hasGroup ? group.name : 'Group Management'}
            </h2>
            {isLeader && (
              <span className="text-[11px] font-semibold uppercase tracking-wider bg-brand-tint text-brand-dark px-2 py-0.5 rounded">
                Leader
              </span>
            )}
          </div>
          {hasGroup && (
            <div className="text-xs text-text-2">
              {group.members?.length} {group.members?.length === 1 ? 'member' : 'members'}
            </div>
          )}
        </div>

        {!hasGroup ? (
          <div className="py-2">
            <p className="text-sm text-text-2 mb-4">
              You are not currently in a project group. Create a group to collaborate with your classmates and confirm assignment submissions.
            </p>
            <form onSubmit={handleCreateGroup} className="flex flex-col sm:flex-row gap-3 max-w-lg">
              <Input
                placeholder="Enter new group name (e.g. Team Alpha)"
                value={newGroupName}
                onChange={(e) => setNewGroupName(e.target.value)}
                required
              />
              <Button type="submit" variant="primary" isLoading={createGroupLoading}>
                Create Group
              </Button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-canvas p-4 rounded border border-line">
              <div className="flex justify-between items-center mb-1.5 text-xs font-semibold uppercase tracking-wider text-text-3">
                <span>Group Completion Progress</span>
                <span className="text-text font-bold">{group.progress?.percent || 0}%</span>
              </div>
              <ProgressBar
                current={group.progress?.confirmed || 0}
                total={group.progress?.total || 0}
              />
            </div>

            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-2.5">
                Team Members
              </h3>
              <div className="border border-line rounded divide-y divide-line overflow-hidden">
                {group.members?.map((m) => {
                  const memberIsLeader = m.id === group.leaderId;
                  const isCurrentMember = m.id === user.id;

                  return (
                    <div
                      key={m.id}
                      className="p-3 bg-surface flex items-center justify-between hover:bg-canvas transition-colors text-sm"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-brand-tint text-brand-dark flex items-center justify-center font-semibold text-xs">
                          {m.name.charAt(0)}
                        </div>
                        <div>
                          <div className="font-medium text-text flex items-center gap-2">
                            <span>{m.name}</span>
                            {memberIsLeader && (
                              <span className="text-[10px] bg-brand/10 text-brand px-1.5 py-0.5 rounded font-semibold uppercase">
                                Leader
                              </span>
                            )}
                            {isCurrentMember && (
                              <span className="text-[10px] text-text-3">(You)</span>
                            )}
                          </div>
                          <div className="text-xs text-text-3">
                            {m.email} {m.studentId ? `• ID: ${m.studentId}` : ''}
                          </div>
                        </div>
                      </div>

                      <div>
                        {isCurrentMember ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, true)}
                            className="text-xs text-danger hover:underline inline-flex items-center gap-1 min-h-[40px] px-2"
                          >
                            <LogOut className="w-3.5 h-3.5" /> Leave
                          </button>
                        ) : isLeader ? (
                          <button
                            type="button"
                            onClick={() => handleRemoveMember(m.id, false)}
                            className="text-xs text-danger hover:underline inline-flex items-center gap-1 min-h-[40px] px-2"
                          >
                            <Trash2 className="w-3.5 h-3.5" /> Remove
                          </button>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {isLeader && (
              <div className="pt-2">
                <h3 className="text-xs font-semibold uppercase tracking-wider text-text-3 mb-2">
                  Add Team Member
                </h3>
                <form onSubmit={handleAddMember} className="flex flex-col sm:flex-row gap-2 max-w-md">
                  <Input
                    placeholder="Enter student email or Student ID"
                    value={newMemberIdentifier}
                    onChange={(e) => setNewMemberIdentifier(e.target.value)}
                    required
                  />
                  <Button
                    type="submit"
                    variant="secondary"
                    isLoading={addMemberLoading}
                    className="flex-shrink-0"
                  >
                    <UserPlus className="w-4 h-4 mr-1.5" /> Add
                  </Button>
                </form>
                <p className="text-xs text-text-3 mt-1.5">
                  The student must be registered and not currently assigned to another group.
                </p>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-text">Course Assignments</h2>
          <span className="text-xs text-text-3">
            {assignments.length} {assignments.length === 1 ? 'assignment' : 'assignments'}
          </span>
        </div>

        {assignments.length === 0 ? (
          <div className="bg-surface rounded border border-line p-8 text-center">
            <p className="text-sm text-text-2">No assignments have been assigned to you yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {assignments.map((assignment) => {
              const dueDate = new Date(assignment.dueDate);
              const isOverdue = dueDate < new Date();
              const subStatus = assignment.submission?.status || 'none';

              return (
                <div
                  key={assignment.id}
                  className="bg-surface rounded border border-line p-5 shadow-subtle flex flex-col justify-between space-y-4"
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-semibold text-base text-text leading-snug">
                        {assignment.title}
                      </h3>
                      {subStatus === 'confirmed' ? (
                        <Badge status="submitted" text="Submitted" />
                      ) : subStatus === 'pending' ? (
                        <Badge status="awaiting" text="Awaiting confirmation" />
                      ) : isOverdue ? (
                        <Badge status="overdue" text="Overdue" />
                      ) : (
                        <Badge status="not_submitted" text="Not submitted" />
                      )}
                    </div>

                    <p className="text-xs text-text-2 line-clamp-2">
                      {assignment.description || 'No description provided.'}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-xs text-text-2 pt-1">
                      <Calendar className="w-3.5 h-3.5 text-text-3" />
                      <span>Due: {formatDateTime(assignment.dueDate)}</span>
                      <span className={`font-medium ${isOverdue && subStatus !== 'confirmed' ? 'text-danger' : 'text-text'}`}>
                        ({formatRelativeDueDate(assignment.dueDate)})
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-line space-y-3">
                    <a
                      href={assignment.oneDriveLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-1.5 w-full h-10 text-sm font-medium rounded border border-line bg-white text-brand hover:bg-brand-tint focus:outline-none focus:ring-2 focus:ring-brand focus:ring-offset-2 transition-colors"
                    >
                      <ExternalLink className="w-4 h-4" /> Open OneDrive
                    </a>

                    <div>
                      {!hasGroup ? (
                        <div className="text-xs text-text-3 bg-canvas p-2 rounded border border-line">
                          Join or create a group to confirm submissions.
                        </div>
                      ) : subStatus === 'confirmed' ? (
                        <div className="text-xs bg-success-tint text-success font-medium p-2 rounded border border-success/20 flex items-center gap-1.5">
                          <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
                          <span>
                            Confirmed {assignment.submission.confirmedBy ? `by ${assignment.submission.confirmedBy}` : ''}{' '}
                            on {new Date(assignment.submission.confirmedAt).toLocaleDateString()}
                          </span>
                        </div>
                      ) : subStatus === 'pending' ? (
                        <div className="space-y-2">
                          <Button
                            variant="primary"
                            size="sm"
                            className="w-full"
                            onClick={() => openSubmitModal(assignment, 2)}
                          >
                            Confirm submission (Step 2)
                          </Button>
                          <div className="text-center">
                            <button
                              type="button"
                              onClick={() => handleCancelPending(assignment.id)}
                              className="text-xs text-danger hover:underline min-h-[40px] px-2"
                            >
                              Cancel pending request
                            </button>
                          </div>
                        </div>
                      ) : (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full"
                          onClick={() => openSubmitModal(assignment, 1)}
                        >
                          I have submitted (Step 1)
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedAssignment)}
        onClose={closeSubmitModal}
        title="Submission Verification"
      >
        {selectedAssignment && (
          <div className="space-y-5">
            <div className="flex items-center justify-between pb-3 border-b border-line text-xs">
              <span className="font-semibold text-brand">
                Step {modalStep} of 2
              </span>
              <span className="text-text-3">
                {modalStep === 1 ? 'Upload Verification' : 'Final Group Confirmation'}
              </span>
            </div>

            {modalError && <Alert variant="danger" message={modalError} />}

            {modalStep === 1 ? (
              <div className="space-y-4">
                <div className="text-sm text-text-2">
                  <p className="font-medium text-text mb-1">
                    Assignment: {selectedAssignment.title}
                  </p>
                  <p>
                    Have you uploaded your team's completed deliverables to the designated OneDrive link?
                  </p>
                </div>

                <div className="p-3 bg-canvas rounded border border-line text-xs space-y-1">
                  <div className="text-text font-medium">OneDrive URL:</div>
                  <a
                    href={selectedAssignment.oneDriveLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand hover:underline break-all"
                  >
                    {selectedAssignment.oneDriveLink}
                  </a>
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button variant="secondary" onClick={closeSubmitModal} disabled={submittingStep}>
                    No, go back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleStep1Submit}
                    isLoading={submittingStep}
                  >
                    Yes, I have submitted
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="text-sm text-text-2">
                  <p className="font-medium text-text mb-1">
                    Final Confirmation for {group?.name}
                  </p>
                  <p className="text-text">
                    Confirm submission for your whole group? <strong>This cannot be undone.</strong>
                  </p>
                </div>

                <div className="p-3 bg-warning-tint text-warning border border-warning/30 rounded text-xs">
                  Once confirmed, the professor dashboard will record this assignment as submitted for all team members.
                </div>

                <div className="flex justify-end gap-3 pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setModalStep(1)}
                    disabled={submittingStep}
                  >
                    Back
                  </Button>
                  <Button
                    variant="primary"
                    onClick={handleStep2Confirm}
                    isLoading={submittingStep}
                  >
                    Confirm submission
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
