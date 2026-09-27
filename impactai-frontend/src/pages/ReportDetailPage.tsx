import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { reportsApi } from '../api/reports';
import { useAsync } from '../hooks/useAsync';
import { useProjectContext } from '../hooks/useProjectContext';
import { Badge } from '../components/Badge';
import { StatCard } from '../components/StatCard';
import { Button } from '../components/Button';
import { Spinner } from '../components/Spinner';
import { ErrorBanner } from '../components/ErrorBanner';
import { formatDate, formatDateTime } from '../utils/format';
import { SocialShareModal } from '../components/Reports/SocialShareModal';
import jsPDF from 'jspdf';

export function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>();
  const navigate = useNavigate();
  const { project } = useProjectContext();
  const { data: report, loading, error } = useAsync(() => reportsApi.get(reportId!), [reportId]);
  const [deleting, setDeleting] = useState(false);
  const [showShareModal, setShowShareModal] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);

  function handleClientPdfExport() {
    if (!report) return;
    setIsExportingPdf(true);
    try {
      const doc = new jsPDF();
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.setTextColor(6, 78, 59); // deep emerald
      doc.text('ImpactAI — Verified Field Impact Report', 14, 20);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(12);
      doc.setTextColor(33, 38, 31);
      doc.text(report.title, 14, 30);
      doc.setFontSize(9);
      doc.setTextColor(100, 116, 139);
      doc.text(`Project: ${project.name} | Generated: ${report.created_at.slice(0, 10)}`, 14, 36);

      doc.setDrawColor(13, 148, 136);
      doc.setLineWidth(0.5);
      doc.line(14, 40, 196, 40);

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(6, 78, 59);
      doc.text('Executive Summary', 14, 48);

      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9.5);
      doc.setTextColor(33, 38, 31);
      const splitNarrative = doc.splitTextToSize(report.narrative || 'Impact verified.', 180);
      doc.text(splitNarrative, 14, 55);

      let currentY = 55 + splitNarrative.length * 5 + 10;

      if (report.highlights && report.highlights.length > 0) {
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(11);
        doc.setTextColor(6, 78, 59);
        doc.text('Key Verified Highlights', 14, currentY);
        currentY += 6;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        doc.setTextColor(33, 38, 31);
        report.highlights.forEach((h) => {
          const splitH = doc.splitTextToSize(`• ${h}`, 175);
          doc.text(splitH, 16, currentY);
          currentY += splitH.length * 4.5 + 2;
        });
      }

      currentY += 8;
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text('Cryptographically verified on Cloudinary & Gemini AI by ImpactAI platform.', 14, currentY);

      doc.save(`${report.title.replace(/\s+/g, '_')}_ImpactReport.pdf`);
    } catch (e) {
      console.warn('jsPDF fallback failed:', e);
    } finally {
      setIsExportingPdf(false);
    }
  }

  async function handleDelete() {
    if (!report || !window.confirm(`Are you sure you want to delete "${report.title}"?`)) return;
    setDeleting(true);
    try {
      await reportsApi.remove(report.id);
      navigate(`/projects/${project.id}/reports`);
    } catch {
      alert('Could not delete report.');
      setDeleting(false);
    }
  }

  if (loading) return <Spinner label="Loading report…" />;
  if (error) return <ErrorBanner message={error} />;
  if (!report) return null;

  const { stats } = report;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <Link to={`/projects/${project.id}/reports`} className="text-xs text-ink-muted hover:text-clay">
            ← All reports
          </Link>
          <h1 className="mt-1 font-serif text-2xl text-ink">{report.title}</h1>
          <p className="mt-1 text-xs text-ink-muted">
            Generated {formatDateTime(report.created_at)}
            {report.period_start && report.period_end
              ? ` · covering ${formatDate(report.period_start)} – ${formatDate(report.period_end)}`
              : ''}
          </p>
        </div>

        {/* Action Buttons: PDF Export & Social Share */}
        <div className="flex items-center gap-2">
          {/* Executive ReportLab PDF (Backend) */}
          <a
            href={reportsApi.getPdfUrl(report.id)}
            download
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-700 px-3 py-1.5 text-xs font-semibold text-white hover:bg-emerald-800 shadow-xs transition-colors"
          >
            Download Executive PDF
          </a>

          {/* Client-side Quick PDF */}
          <Button
            variant="secondary"
            onClick={handleClientPdfExport}
            disabled={isExportingPdf}
            className="text-xs"
          >
            {isExportingPdf ? 'Exporting…' : 'Quick PDF'}
          </Button>

          {/* Social Share & Campaign Kit */}
          <Button
            variant="secondary"
            onClick={() => setShowShareModal(true)}
            className="text-xs"
          >
            Campaign Kit
          </Button>


          <Button variant="danger" onClick={handleDelete} disabled={deleting} className="text-xs">
            {deleting ? 'Deleting…' : 'Delete'}
          </Button>
        </div>
      </div>



      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {stats.total_media !== undefined && <StatCard label="Total media" value={stats.total_media} />}
        {stats.images !== undefined && <StatCard label="Images" value={stats.images} />}
        {stats.videos !== undefined && <StatCard label="Videos" value={stats.videos} />}
        {stats.locations && <StatCard label="Locations" value={stats.locations.length} />}
      </div>

      <div className="rounded-lg border border-border bg-surface p-5">
        <p className="font-serif text-lg leading-relaxed text-ink">{report.narrative}</p>
      </div>

      {report.highlights.length > 0 && (
        <div>
          <h2 className="mb-2 font-serif text-lg text-ink">Highlights</h2>
          <ul className="list-disc space-y-1 pl-5 text-sm text-ink-muted">
            {report.highlights.map((h, i) => (
              <li key={i}>{h}</li>
            ))}
          </ul>
        </div>
      )}

      {stats.top_tags && stats.top_tags.length > 0 && (
        <div>
          <h2 className="mb-2 font-serif text-lg text-ink">Most common tags</h2>
          <div className="flex flex-wrap gap-1.5">
            {stats.top_tags.map((t) => (
              <Badge key={t} tone="moss">
                {t}
              </Badge>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="mb-2 font-serif text-lg text-ink">Source evidence ({report.source_media_ids.length})</h2>
        <p className="mb-2 text-xs text-ink-muted">
          Every number and claim above is drawn only from this evidence — nothing here was invented.
        </p>
        <div className="flex flex-wrap gap-2">
          {report.source_media_ids.map((id) => (
            <Link
              key={id}
              to={`/media/${id}`}
              className="rounded border border-border-strong px-2 py-1 text-xs text-ink-muted hover:border-clay hover:text-clay"
            >
              {id.slice(0, 8)}…
            </Link>
          ))}
        </div>
      </div>

      <SocialShareModal
        report={report}
        projectName={project.name}
        isOpen={showShareModal}
        onClose={() => setShowShareModal(false)}
      />
    </div>
  );
}

