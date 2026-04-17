import { Platform } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';

export interface ExpertCertificateData {
  id: string;
  type: string;
  name: string;
  description: string;
  estimatedValueMin: number;
  estimatedValueMax: number;
  currency: string;
  confidenceScore: number;
  historicalInfo: string;
  originCountry: string;
  originYear: string;
  condition: string;
  rarity: string;
  keyFacts: string[];
  imageUrl: string;
  createdAt: string;
}

interface CertificateExportResult {
  mode: 'shared' | 'printed' | 'saved';
  uri?: string;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return 'Date indisponible';
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'long',
    timeStyle: 'short',
  }).format(date);
}

function formatCurrencyRange(min: number, max: number, currency: string): string {
  const formatter = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: currency || 'EUR',
    maximumFractionDigits: 2,
  });

  return `${formatter.format(min || 0)} - ${formatter.format(max || 0)}`;
}

function formatPercent(value: number): string {
  return `${Math.round((value || 0) * 100)}%`;
}

function normalizeText(value: string, fallback: string): string {
  const trimmed = value?.trim();
  return trimmed ? trimmed : fallback;
}

function buildFactsMarkup(facts: string[]): string {
  if (!facts.length) {
    return '<li>Aucun point complementaire fourni par l analyse.</li>';
  }

  return facts.map((fact) => `<li>${escapeHtml(fact)}</li>`).join('');
}

function buildCertificateHtml(data: ExpertCertificateData): string {
  const scanDate = formatDate(data.createdAt);
  const generationDate = formatDate(new Date().toISOString());
  const certificateNumber = `CERT-${data.id.slice(0, 8).toUpperCase()}`;
  const estimate = formatCurrencyRange(data.estimatedValueMin, data.estimatedValueMax, data.currency);
  const objectType = normalizeText(data.type, 'objet de collection');
  const description = normalizeText(data.description, 'Description non disponible.');
  const history = normalizeText(data.historicalInfo, 'Historique indisponible pour cet objet.');
  const originCountry = normalizeText(data.originCountry, 'Non precise');
  const originYear = normalizeText(data.originYear, 'Periode non precise');
  const condition = normalizeText(data.condition, 'A determiner');
  const rarity = normalizeText(data.rarity, 'Non renseignee');
  const imageSection = data.imageUrl
    ? `<div class="hero-image-wrap"><img class="hero-image" src="${escapeHtml(data.imageUrl)}" alt="Photo de l objet analyse" /></div>`
    : '<div class="hero-image-wrap hero-image-fallback"><span>Photo non disponible</span></div>';

  return `
    <!DOCTYPE html>
    <html lang="fr">
      <head>
        <meta charset="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Certificat d expertise</title>
        <style>
          :root {
            --ink: #161826;
            --gold: #c8973a;
            --gold-soft: #f3e2bb;
            --navy: #1a1a2e;
            --paper: #fcfaf4;
            --muted: #5d6074;
            --line: rgba(22, 24, 38, 0.12);
            --success: #2d9b6f;
          }

          * {
            box-sizing: border-box;
          }

          body {
            margin: 0;
            font-family: Arial, Helvetica, sans-serif;
            color: var(--ink);
            background: #ece7da;
          }

          .page {
            width: 100%;
            padding: 28px;
          }

          .certificate {
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(252,250,244,1));
            border: 1px solid rgba(200, 151, 58, 0.4);
            border-radius: 28px;
            overflow: hidden;
            box-shadow: 0 24px 80px rgba(26, 26, 46, 0.08);
          }

          .topbar {
            padding: 22px 28px;
            background: linear-gradient(135deg, #101222 0%, #1a1a2e 55%, #2d2d4e 100%);
            color: #fff;
          }

          .topbar-grid {
            display: table;
            width: 100%;
          }

          .topbar-left,
          .topbar-right {
            display: table-cell;
            vertical-align: top;
          }

          .topbar-right {
            text-align: right;
          }

          .eyebrow {
            font-size: 11px;
            letter-spacing: 2px;
            text-transform: uppercase;
            color: #f3e2bb;
            margin-bottom: 8px;
          }

          .title {
            font-size: 30px;
            font-weight: 700;
            line-height: 1.15;
            margin: 0 0 6px;
          }

          .subtitle {
            margin: 0;
            font-size: 13px;
            line-height: 1.6;
            color: rgba(255, 255, 255, 0.78);
            max-width: 460px;
          }

          .badge {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            border: 1px solid rgba(255,255,255,0.18);
            background: rgba(255,255,255,0.08);
            margin-bottom: 10px;
          }

          .topbar-meta {
            font-size: 12px;
            line-height: 1.7;
            color: rgba(255,255,255,0.82);
          }

          .content {
            padding: 28px;
          }

          .hero {
            display: table;
            width: 100%;
            margin-bottom: 24px;
          }

          .hero-visual,
          .hero-summary {
            display: table-cell;
            vertical-align: top;
          }

          .hero-visual {
            width: 42%;
            padding-right: 22px;
          }

          .hero-summary {
            width: 58%;
          }

          .hero-image-wrap {
            width: 100%;
            min-height: 270px;
            border-radius: 22px;
            background: linear-gradient(180deg, rgba(200,151,58,0.18), rgba(26,26,46,0.05));
            border: 1px solid rgba(200,151,58,0.32);
            overflow: hidden;
          }

          .hero-image {
            display: block;
            width: 100%;
            height: 270px;
            object-fit: cover;
          }

          .hero-image-fallback {
            text-align: center;
            padding-top: 120px;
            color: var(--muted);
            font-size: 14px;
          }

          .object-type {
            display: inline-block;
            margin-bottom: 10px;
            padding: 6px 12px;
            border-radius: 999px;
            background: var(--gold-soft);
            color: #7b5608;
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
          }

          .object-name {
            margin: 0 0 12px;
            font-size: 28px;
            line-height: 1.2;
          }

          .lede {
            margin: 0 0 18px;
            color: var(--muted);
            font-size: 14px;
            line-height: 1.7;
          }

          .kpi-grid {
            display: table;
            width: 100%;
            border-spacing: 0 10px;
            margin-bottom: 10px;
          }

          .kpi-row {
            display: table-row;
          }

          .kpi {
            display: table-cell;
            width: 50%;
            padding-right: 10px;
          }

          .kpi-card {
            background: #fff;
            border: 1px solid var(--line);
            border-radius: 18px;
            padding: 14px 16px;
          }

          .kpi-label {
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 1.2px;
            color: var(--muted);
            margin-bottom: 6px;
          }

          .kpi-value {
            font-size: 18px;
            font-weight: 700;
            color: var(--navy);
          }

          .section {
            margin-top: 18px;
            border-top: 1px solid var(--line);
            padding-top: 18px;
          }

          .section-title {
            margin: 0 0 12px;
            font-size: 13px;
            text-transform: uppercase;
            letter-spacing: 1.5px;
            color: var(--navy);
          }

          .details-table {
            width: 100%;
            border-collapse: collapse;
          }

          .details-table td {
            padding: 10px 0;
            border-bottom: 1px solid var(--line);
            vertical-align: top;
            font-size: 14px;
          }

          .details-table td:first-child {
            width: 42%;
            color: var(--muted);
          }

          .details-table td:last-child {
            font-weight: 600;
          }

          .narrative {
            font-size: 14px;
            line-height: 1.8;
            color: #26283b;
            margin: 0;
          }

          .facts {
            margin: 0;
            padding-left: 18px;
            color: #26283b;
          }

          .facts li {
            margin-bottom: 8px;
            line-height: 1.6;
          }

          .validation {
            margin-top: 22px;
            padding: 20px 0 2px;
            border-top: 1px solid var(--line);
          }

          .validation-grid {
            display: table;
            width: 100%;
          }

          .validation-seal,
          .validation-signature {
            display: table-cell;
            vertical-align: middle;
          }

          .validation-seal {
            width: 36%;
          }

          .validation-signature {
            width: 64%;
            padding-left: 16px;
          }

          .rosette {
            position: relative;
            width: 146px;
            height: 146px;
            border-radius: 50%;
            background:
              radial-gradient(circle at center, rgba(255,255,255,0.95) 0 26%, transparent 26.5%),
              repeating-conic-gradient(from 0deg, rgba(200,151,58,0.95) 0deg 9deg, rgba(243,226,187,0.95) 9deg 18deg);
            border: 3px solid rgba(200,151,58,0.75);
            box-shadow: inset 0 0 0 9px rgba(255,255,255,0.75), 0 10px 24px rgba(26,26,46,0.12);
          }

          .rosette::before,
          .rosette::after {
            content: '';
            position: absolute;
            bottom: -28px;
            width: 34px;
            height: 42px;
            background: linear-gradient(180deg, #d8ad58 0%, #b98424 100%);
            clip-path: polygon(0 0, 100% 0, 100% 72%, 50% 100%, 0 72%);
          }

          .rosette::before {
            left: 36px;
            transform: rotate(-8deg);
          }

          .rosette::after {
            right: 36px;
            transform: rotate(8deg);
          }

          .rosette-inner {
            position: absolute;
            inset: 18px;
            border-radius: 50%;
            border: 2px solid rgba(123,86,8,0.22);
            background: radial-gradient(circle at 50% 35%, #fffef7 0%, #f7ecd0 72%, #efd59a 100%);
            text-align: center;
            padding: 28px 14px 0;
            color: #7b5608;
          }

          .rosette-kicker {
            font-size: 9px;
            letter-spacing: 1.4px;
            text-transform: uppercase;
            font-weight: 700;
            margin-bottom: 6px;
          }

          .rosette-title {
            font-size: 15px;
            line-height: 1.15;
            font-weight: 700;
            text-transform: uppercase;
          }

          .rosette-meta {
            margin-top: 7px;
            font-size: 10px;
            line-height: 1.45;
            letter-spacing: 0.2px;
          }

          .signature-card {
            background: linear-gradient(180deg, rgba(255,255,255,0.98), rgba(248,244,231,0.98));
            border: 1px solid rgba(200,151,58,0.28);
            border-radius: 20px;
            padding: 18px 20px;
          }

          .signature-kicker {
            font-size: 11px;
            letter-spacing: 1.3px;
            text-transform: uppercase;
            color: var(--muted);
            margin-bottom: 8px;
          }

          .signature-script {
            font-family: "Brush Script MT", "Segoe Script", cursive;
            font-size: 34px;
            line-height: 1;
            color: #7b5608;
            margin: 0 0 8px;
          }

          .signature-line {
            width: 100%;
            height: 1px;
            background: rgba(22,24,38,0.18);
            margin: 10px 0 8px;
          }

          .signature-name {
            font-size: 14px;
            font-weight: 700;
            color: var(--navy);
          }

          .signature-role {
            margin-top: 4px;
            font-size: 12px;
            color: var(--muted);
            line-height: 1.6;
          }

          .footer {
            margin-top: 24px;
            padding: 18px 28px 26px;
            background: rgba(26, 26, 46, 0.03);
            border-top: 1px solid rgba(26, 26, 46, 0.06);
          }

          .footer-grid {
            display: table;
            width: 100%;
          }

          .footer-left,
          .footer-right {
            display: table-cell;
            vertical-align: top;
          }

          .footer-right {
            text-align: right;
          }

          .seal {
            display: inline-block;
            padding: 8px 14px;
            border-radius: 999px;
            background: rgba(45, 155, 111, 0.12);
            border: 1px solid rgba(45, 155, 111, 0.28);
            color: var(--success);
            font-size: 11px;
            font-weight: 700;
            letter-spacing: 1.2px;
            text-transform: uppercase;
          }

          .fineprint {
            margin-top: 10px;
            color: var(--muted);
            font-size: 11px;
            line-height: 1.7;
          }
        </style>
      </head>
      <body>
        <div class="page">
          <div class="certificate">
            <div class="topbar">
              <div class="topbar-grid">
                <div class="topbar-left">
                  <div class="eyebrow">StampScan Expert</div>
                  <h1 class="title">Certificat d expertise</h1>
                  <p class="subtitle">
                    Attestation numerique generee a partir d une analyse IA specialisee pour objet de collection rare.
                  </p>
                </div>
                <div class="topbar-right">
                  <div class="badge">${escapeHtml(certificateNumber)}</div>
                  <div class="topbar-meta">
                    Scan effectue le ${escapeHtml(scanDate)}<br />
                    Certificat genere le ${escapeHtml(generationDate)}
                  </div>
                </div>
              </div>
            </div>

            <div class="content">
              <div class="hero">
                <div class="hero-visual">
                  ${imageSection}
                </div>
                <div class="hero-summary">
                  <div class="object-type">${escapeHtml(objectType)}</div>
                  <h2 class="object-name">${escapeHtml(data.name)}</h2>
                  <p class="lede">${escapeHtml(description)}</p>

                  <div class="kpi-grid">
                    <div class="kpi-row">
                      <div class="kpi">
                        <div class="kpi-card">
                          <div class="kpi-label">Estimation de marche</div>
                          <div class="kpi-value">${escapeHtml(estimate)}</div>
                        </div>
                      </div>
                      <div class="kpi">
                        <div class="kpi-card">
                          <div class="kpi-label">Indice de confiance</div>
                          <div class="kpi-value">${escapeHtml(formatPercent(data.confidenceScore))}</div>
                        </div>
                      </div>
                    </div>
                  </div>

                  <table class="details-table">
                    <tr>
                      <td>Pays d origine</td>
                      <td>${escapeHtml(originCountry)}</td>
                    </tr>
                    <tr>
                      <td>Annee ou periode</td>
                      <td>${escapeHtml(originYear)}</td>
                    </tr>
                    <tr>
                      <td>Etat observe</td>
                      <td>${escapeHtml(condition)}</td>
                    </tr>
                    <tr>
                      <td>Niveau de rarete</td>
                      <td>${escapeHtml(rarity)}</td>
                    </tr>
                  </table>
                </div>
              </div>

              <div class="section">
                <h3 class="section-title">Analyse historique</h3>
                <p class="narrative">${escapeHtml(history)}</p>
              </div>

              <div class="section">
                <h3 class="section-title">Points techniques et observations IA</h3>
                <ul class="facts">${buildFactsMarkup(data.keyFacts || [])}</ul>
              </div>

              <div class="validation">
                <div class="validation-grid">
                  <div class="validation-seal">
                    <div class="rosette">
                      <div class="rosette-inner">
                        <div class="rosette-kicker">Sceau officiel</div>
                        <div class="rosette-title">Expertise validee</div>
                        <div class="rosette-meta">${escapeHtml(certificateNumber)}<br />StampScan Expert</div>
                      </div>
                    </div>
                  </div>
                  <div class="validation-signature">
                    <div class="signature-card">
                      <div class="signature-kicker">Visa d expertise</div>
                      <div class="signature-script">Cellule Expert Signature</div>
                      <div class="signature-line"></div>
                      <div class="signature-name">Bureau d expertise StampScan</div>
                      <div class="signature-role">
                        Certification visuelle emise pour ${escapeHtml(data.name)}<br />
                        Dossier archive sous la reference ${escapeHtml(data.id)}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div class="footer">
              <div class="footer-grid">
                <div class="footer-left">
                  <div class="seal">Expertise IA certifiee</div>
                  <div class="fineprint">
                    Ce document constitue une synthese d expertise basee sur la photo fournie, les metadonnees du scan et une estimation algorithmique du marche de collection.
                  </div>
                </div>
                <div class="footer-right">
                  <div class="fineprint">
                    Reference objet : ${escapeHtml(data.id)}<br />
                    Emis par StampScan Expert
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </body>
    </html>
  `;
}

export async function generateExpertCertificate(data: ExpertCertificateData): Promise<CertificateExportResult> {
  const html = buildCertificateHtml(data);

  if (Platform.OS === 'web') {
    await Print.printAsync({ html });
    return { mode: 'printed' };
  }

  const { uri } = await Print.printToFileAsync({ html });

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/pdf',
      dialogTitle: `Certificat d expertise - ${data.name}`,
      UTI: 'com.adobe.pdf',
    });

    return { mode: 'shared', uri };
  }

  return { mode: 'saved', uri };
}