import { useState, useEffect } from 'react';
import type { Report, SocialShareKit } from '../../api/types';
import { reportsApi } from '../../api/reports';
import { Spinner } from '../Spinner';
import { Button } from '../Button';

interface SocialShareModalProps {
  report: Report;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SocialShareModal({ report, projectName, isOpen, onClose }: SocialShareModalProps) {
  const [activeTab, setActiveTab] = useState<'linkedin' | 'twitter' | 'instagram'>('linkedin');
  const [socialKit, setSocialKit] = useState<SocialShareKit | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) loadSocialKit();
  }, [isOpen, report.id]);

  async function loadSocialKit() {
    setLoading(true);
    try {
      const kit = await reportsApi.getSocialKit(report.id);
      setSocialKit(kit);
    } catch {
      setSocialKit({
        report_id: report.id,
        title: report.title,
        twitter_card_text: `Proud to share our verified impact evidence for ${projectName}. Backed by photo verification & AI analysis. #ImpactAI`,
        linkedin_post_text: `We are pleased to present our official impact report for ${projectName}: ${report.title}.\n\nKey Highlights:\n${report.highlights.map((h) => `• ${h}`).join('\n')}\n\nEvidence verified and securely stored via ImpactAI.`,
        instagram_caption: `Real change, verified evidence: ${report.title} for ${projectName}.\n\n${report.narrative || ''}\n\n#ImpactAI #Sustainability #ClimateAction`,
        hashtags: ['ImpactAI', 'Sustainability', 'VerifiedEvidence', 'ClimateAction'],
        suggested_stat_callouts: ['Verified Field Data', 'AI Documented', 'Transparent Impact'],
        shareable_url: window.location.href,
      });
    } finally {
      setLoading(false);
    }
  }

  function handleCopy(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopiedText(label);
    setTimeout(() => setCopiedText(null), 2000);
  }

  if (!isOpen) return null;

  const tabs: { key: 'linkedin' | 'twitter' | 'instagram'; label: string; color: string }[] = [
    { key: 'linkedin', label: 'LinkedIn', color: '#0077b5' },
    { key: 'twitter', label: 'X / Twitter', color: '#111111' },
    { key: 'instagram', label: 'Instagram', color: '#e1306c' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] max-h-[680px] w-full max-w-2xl flex-col rounded-xl bg-surface border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-shell px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-semibold text-white">Campaign &amp; Social Kit</h2>
              <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white/70 tracking-wide">
                Campaign-Ready
              </span>
            </div>
            <p className="text-[11px] text-shell-ink-muted mt-0.5">
              Distribute this verified report across donor channels and social media
            </p>
          </div>
          <button
            onClick={onClose}
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
                  ? 'font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
              style={activeTab === t.key ? { borderColor: t.color, color: t.color } : {}}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">
          {loading && <Spinner label="Generating social copy…" />}

          {!loading && socialKit && (
            <>
              {/* Stat Callouts */}
              {socialKit.suggested_stat_callouts?.length > 0 && (
                <div className="flex flex-wrap gap-2 pb-1">
                  {socialKit.suggested_stat_callouts.map((callout, idx) => (
                    <span
                      key={idx}
                      className="rounded-md bg-emerald-50 border border-emerald-200 px-2.5 py-1 text-[11px] font-semibold text-emerald-800"
                    >
                      {callout}
                    </span>
                  ))}
                </div>
              )}

              {/* LinkedIn */}
              {activeTab === 'linkedin' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Executive &amp; Donor Post
                    </p>
                    <button
                      onClick={() => handleCopy(socialKit.linkedin_post_text, 'linkedin')}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      style={{ background: copiedText === 'linkedin' ? '#15803d' : '#0077b5' }}
                    >
                      {copiedText === 'linkedin' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-border bg-paper p-4 text-xs text-ink whitespace-pre-line leading-relaxed">
                    {socialKit.linkedin_post_text}
                  </div>
                </div>
              )}

              {/* Twitter */}
              {activeTab === 'twitter' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Post · {socialKit.twitter_card_text.length} chars
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={`https://twitter.com/intent/tweet?text=${encodeURIComponent(socialKit.twitter_card_text)}`}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-md bg-black text-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-800 transition-colors"
                      >
                        Post now
                      </a>
                      <button
                        onClick={() => handleCopy(socialKit.twitter_card_text, 'twitter')}
                        className="rounded-md border border-border bg-surface px-3 py-1.5 text-xs font-semibold text-ink hover:border-clay transition-colors"
                      >
                        {copiedText === 'twitter' ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </div>
                  <div className="rounded-lg border border-border bg-paper p-4 text-xs text-ink whitespace-pre-line leading-relaxed">
                    {socialKit.twitter_card_text}
                  </div>
                </div>
              )}

              {/* Instagram */}
              {activeTab === 'instagram' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">
                      Caption &amp; Hashtag Kit
                    </p>
                    <button
                      onClick={() => handleCopy(socialKit.instagram_caption, 'instagram')}
                      className="rounded-md px-3 py-1.5 text-xs font-semibold text-white transition-colors"
                      style={{
                        background: copiedText === 'instagram'
                          ? '#15803d'
                          : 'linear-gradient(135deg, #f09433, #e6683c, #dc2743, #cc2366, #bc1888)',
                      }}
                    >
                      {copiedText === 'instagram' ? 'Copied' : 'Copy'}
                    </button>
                  </div>
                  <div className="rounded-lg border border-border bg-paper p-4 text-xs text-ink whitespace-pre-line leading-relaxed">
                    {socialKit.instagram_caption}
                  </div>
                </div>
              )}

              {/* Hashtag Row */}
              {socialKit.hashtags?.length > 0 && (
                <div className="pt-3 border-t border-border">
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-2">
                    Recommended hashtags
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {socialKit.hashtags.map((tag, i) => (
                      <span
                        key={i}
                        onClick={() => handleCopy(`#${tag}`, tag)}
                        className="cursor-pointer rounded-md bg-paper border border-border px-2 py-0.5 text-[11px] text-ink-muted hover:border-clay hover:text-clay transition-colors"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end border-t border-border bg-paper px-5 py-3">
          <Button variant="secondary" onClick={onClose}>Close</Button>
        </div>

      </div>
    </div>
  );
}
