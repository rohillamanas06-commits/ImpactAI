import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useAsync } from '../hooks/useAsync';
import { Button } from '../components/Button';
import { Card } from '../components/Card';
import { Modal } from '../components/Modal';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { EmptyState } from '../components/EmptyState';
import { formatDate } from '../utils/format';

export function ProjectsListPage() {
  const navigate = useNavigate();
  const { data: projects, loading, error, refetch } = useAsync(() => projectsApi.list(), []);
  const [showCreate, setShowCreate] = useState(false);
  const [deletingProject, setDeletingProject] = useState<{ id: string; name: string } | null>(null);

  return (
    <div className="mx-auto max-w-5xl px-8 py-10">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="font-serif text-3xl text-ink">Projects</h1>
          <p className="mt-1 text-sm text-ink-muted">
            Each project holds the field evidence for one initiative — a cleanup drive, a plantation, a build.
          </p>
        </div>
        <Button onClick={() => setShowCreate(true)}>New project</Button>
      </div>

      <div className="mt-8">
        {loading && <Spinner label="Loading projects…" />}
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {projects && projects.length === 0 && (
          <EmptyState
            title="No projects yet"
            description="Create your first project to start uploading and organizing field evidence."
            action={<Button onClick={() => setShowCreate(true)}>New project</Button>}
          />
        )}
        {projects && projects.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => (
              <Card
                key={p.id}
                className="group relative cursor-pointer p-5 transition-shadow hover:shadow-md"
                onClick={() => navigate(`/projects/${p.id}`)}
              >
                <div className="flex items-start justify-between">
                  <h2 className="font-serif text-lg text-ink transition-colors group-hover:text-clay">{p.name}</h2>
                  <button
                    type="button"
                    title="Delete project"
                    onClick={(e) => {
                      e.stopPropagation();
                      setDeletingProject(p);
                    }}
                    className="ml-2 -mr-1 -mt-1 flex h-8 w-8 items-center justify-center rounded-md text-ink-muted opacity-0 transition-opacity hover:bg-danger-soft hover:text-danger group-hover:opacity-100"
                  >
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
                {p.description && <p className="mt-1 line-clamp-2 text-sm text-ink-muted">{p.description}</p>}
                <p className="mt-3 text-xs text-ink-muted">Created {formatDate(p.created_at)}</p>
              </Card>
            ))}
          </div>
        )}
      </div>

      {showCreate && (
        <CreateProjectModal
          onClose={() => setShowCreate(false)}
          onCreated={() => {
            setShowCreate(false);
            refetch();
          }}
        />
      )}

      {deletingProject && (
        <DeleteProjectModal
          project={deletingProject}
          onClose={() => setDeletingProject(null)}
          onDeleted={() => {
            setDeletingProject(null);
            refetch();
          }}
        />
      )}
    </div>
  );
}

function DeleteProjectModal({
  project,
  onClose,
  onDeleted,
}: {
  project: { id: string; name: string };
  onClose: () => void;
  onDeleted: () => void;
}) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    setSubmitting(true);
    setError(null);
    try {
      await projectsApi.remove(project.id);
      onDeleted();
    } catch {
      setError('Could not delete the project. Please try again.');
      setSubmitting(false);
    }
  }

  return (
    <Modal title={`Delete "${project.name}"?`} onClose={onClose}>
      <div className="space-y-4">
        <p className="text-sm text-ink-muted">
          Are you sure you want to delete this project? All associated media evidence, comparisons, and impact
          reports will be permanently deleted. This action cannot be undone.
        </p>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button type="button" variant="danger" onClick={handleDelete} disabled={submitting}>
            {submitting ? 'Deleting…' : 'Delete project'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}

function CreateProjectModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const navigate = useNavigate();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError('Give the project a name.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const project = await projectsApi.create({ name: name.trim(), description: description.trim() || undefined });
      onCreated();
      navigate(`/projects/${project.id}`);
    } catch {
      setError('Could not create the project. Check that the backend is running.');
      setSubmitting(false);
    }
  }

  return (
    <Modal title="New project" onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Name</label>
          <input
            autoFocus
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Delhi River Cleanup 2026"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-clay"
          />
        </div>
        <div>
          <label className="mb-1 block text-sm font-medium text-ink">Description (optional)</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="What is this project documenting?"
            className="w-full rounded-md border border-border-strong px-3 py-2 text-sm focus:border-clay"
          />
        </div>
        {error && <ErrorBanner message={error} />}
        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="secondary" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Creating…' : 'Create project'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
