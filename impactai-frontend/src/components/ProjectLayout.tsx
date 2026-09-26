import { Link, NavLink, Outlet, useParams } from 'react-router-dom';
import { projectsApi } from '../api/projects';
import { useAsync } from '../hooks/useAsync';
import { Spinner } from './Spinner';
import { ErrorBanner } from './ErrorBanner';

const tabs = [
  { to: '', label: 'Overview', end: true },
  { to: 'media', label: 'Media', end: false },
  { to: 'search', label: 'Search', end: false },
  { to: 'compare', label: 'Compare', end: false },
  { to: 'reports', label: 'Reports', end: false },
];

export function ProjectLayout() {
  const { projectId } = useParams<{ projectId: string }>();
  const { data: project, loading, error, refetch } = useAsync(() => projectsApi.get(projectId!), [projectId]);

  return (
    <div className="flex h-full min-h-screen flex-col">
      <header className="border-b border-border bg-surface px-8 py-5">
        <Link to="/" className="text-xs text-ink-muted hover:text-clay">
          ← All projects
        </Link>
        <h1 className="mt-1 font-serif text-2xl text-ink">{project?.name ?? 'Loading project…'}</h1>
        {project?.description && <p className="mt-1 max-w-2xl text-sm text-ink-muted">{project.description}</p>}
        <nav className="mt-5 flex gap-1 border-b border-border">
          {tabs.map((tab) => (
            <NavLink
              key={tab.label}
              to={tab.to}
              end={tab.end}
              className={({ isActive }) =>
                `-mb-px border-b-2 px-3 py-2 text-sm font-medium transition-colors ${
                  isActive ? 'border-clay text-clay' : 'border-transparent text-ink-muted hover:text-ink'
                }`
              }
            >
              {tab.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <div className="flex-1 px-8 py-6">
        {loading && <Spinner label="Loading project…" />}
        {error && <ErrorBanner message={error} onRetry={refetch} />}
        {project && <Outlet context={{ project, refetchProject: refetch }} />}
      </div>
    </div>
  );
}
