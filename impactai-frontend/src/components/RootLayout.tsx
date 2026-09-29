import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { FloatingVoiceButton } from './VoiceAssistant/FloatingVoiceButton';
import { WhatsAppHubModal } from './WhatsApp/WhatsAppHubModal';
import { AuthModal } from './AuthModal';

export function RootLayout() {
  const { user, logout } = useAuth();
  const [showWhatsApp, setShowWhatsApp] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      <aside className="flex h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-shell-line bg-shell px-5 py-6 text-shell-ink">
        <div>
          <Link to="/" className="font-serif text-xl tracking-tight text-white flex items-center gap-2">
            <span className="text-leaf">🌱</span> ImpactAI
          </Link>
          <p className="mt-0.5 text-xs text-shell-ink-muted">Evidence &amp; Impact Platform</p>
        </div>

        <nav className="flex flex-col gap-1 text-sm">
          <Link to="/" className="rounded px-3 py-2 transition-colors hover:bg-shell-soft text-shell-ink">
            All projects
          </Link>
          <button
            type="button"
            onClick={() => setShowWhatsApp(true)}
            className="rounded px-3 py-2 text-left transition-colors hover:bg-shell-soft text-shell-ink cursor-pointer flex items-center justify-between"
          >
            <span>WhatsApp Hub</span>
            <span className="text-xs bg-leaf/20 text-leaf px-1.5 py-0.5 rounded font-mono">Live</span>
          </button>
        </nav>

        {/* User Account / Auth Section */}
        <div className="mt-auto border-t border-shell-line pt-4">
          {user ? (
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-leaf text-white flex items-center justify-center font-bold text-xs uppercase">
                  {user.full_name ? user.full_name[0] : user.email[0]}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium text-white truncate">{user.full_name || user.email}</p>
                  <p className="text-[10px] text-shell-ink-muted truncate">{user.email}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={logout}
                className="text-xs text-shell-ink-muted hover:text-white transition-colors cursor-pointer w-full text-left py-1"
              >
                Sign out
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowAuthModal(true)}
              className="w-full text-left rounded bg-shell-soft hover:bg-shell-line px-3 py-2 text-xs font-medium text-white transition-colors cursor-pointer flex items-center justify-between"
            >
              <span>Sign in / Register</span>
              <span className="text-leaf">→</span>
            </button>
          )}

          <p className="mt-4 text-[11px] leading-relaxed text-shell-ink-muted">
            Field evidence, verified: photos &amp; video tagged with Gemini AI, traceable to Cloudinary storage.
          </p>
        </div>
      </aside>

      <main className="h-screen min-w-0 flex-1 overflow-y-auto overflow-x-hidden bg-paper relative">
        <Outlet />
      </main>

      {/* Global Vapi Voice Assistant Floating Button */}
      <FloatingVoiceButton />

      {/* WhatsApp Hub Modal */}
      {showWhatsApp && (
        <WhatsAppHubModal
          isOpen={showWhatsApp}
          onClose={() => setShowWhatsApp(false)}
        />
      )}

      {/* Auth Modal */}
      {showAuthModal && (
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      )}
    </div>
  );
}
