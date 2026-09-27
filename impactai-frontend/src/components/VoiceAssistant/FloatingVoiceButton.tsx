import { useState } from 'react';
import { VoiceAssistantModal } from './VoiceAssistantModal';
import { useParams } from 'react-router-dom';

export function FloatingVoiceButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { projectId } = useParams<{ projectId?: string }>();

  return (
    <>
      <aside aria-label="Voice Assistant" className="fixed bottom-6 right-6 z-40">
        <button
          onClick={() => setIsOpen(true)}
          title="Talk to your evidence"
          className="flex h-10 w-10 items-center justify-center rounded-full bg-clay text-white shadow-lg hover:bg-clay-hover hover:shadow-xl transition-all duration-200 cursor-pointer"
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
            />
          </svg>
        </button>

        <VoiceAssistantModal
          isOpen={isOpen}
          onClose={() => setIsOpen(false)}
          activeProjectId={projectId}
        />
      </aside>
    </>
  );
}
