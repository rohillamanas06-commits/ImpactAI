"""
PDF generation service using ReportLab.
Produces a beautiful, publication-ready executive impact report with
metadata, impact KPI metrics, AI analysis narrative, key highlights,
and evidence photo documentation.
"""
import io
import logging
from typing import Any, Dict, List, Optional
import httpx

from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.platypus import (
    HRFlowable,
    Image as RLImage,
    KeepTogether,
    Paragraph,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

logger = logging.getLogger("impactai.pdf")


def build_pdf_report(
    report_title: str,
    project_name: str,
    period_start: Optional[str],
    period_end: Optional[str],
    stats: Dict[str, Any],
    narrative: Optional[str],
    highlights: List[str],
    image_thumbnails: Optional[List[dict]] = None,
) -> bytes:
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer,
        pagesize=letter,
        rightMargin=36,
        leftMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Color Palette: Deep Slate, Forest Emerald, Clay Teal
    PRIMARY = colors.HexColor("#064e3b")      # Deep Emerald
    SECONDARY = colors.HexColor("#0d9488")    # Teal
    ACCENT = colors.HexColor("#f59e0b")       # Amber
    DARK_TEXT = colors.HexColor("#0f172a")    # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")   # Slate 600
    LIGHT_BG = colors.HexColor("#f8fafc")     # Slate 50
    CARD_BG = colors.HexColor("#f0fdf4")      # Emerald 50

    title_style = ParagraphStyle(
        "ReportTitle",
        parent=styles["Heading1"],
        fontName="Helvetica-Bold",
        fontSize=22,
        leading=26,
        textColor=PRIMARY,
        spaceAfter=4,
    )

    subtitle_style = ParagraphStyle(
        "ReportSubtitle",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=11,
        leading=15,
        textColor=MUTED_TEXT,
        spaceAfter=12,
    )

    heading2_style = ParagraphStyle(
        "Heading2",
        parent=styles["Heading2"],
        fontName="Helvetica-Bold",
        fontSize=13,
        leading=17,
        textColor=PRIMARY,
        spaceBefore=12,
        spaceAfter=6,
    )

    body_style = ParagraphStyle(
        "ReportBody",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9.5,
        leading=14,
        textColor=DARK_TEXT,
    )

    bullet_style = ParagraphStyle(
        "BulletPoint",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=9,
        leading=13,
        textColor=DARK_TEXT,
        leftIndent=12,
    )

    story = []

    # 1. Header Banner
    header_data = [
        [
            Paragraph("<b>ImpactAI</b> | Verified Field Evidence", subtitle_style),
            Paragraph("Official Donor & Stakeholder Report", ParagraphStyle("Right", parent=subtitle_style, alignment=2)),
        ]
    ]
    t_header = Table(header_data, colWidths=[270, 270])
    t_header.setStyle(TableStyle([
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 0),
    ]))
    story.append(t_header)
    story.append(HRFlowable(width="100%", thickness=1.5, color=SECONDARY, spaceBefore=4, spaceAfter=14))

    # 2. Main Title & Project Meta
    story.append(Paragraph(report_title, title_style))
    timeframe = f"Period: {period_start or 'Inception'} to {period_end or 'Present'}"
    story.append(Paragraph(f"<b>Project:</b> {project_name} &nbsp;&nbsp;|&nbsp;&nbsp; <b>{timeframe}</b>", subtitle_style))
    story.append(Spacer(1, 8))

    # 3. KPI Stat Grid
    total_media = stats.get("total_media", 0)
    images_count = stats.get("images", 0)
    videos_count = stats.get("videos", 0)
    locations_list = stats.get("locations", [])
    activities_list = stats.get("activities", [])

    kpi_data = [
        [
            Paragraph(f"<b><font size=14 color='#064e3b'>{total_media}</font></b><br/><font size=8 color='#475569'>Verified Media</font>", body_style),
            Paragraph(f"<b><font size=14 color='#0d9488'>{images_count}</font></b><br/><font size=8 color='#475569'>Photographs</font>", body_style),
            Paragraph(f"<b><font size=14 color='#f59e0b'>{videos_count}</font></b><br/><font size=8 color='#475569'>Video Clips</font>", body_style),
            Paragraph(f"<b><font size=14 color='#064e3b'>{len(locations_list)}</font></b><br/><font size=8 color='#475569'>Field Sites</font>", body_style),
            Paragraph(f"<b><font size=14 color='#0d9488'>{len(activities_list)}</font></b><br/><font size=8 color='#475569'>Tracked Activities</font>", body_style),
        ]
    ]
    t_kpi = Table(kpi_data, colWidths=[108, 108, 108, 108, 108])
    t_kpi.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), CARD_BG),
        ("BOX", (0, 0), (-1, -1), 0.75, colors.HexColor("#bbf7d0")),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("ALIGN", (0, 0), (-1, -1), "CENTER"),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
    ]))
    story.append(t_kpi)
    story.append(Spacer(1, 14))

    # 4. Executive Impact Narrative
    story.append(Paragraph("Executive Summary & AI Observations", heading2_style))
    narrative_text = narrative or "No narrative analysis generated."
    narrative_p = Paragraph(f"<i>\"{narrative_text}\"</i>", body_style)

    box_data = [[narrative_p]]
    t_narrative = Table(box_data, colWidths=[540])
    t_narrative.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), LIGHT_BG),
        ("LINELEFT", (0, 0), (0, -1), 3, SECONDARY),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 8),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
        ("LEFTPADDING", (0, 0), (-1, -1), 12),
        ("RIGHTPADDING", (0, 0), (-1, -1), 12),
    ]))
    story.append(t_narrative)
    story.append(Spacer(1, 14))

    # 5. Key Highlights
    if highlights:
        story.append(Paragraph("Verified Key Highlights", heading2_style))
        for h in highlights:
            story.append(Paragraph(f"• <b>{h}</b>", bullet_style))
            story.append(Spacer(1, 3))
        story.append(Spacer(1, 10))

    # 6. Environmental Signals & Top Tags
    top_tags = stats.get("top_tags", [])
    if top_tags:
        tags_str = " &nbsp;•&nbsp; ".join([f"#{t}" for t in top_tags[:12]])
        story.append(Paragraph("Observed Environmental & Activity Tags", heading2_style))
        story.append(Paragraph(f"<font color='#0d9488'>{tags_str}</font>", body_style))
        story.append(Spacer(1, 12))

    # 7. Evidence Photo Gallery (if provided)
    if image_thumbnails:
        story.append(Paragraph("Photographic Evidence Samples", heading2_style))
        photo_cells = []
        for item in image_thumbnails[:4]:
            caption = item.get("caption") or item.get("location") or "Evidence asset"
            cap_para = Paragraph(f"<font size=8 color='#475569'>{caption[:45]}</font>", body_style)
            # Fetch image bytes if URL provided
            img_flowable = None
            url = item.get("url")
            if url:
                try:
                    resp = httpx.get(url, timeout=5.0)
                    if resp.status_code == 200:
                        img_data = io.BytesIO(resp.content)
                        img_flowable = RLImage(img_data, width=120, height=85)
                except Exception as exc:
                    logger.debug(f"Could not load thumbnail for PDF: {exc}")

            cell_content = [img_flowable or Paragraph("[Photo Evidence]", body_style), Spacer(1, 2), cap_para]
            photo_cells.append(cell_content)

        if photo_cells:
            # 2x2 grid or 4 columns
            row1 = photo_cells[:2]
            while len(row1) < 2:
                row1.append([Paragraph("", body_style)])
            t_photos = Table([row1], colWidths=[265, 265])
            t_photos.setStyle(TableStyle([
                ("ALIGN", (0, 0), (-1, -1), "CENTER"),
                ("VALIGN", (0, 0), (-1, -1), "TOP"),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(KeepTogether(t_photos))
            story.append(Spacer(1, 10))

    # 8. Footer & Verification Seal
    story.append(Spacer(1, 10))
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#cbd5e1"), spaceBefore=4, spaceAfter=8))
    footer_text = (
        "<b>ImpactAI Cryptographic Traceability Guarantee:</b> Every media item in this report is anchored to Cloudinary "
        "immutable secure storage with SHA-verified timestamps and multi-modal AI feature embeddings. "
        "Generated automatically for NGO stakeholders & donor audits."
    )
    story.append(Paragraph(footer_text, ParagraphStyle("Footer", parent=styles["Normal"], fontName="Helvetica", fontSize=7.5, leading=10, textColor=MUTED_TEXT)))

    doc.build(story)
    return buffer.getvalue()
