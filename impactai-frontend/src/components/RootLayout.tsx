import { useState } from 'react';
import { Link, Outlet } from 'react-router-dom';
import { FloatingVoiceButton } from './VoiceAssistant/FloatingVoiceButton';
import { WhatsAppHubModal } from './WhatsApp/WhatsAppHubModal';

export function RootLayout() {
  const [showWhatsApp, setShowWhatsApp] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-paper">
      <aside className="flex h-screen w-60 shrink-0 flex-col gap-6 overflow-y-auto border-r border-shell-line bg-shell px-5 py-6 text-shell-ink">
        <div>
          <Link to="/" className="font-serif text-xl tracking-tight text-white">
            ImpactAI
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
            className="rounded px-3 py-2 text-left transition-colors hover:bg-shell-soft text-shell-ink cursor-pointer"
          >
            WhatsApp Hub
          </button>
        </nav>


        <p className="mt-auto text-xs leading-relaxed text-shell-ink-muted">
          Field evidence, organized: upload photos and video, let AI tag and describe them, then search, compare,
          and report on what changed.
        </p>
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
    </div>
  );
}


