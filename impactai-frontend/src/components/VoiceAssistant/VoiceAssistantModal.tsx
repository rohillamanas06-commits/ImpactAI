import { useState, useEffect, useRef } from 'react';
import { voiceApi } from '../../api/voice';
import type { VoiceQueryResponse } from '../../api/types';
import { useNavigate } from 'react-router-dom';
import { Button } from '../Button';
import { Badge } from '../Badge';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  actionType?: string;
  data?: any;
  timestamp: Date;
}

interface VoiceAssistantModalProps {
  isOpen: boolean;
  onClose: () => void;
  activeProjectId?: string;
}

export function VoiceAssistantModal({ isOpen, onClose, activeProjectId }: VoiceAssistantModalProps) {
  const navigate = useNavigate();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: 'Voice assistant ready. Ask about field evidence, compare before and after photos, check upload status, or generate reports.',
      timestamp: new Date(),
    },
  ]);
  const [transcript, setTranscript] = useState('');
  const [isListening, setIsListening] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(true);
  const [speechSupported, setSpeechSupported] = useState(true);
  const [activeTab, setActiveTab] = useState<'assistant' | 'tools'>('assistant');

  const recognitionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = 'en-US';
      recognition.onstart = () => setIsListening(true);
      recognition.onresult = (event: any) => {
        let t = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          t += event.results[i][0].transcript;
        }
        setTranscript(t);
      };
      recognition.onerror = () => setIsListening(false);
      recognition.onend = () => setIsListening(false);
      recognitionRef.current = recognition;
    } else {
      setSpeechSupported(false);
    }

    return () => {
      try { recognitionRef.current?.abort(); } catch {}
      window.speechSynthesis?.cancel();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isProcessing]);

  function speakText(text: string) {
    if (!voiceEnabled || !('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      u.rate = 1.0;
      u.pitch = 1.0;
      u.onstart = () => setIsSpeaking(true);
      u.onend = () => setIsSpeaking(false);
      u.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(u);
    } catch {}
  }

  function toggleListening() {
    if (!speechSupported) {
      alert('Speech Recognition is not supported in this browser. Please type below.');
      return;
    }
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
      if (transcript.trim()) handleSubmitQuery(transcript.trim());
    } else {
      window.speechSynthesis?.cancel();
      setIsSpeaking(false);
      setTranscript('');
      try { recognitionRef.current?.start(); } catch {}
    }
  }

  async function handleSubmitQuery(queryText: string) {
    if (!queryText.trim() || isProcessing) return;
    const userMsg: Message = {
      id: String(Date.now()),
      sender: 'user',
      text: queryText.trim(),
      timestamp: new Date(),
    };
    setMessages((p) => [...p, userMsg]);
    setTranscript('');
    setIsProcessing(true);
    try {
      const res: VoiceQueryResponse = await voiceApi.query(userMsg.text, activeProjectId);
      const assistantMsg: Message = {
        id: String(Date.now() + 1),
        sender: 'assistant',
        text: res.spoken_response,
        actionType: res.action_type,
        data: res.data,
        timestamp: new Date(),
      };
      setMessages((p) => [...p, assistantMsg]);
      speakText(res.spoken_response);
    } catch {
      setMessages((p) => [
        ...p,
        {
          id: String(Date.now() + 1),
          sender: 'assistant',
          text: 'Could not process query. Please verify backend connection.',
          timestamp: new Date(),
        },
      ]);
    } finally {
      setIsProcessing(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
      <div className="flex h-[80vh] max-h-[680px] w-full max-w-xl flex-col rounded-xl bg-surface border border-border shadow-2xl overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-border bg-shell px-5 py-3.5">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-serif text-base font-semibold text-white">Voice Assistant</h2>
              <span className="rounded-full bg-white/10 border border-white/20 px-2 py-0.5 text-[10px] font-medium text-white/70 tracking-wide">
                AI
              </span>
            </div>
            <p className="text-[11px] text-shell-ink-muted mt-0.5">
              Talk to your evidence · Natural language queries
            </p>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => { if (isSpeaking) window.speechSynthesis?.cancel(); setVoiceEnabled(!voiceEnabled); }}
              className="rounded-md px-2 py-1 text-[11px] text-white/60 hover:bg-white/10 hover:text-white transition-colors border border-white/10"
            >
              {voiceEnabled ? 'Audio on' : 'Audio off'}
            </button>
            <button
              type="button"
              onClick={() => { window.speechSynthesis?.cancel(); onClose(); }}
              aria-label="Close"
              className="rounded-md p-1.5 text-white/60 hover:bg-white/10 hover:text-white transition-colors"
            >
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-border bg-paper px-5 text-xs font-medium">
          {(['assistant', 'tools'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`-mb-px border-b-2 py-2.5 px-3 capitalize transition-colors ${
                activeTab === tab
                  ? 'border-clay text-clay font-semibold'
                  : 'border-transparent text-ink-muted hover:text-ink'
              }`}
            >
              {tab === 'assistant' ? 'Conversation' : 'Architecture'}
            </button>
          ))}
        </div>

        {/* Conversation Tab */}
        {activeTab === 'assistant' && (
          <div className="flex flex-1 flex-col overflow-hidden">

            {/* Messages */}
            <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className="flex flex-col max-w-[82%]">
                    <div
                      className={`rounded-xl px-3.5 py-2.5 text-sm leading-relaxed ${
                        m.sender === 'user'
                          ? 'bg-clay text-white rounded-br-sm'
                          : 'bg-paper border border-border text-ink rounded-bl-sm'
                      }`}
                    >
                      <p className="whitespace-pre-line">{m.text}</p>

                      {/* Search Results */}
                      {m.data?.results && m.data.results.length > 0 && (
                        <div className="mt-3 pt-2.5 border-t border-black/10 space-y-2">
                          <p className="text-[11px] font-semibold opacity-70">Matched evidence</p>
                          <div className="grid grid-cols-2 gap-1.5">
                            {m.data.results.slice(0, 4).map((r: any) => (
                              <div
                                key={r.id}
                                onClick={() => { onClose(); navigate(`/media/${r.id}`); }}
                                className="cursor-pointer rounded-lg border border-border bg-surface p-1.5 hover:border-clay transition-colors"
                              >
                                <img src={r.thumbnail_url} alt="" className="h-14 w-full rounded-md object-cover" />
                                <p className="mt-1 line-clamp-1 text-[11px] font-medium text-ink">{r.location || 'Field site'}</p>
                                <p className="line-clamp-1 text-[10px] text-ink-muted">{r.description}</p>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Comparison */}
                      {m.data?.comparison && (
                        <div className="mt-3 pt-2.5 border-t border-black/10">
                          <div className="mb-2"><Badge tone="moss">Before / After</Badge></div>
                          <div className="flex gap-2">
                            {m.data.comparison.before_url && (
                              <div className="flex-1">
                                <p className="mb-1 text-[10px] font-semibold opacity-60 uppercase tracking-wide">Before</p>
                                <img src={m.data.comparison.before_url} alt="Before" className="h-16 w-full rounded-lg object-cover" />
                              </div>
                            )}
                            {m.data.comparison.after_url && (
                              <div className="flex-1">
                                <p className="mb-1 text-[10px] font-semibold opacity-60 uppercase tracking-wide">After</p>
                                <img src={m.data.comparison.after_url} alt="After" className="h-16 w-full rounded-lg object-cover" />
                              </div>
                            )}
                          </div>
                          {activeProjectId && (
                            <button
                              onClick={() => { onClose(); navigate(`/projects/${activeProjectId}/compare`); }}
                              className="mt-2 text-[11px] font-semibold text-clay hover:underline"
                            >
                              Open comparison workspace
                            </button>
                          )}
                        </div>
                      )}

                      {/* Report */}
                      {m.data?.report && activeProjectId && (
                        <div className="mt-3 pt-2.5 border-t border-black/10">
                          <p className="text-[11px] font-semibold opacity-80">{m.data.report.title}</p>
                          <button
                            onClick={() => { onClose(); navigate(`/projects/${activeProjectId}/reports/${m.data.report.id}`); }}
                            className="mt-1 text-[11px] text-clay hover:underline font-semibold"
                          >
                            View impact report
                          </button>
                        </div>
                      )}
                    </div>

                    <span className="mt-1 text-[10px] text-ink-muted px-0.5">
                      {m.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              ))}

              {/* Typing Indicator */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-xl rounded-bl-sm bg-paper border border-border px-4 py-3">
                    <div className="flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '0ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '120ms' }} />
                      <span className="h-1.5 w-1.5 rounded-full bg-ink-muted animate-bounce" style={{ animationDelay: '240ms' }} />
                    </div>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts */}
            <div className="border-t border-border bg-paper px-5 py-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">Suggested</p>
              <div className="flex flex-wrap gap-1.5">
                {[
                  'Show photos from water project in Rajasthan',
                  'Compare before and after photos of the dam',
                  'Search plastic waste near riverbank',
                  'Upload status',
                ].map((p, i) => (
                  <button
                    key={i}
                    onClick={() => handleSubmitQuery(p)}
                    className="rounded-md border border-border bg-surface px-2 py-1 text-[11px] text-ink-muted hover:border-clay hover:text-clay transition-colors"
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Input Bar */}
            <div className="border-t border-border bg-surface px-5 py-3">
              {isListening && (
                <div className="mb-2 flex items-center gap-2 text-[11px] font-medium text-moss">
                  <span className="h-1.5 w-1.5 rounded-full bg-moss animate-pulse" />
                  Listening…
                  <span className="ml-auto text-ink-muted font-normal">Click mic to submit</span>
                </div>
              )}
              {isSpeaking && (
                <div className="mb-2 flex items-center justify-between text-[11px] text-ink-muted">
                  <span className="flex items-center gap-1.5">
                    <span className="h-1.5 w-1.5 rounded-full bg-clay animate-pulse" />
                    Speaking…
                  </span>
                  <button onClick={() => { window.speechSynthesis?.cancel(); setIsSpeaking(false); }} className="text-clay font-semibold hover:underline">Stop</button>
                </div>
              )}

              <form onSubmit={(e) => { e.preventDefault(); handleSubmitQuery(transcript); }} className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={toggleListening}
                  className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border-2 transition-all ${
                    isListening
                      ? 'border-clay bg-clay text-white'
                      : 'border-border-strong bg-surface text-ink-muted hover:border-clay hover:text-clay'
                  }`}
                  title={isListening ? 'Stop' : 'Speak'}
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                    />
                  </svg>
                </button>

                <input
                  type="text"
                  value={transcript}
                  onChange={(e) => setTranscript(e.target.value)}
                  placeholder={isListening ? 'Listening…' : 'Speak or type a question…'}
                  className="flex-1 rounded-lg border border-border-strong bg-paper px-3 py-2 text-sm text-ink placeholder:text-ink-muted focus:border-clay focus:outline-none focus:ring-2 focus:ring-clay/15 transition-all"
                />

                <Button type="submit" disabled={!transcript.trim() || isProcessing} className="text-xs h-9">
                  Send
                </Button>
              </form>
            </div>
          </div>
        )}

        {/* Architecture Tab */}
        {activeTab === 'tools' && (
          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 text-sm">

            <div className="rounded-lg border border-border bg-paper p-4">
              <h3 className="text-sm font-semibold text-ink mb-1">Pipeline</h3>
              <p className="text-xs text-ink-muted leading-relaxed mb-3">
                Natural language queries are interpreted by Gemini and routed to the matching platform API:
              </p>
              <div className="rounded-md border border-border bg-surface p-3 font-mono text-xs text-ink space-y-1.5">
                <p><span className="text-ink-muted">1.</span> Audio: Web Speech API / Vapi SDK</p>
                <p><span className="text-ink-muted">2.</span> Intent: Gemini Flash (search · compare · report · status)</p>
                <p><span className="text-ink-muted">3.</span> Execute: /search · /compare · /reports</p>
                <p><span className="text-ink-muted">4.</span> Reply: Speech Synthesis + structured card</p>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-surface p-4 space-y-3">
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider">Vapi Webhook</h4>
              <p className="text-xs text-ink-muted">Endpoint for Vapi function calling:</p>
              <code className="block rounded-md bg-paper border border-border p-2.5 font-mono text-xs text-clay">
                POST /api/v1/voice/vapi-webhook
              </code>
              <div className="space-y-1 pt-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-muted mb-1.5">Registered tools</p>
                {['search_evidence', 'get_project_summary', 'compare_media', 'generate_impact_report'].map((t) => (
                  <div key={t} className="flex items-center gap-2 text-xs text-ink">
                    <span className="h-1 w-1 rounded-full bg-clay shrink-0" />
                    <code className="font-mono">{t}</code>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-border bg-paper p-4">
              <h4 className="text-xs font-semibold text-ink uppercase tracking-wider mb-3">Sample commands</h4>
              <div className="space-y-1.5">
                {[
                  ['search', '"Show me all photos from the water project in Rajasthan"'],
                  ['compare', '"Compare before and after photos of the dam"'],
                  ['report', '"Generate impact report for this project"'],
                  ['status', '"What is my upload status?"'],
                ].map(([intent, cmd]) => (
                  <div key={intent} className="flex items-start gap-2.5 rounded-md bg-surface border border-border px-3 py-2">
                    <span className="mt-0.5 shrink-0 rounded bg-clay-soft border border-clay/20 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-clay">
                      {intent}
                    </span>
                    <p className="text-[11px] text-ink-muted italic">{cmd}</p>
                  </div>
                ))}
              </div>
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
