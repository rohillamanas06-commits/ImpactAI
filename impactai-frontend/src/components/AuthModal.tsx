import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Modal } from './Modal';
import { Button } from './Button';
import { ErrorBanner } from './ErrorBanner';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const { login, register } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (tab === 'login') {
        await login(email, password);
      } else {
        await register(email, password, fullName || undefined);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={tab === 'login' ? 'Sign In to ImpactAI' : 'Create an Account'}
    >
      <div className="space-y-4">
        <div className="flex border-b border-border">
          <button
            type="button"
            className={`pb-2 text-sm font-medium transition-colors cursor-pointer mr-6 ${tab === 'login'
                ? 'border-b-2 border-leaf text-ink font-semibold'
                : 'text-ink-muted hover:text-ink'
              }`}
            onClick={() => {
              setTab('login');
              setError(null);
            }}
          >
            Sign In
          </button>
          <button
            type="button"
            className={`pb-2 text-sm font-medium transition-colors cursor-pointer ${tab === 'register'
                ? 'border-b-2 border-leaf text-ink font-semibold'
                : 'text-ink-muted hover:text-ink'
              }`}
            onClick={() => {
              setTab('register');
              setError(null);
            }}
          >
            Register
          </button>
        </div>

        {error && <ErrorBanner message={error} />}

        <form onSubmit={handleSubmit} className="space-y-3">
          {tab === 'register' && (
            <div>
              <label className="block text-xs font-medium text-ink-muted mb-1">Full Name</label>
              <input
                type="text"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full rounded-md border border-border-strong px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
              />
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Email Address</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="officer@organization.org"
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-ink-muted mb-1">Password</label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="w-full rounded-md border border-border-strong px-3 py-2 text-sm bg-surface text-ink focus:outline-none focus:ring-2 focus:ring-leaf"
            />
          </div>

          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={loading}>
              {loading ? 'Please wait…' : tab === 'login' ? 'Sign In' : 'Create Account'}
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
