import React, { useState, useEffect } from 'react';
import { webhooksApi } from '../../api/webhooks';
import type { WhatsAppMessage } from '../../api/types';
import { Button } from '../Button';
import { Badge } from '../Badge';
import { ErrorBanner } from '../ErrorBanner';

interface WhatsAppHubModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
  projectName?: string;
  onMediaAdded?: () => void;
}

const SAMPLE_EVIDENCE_PHOTOS = [
  {
    name: 'Solar Water Pump',
    url: 'https://images.unsplash.com/photo-1542601906990-b4d3fb778b09?auto=format&fit=crop&w=1000&q=80',
    caption: '#cleanwater Installed new solar pump in village center',
  },
  {
    name: 'Mangrove Planting',
    url: 'https://images.unsplash.com/photo-1513836279014-a89f7a76ae86?auto=format&fit=crop&w=1000&q=80',
    caption: '#mangrove Planted 350 saplings with youth volunteers at coastal bank',
  },
  {
    name: 'Canal Cleanup',
    url: 'https://images.unsplash.com/photo-1618477461853-cf6ed80faba5?auto=format&fit=crop&w=1000&q=80',
    caption: '#cleanup Removed 420kg plastic debris from downstream canal',
  },
];

export function WhatsAppHubModal({
  isOpen,
  onClose,
  activeProjectId,
  projectName = 'Field Project',
  onMediaAdded,
}: WhatsAppHubModalProps) {
  const [activeTab, setActiveTab] = useState<'simulator' | 'campaign' | 'config'>('simulator');
  const [messages, setMessages] = useState<WhatsAppMessage[]>([]);

  const [phone, setPhone] = useState('+91 98765 43210');
  const [senderName, setSenderName] = useState('Ravi Kumar (Field Officer)');
  const [caption, setCaption] = useState(
    `#${projectName.toLowerCase().replace(/\s+/g, '-')} Installed clean water filtration system in district 4`
  );
  const [imageUrl, setImageUrl] = useState(SAMPLE_EVIDENCE_PHOTOS[0].url);
  const [customUrl, setCustomUrl] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadMessages();
  }, [isOpen, activeProjectId]);

  async function loadMessages() {
    try {
      const data = await webhooksApi.getWhatsAppMessages(activeProjectId);
      setMessages(data);
    } catch {}
  }

  async function handleSimulateSend(e: React.FormEvent) {
    e.preventDefault();
    setIsSending(true);
    setError(null);
    const activeUrl = customUrl.trim() || imageUrl;
    try {
      const result = await webhooksApi.simulateWhatsApp({
        sender_phone: phone,
        sender_name: senderName,
        caption,
        image_url: activeUrl,
        project_id: activeProjectId,
      });
      setMessages((prev) => [result, ...prev]);
      if (onMediaAdded) onMediaAdded();
    } catch (err: any) {
      setError(err?.message || 'Failed to simulate WhatsApp upload. Ensure backend is running.');
    } finally {
      setIsSending(false);
    }
  }

  if (!isOpen) return null;

  const tabs: { key: typeof activeTab; label: string }[] = [
    { key: 'simulator', label: 'Field Ingestion' },
    { key: 'campaign', label: 'Campaign' },
    { key: 'config', label: 'Meta Setup' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex h-[85vh] max-h-[720px] w-full max-w-4xl flex-col rounded-xl border border-border bg-surface shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-shell px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-semibold text-white">
                WhatsApp &amp; Social Campaign Hub
              </h2>
              <Badge tone="moss">Field Ingestion</Badge>
            </div>
            <p className="text-[11px] text-shell-ink-muted mt-0.5">
              Collect verified evidence from WhatsApp in the field and distribute campaign updates
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-paper px-5 text-xs font-medium">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key)}
              className={`-mb-px border-b-2 py-2.5 px-3 transition-colors ${
                activeTab === t.key
                  ? 'border-clay text-clay font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab 1: Field Ingestion Simulator */}
        {activeTab === 'simulator' && (
          <div className="flex flex-1 overflow-hidden p-5 gap-5">

            {/* Left: Chat Preview */}
            <div className="flex flex-col w-64 shrink-0 rounded-lg border border-border bg-paper shadow-sm overflow-hidden">
              <div className="border-b border-border bg-surface px-3 py-2.5">
                <p className="text-xs font-semibold text-ink">ImpactAI Evidence Gateway</p>
                <p className="text-[10px] text-ink-muted mt-0.5">Field Officer Channel</p>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2.5 text-xs">
                <div className="rounded-md border border-border bg-surface p-2.5 text-ink-muted">
                  <p className="font-semibold text-ink text-[11px]">Automated Verification</p>
                  <p className="mt-0.5 text-[11px] leading-relaxed">
                    Photos sent here are uploaded to Cloudinary, analyzed by Gemini, and tagged with GPS metadata.
                  </p>
                </div>

                {messages.slice(0, 3).map((m) => (
                  <React.Fragment key={m.id}>
                    <div className="ml-auto max-w-[88%] rounded-lg bg-clay-soft border border-clay/20 p-2">
                      {m.media_url && (
                        <img
                          src={m.media_url}
                          alt="Evidence"
                          className="h-20 w-full rounded-md object-cover mb-1.5"
                        />
                      )}
                      <p className="text-[11px] font-medium text-clay-hover">{m.caption}</p>
                      <span className="mt-1 block text-right text-[9px] text-ink-muted">
                        {m.sender_name || m.sender_phone}
                      </span>
                    </div>
                    {m.reply_text && (
                      <div className="mr-auto max-w-[88%] rounded-lg bg-surface border border-border p-2">
                        <p className="whitespace-pre-line text-[11px] leading-relaxed text-ink">{m.reply_text}</p>
                        <span className="mt-1 block text-right text-[9px] text-ink-muted">Verified</span>
                      </div>
                    )}
                  </React.Fragment>
                ))}

                {isSending && (
                  <div className="ml-auto max-w-[88%] rounded-lg bg-paper border border-border p-2 text-[11px] text-ink-muted animate-pulse">
                    Processing via Cloudinary &amp; Gemini…
                  </div>
                )}
              </div>

              <div className="border-t border-border bg-surface px-3 py-2 text-[10px] text-ink-muted flex items-center justify-between">
                <span>Connection active</span>
                <span className="h-1.5 w-1.5 rounded-full bg-moss" />
              </div>
            </div>

            {/* Right: Form */}
            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <div>
                <h3 className="font-serif text-base font-semibold text-ink">Test Field Submission</h3>
                <p className="text-xs text-ink-muted mt-0.5">
                  Simulate an incoming WhatsApp submission from the field into{' '}
                  <span className="font-medium text-ink">{projectName}</span>.
                </p>
              </div>

              {error && <ErrorBanner message={error} />}

              <form onSubmit={handleSimulateSend} className="space-y-3.5">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">Sender Name</label>
                    <input
                      type="text"
                      value={senderName}
                      onChange={(e) => setSenderName(e.target.value)}
                      className="w-full rounded-md border border-border-strong px-2.5 py-1.5 text-sm focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-ink-muted mb-1">Phone Number</label>
                    <input
                      type="text"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full rounded-md border border-border-strong px-2.5 py-1.5 text-sm font-mono focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1.5">
                    Sample Field Evidence Photo
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {SAMPLE_EVIDENCE_PHOTOS.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => { setImageUrl(item.url); setCustomUrl(''); setCaption(item.caption); }}
                        className={`cursor-pointer rounded-lg border p-1.5 transition-colors ${
                          imageUrl === item.url && !customUrl
                            ? 'border-clay bg-clay-soft'
                            : 'border-border bg-surface hover:border-border-strong'
                        }`}
                      >
                        <img src={item.url} alt={item.name} className="h-14 w-full rounded-md object-cover" />
                        <p className="mt-1 line-clamp-1 text-[11px] font-medium text-ink">{item.name}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">Custom Image URL (optional)</label>
                  <input
                    type="url"
                    value={customUrl}
                    onChange={(e) => setCustomUrl(e.target.value)}
                    placeholder="https://…"
                    className="w-full rounded-md border border-border-strong px-2.5 py-1.5 text-sm focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-ink-muted mb-1">
                    Field Message &amp; Project Tag
                  </label>
                  <textarea
                    rows={2}
                    value={caption}
                    onChange={(e) => setCaption(e.target.value)}
                    className="w-full rounded-md border border-border-strong px-2.5 py-1.5 text-sm focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15"
                  />
                  <p className="mt-1 text-[11px] text-ink-muted">
                    Hashtags like <code>#water</code> route evidence to matching projects.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-border">
                  <Button type="button" variant="secondary" onClick={onClose} className="text-xs">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isSending} className="text-xs">
                    {isSending ? 'Sending…' : 'Send WhatsApp Evidence'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Tab 2: Campaign */}
        {activeTab === 'campaign' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4">
            <div>
              <h3 className="font-serif text-base font-semibold text-ink">Campaign Social Kit</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Pre-formatted distribution kit for evidence from{' '}
                <span className="font-medium text-ink">{projectName}</span>.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink uppercase tracking-wider">Donor &amp; Social Copy</p>
                  <Button
                    variant="secondary"
                    className="text-xs"
                    onClick={() => {
                      navigator.clipboard.writeText(
                        `Verified milestone from ${projectName}: Rigorous photo verification and AI analysis confirm measurable impact.\n\nEvidence securely stored on ImpactAI.\n\n#Sustainability #FieldEvidence #ClimateAction`
                      );
                      alert('Copied to clipboard!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
                <div className="rounded-md bg-paper border border-border p-3 text-xs text-ink font-mono whitespace-pre-line leading-relaxed">
                  {`Verified milestone from ${projectName}: Rigorous photo verification and AI analysis confirm measurable impact.\n\nEvidence securely stored on ImpactAI.\n\n#Sustainability #FieldEvidence #ClimateAction`}
                </div>
              </div>

              <div className="rounded-lg border border-border bg-paper p-4 space-y-2">
                <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">Distribution</h4>
                <p className="text-xs text-ink-muted leading-relaxed">
                  Field evidence verified through the WhatsApp gateway can be shared directly with donors or exported to official PDF impact reports.
                </p>
                <div className="pt-2">
                  <Badge tone="moss">Traceable Media</Badge>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Tab 3: Meta Cloud Config */}
        {activeTab === 'config' && (
          <div className="flex-1 overflow-y-auto p-5 space-y-4 text-xs text-ink">
            <div>
              <h3 className="font-serif text-base font-semibold text-ink">Meta Cloud API Setup</h3>
              <p className="text-xs text-ink-muted mt-0.5">
                Connect a production or test number from the Meta Developer Console:
              </p>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 space-y-4">
              <div>
                <label className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                  Callback URL
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-paper border border-border p-2.5 font-mono text-ink">
                    {window.location.origin}/webhooks/whatsapp
                  </code>
                  <Button
                    variant="secondary"
                    className="text-xs shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText(`${window.location.origin}/webhooks/whatsapp`);
                      alert('Copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-semibold text-ink-muted uppercase tracking-wider">
                  Verify Token
                </label>
                <div className="mt-1.5 flex items-center gap-2">
                  <code className="flex-1 rounded-md bg-paper border border-border p-2.5 font-mono text-ink">
                    impactai_meta_webhook_secret_2025
                  </code>
                  <Button
                    variant="secondary"
                    className="text-xs shrink-0"
                    onClick={() => {
                      navigator.clipboard.writeText('impactai_meta_webhook_secret_2025');
                      alert('Copied!');
                    }}
                  >
                    Copy
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
