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
  const { data: projects, loading, error, refetch } = useAsync(() => projectsApi.list(), []);
  const [showCreate, setShowCreate] = useState(false);

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
                className="cursor-pointer p-5 transition-shadow hover:shadow-md"
                onClick={() => (window.location.href = `/projects/${p.id}`)}
              >
                <h2 className="font-serif text-lg text-ink">{p.name}</h2>
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
    </div>
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
