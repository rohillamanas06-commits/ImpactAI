import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useParams } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useAsync } from '../hooks/useAsync';
import { Spinner } from './Spinner';
import { ErrorBanner } from './ErrorBanner';
import { Modal } from './Modal';
import { Button } from './Button';
import { WhatsAppHubModal } from './WhatsApp/WhatsAppHubModal';

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'media', label: 'Media', end: false },
  { to: 'map', label: 'Map', end: false },
  { to: 'timeline', label: 'Timeline', end: false },
  { to: 'search', label: 'Search', end: false },
  { to: 'compare', label: 'Compare', end: false },
  { to: 'reports', label: 'Reports', end: false },
];

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { data: project, loading, error, refetch } = useAsync(() => projectsApi.get(projectId!), [projectId]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showWhatsAppHub, setShowWhatsAppHub] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  async function handleDeleteProject() {
    if (!project) return;
    setDeleting(true);
    setDeleteError(null);
    try {
      await projectsApi.remove(project.id);
      navigate('/');
    } catch {
      setDeleteError('Failed to delete project. Please try again.');
      setDeleting(false);
    }
  }

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-8 py-5">
        <div className="flex items-start justify-between">
          <div>
            <Link to="/" className="text-xs text-ink-muted hover:text-clay">
              ← All projects
            </Link>
            <h1 className="mt-1 font-serif text-2xl text-ink">{project?.name ?? 'Loading project…'}</h1>
            {project?.description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{project.description}</p>}
          </div>
          {project && (
            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                onClick={() => setShowWhatsAppHub(true)}
                className="text-xs"
              >
                WhatsApp &amp; Social Hub
              </Button>
              <Button
                variant="danger"
                onClick={() => setShowDeleteModal(true)}
                className="text-xs"
              >
                Delete project
              </Button>
            </div>
          )}
        </div>


        <nav className="mt-5 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${isActive ? 'border-clay text-clay' : 'border-transparent text-ink-muted hover:text-ink'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>

      {showDeleteModal && project && (
        <Modal title={`Delete "${project.name}"?`} onClose={() => !deleting && setShowDeleteModal(false)}>
          <div className="space-y-4">
            <p className="text-sm text-ink-muted">
              Are you sure you want to delete this project? All associated media evidence, comparisons, and impact
              reports will be permanently deleted. This action cannot be undone.
            </p>
            {deleteError && <ErrorBanner message={deleteError} />}
            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowDeleteModal(false)}
                disabled={deleting}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteProject}
                disabled={deleting}
              >
                {deleting ? 'Deleting…' : 'Delete project'}
              </Button>
            </div>
          </div>
        </Modal>
      )}

      <div className="flex-1 px-8 py-6">
        {loading && <Spinner label="Loading project…" />}
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {project && <Outlet context={{ project, refetchProject: refetch }} />}
      </div>

      {showWhatsAppHub && project && (
        <WhatsAppHubModal
          isOpen={showWhatsAppHub}
          onClose={() => setShowWhatsAppHub(false)}
          activeProjectId={project.id}
          projectName={project.name}
          onMediaAdded={() => {
            refetch();
          }}
        />
      )}
    </div>
  );
}

