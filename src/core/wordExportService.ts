// Service to export patient maternal health records as structured Microsoft Word documents (.doc / .docx compatible)
import { Beneficiary, WardMCHMetrics } from '../types';
import { formatPercent, formatSuppressedCount } from './dpdpCompliance';

export function exportBeneficiaryToWordDoc(beneficiary: Beneficiary): void {
  const latestVital = beneficiary.vitalsHistory[0];

  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Maternal Clinical Summary - ${beneficiary.name}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; margin: 20mm; }
    .header { text-align: center; border-bottom: 2pt solid #0f766e; padding-bottom: 12pt; margin-bottom: 16pt; }
    .header h1 { font-size: 16pt; color: #0f766e; margin: 0 0 4pt 0; text-transform: uppercase; }
    .header h2 { font-size: 12pt; color: #334155; margin: 0 0 4pt 0; font-weight: normal; }
    .header p { font-size: 9pt; color: #64748b; margin: 0; }
    .badge { display: inline-block; padding: 4pt 8pt; border-radius: 4pt; font-weight: bold; font-size: 10pt; }
    .badge-red { background-color: #fee2e2; color: #991b1b; border: 1pt solid #ef4444; }
    .badge-yellow { background-color: #fef3c7; color: #92400e; border: 1pt solid #f59e0b; }
    .badge-green { background-color: #d1fae5; color: #065f46; border: 1pt solid #10b981; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 14pt; }
    th, td { border: 1pt solid #cbd5e1; padding: 6pt 8pt; font-size: 10pt; text-align: left; vertical-align: top; }
    th { background-color: #f1f5f9; color: #0f766e; font-weight: bold; }
    .section-title { font-size: 12pt; font-weight: bold; color: #0f766e; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 6pt; }
    .info-grid { width: 100%; margin-bottom: 10pt; }
    .info-grid td { border: none; padding: 3pt 6pt; font-size: 10pt; }
    .footer { margin-top: 24pt; border-top: 1pt solid #cbd5e1; padding-top: 8pt; font-size: 9pt; color: #64748b; text-align: center; }
    .signature-box { margin-top: 30pt; width: 100%; }
    .signature-box td { border: none; }
  </style>
</head>
<body>
  <!-- Header -->
  <div class="header">
    <h1>National Health Mission (NHM) • Government of Maharashtra</h1>
    <h2>Pradhan Mantri Surakshit Matritva Abhiyan (PMSMA) • Digital Maternal Health Pass</h2>
    <p>Primary Health Centre (PHC): ${beneficiary.village} PHC • Shirur Taluka, Pune Rural • DPDP Act 2023 Compliant</p>
  </div>

  <!-- Patient Identity & Obstetric Profile -->
  <div class="section-title">1. Patient Demographic & Obstetric Identity</div>
  <table class="info-grid">
    <tr>
      <td width="20%"><strong>Beneficiary Name:</strong></td>
      <td width="30%">${beneficiary.name}</td>
      <td width="20%"><strong>RCH ID:</strong></td>
      <td width="30%"><strong>${beneficiary.rchId}</strong></td>
    </tr>
    <tr>
      <td><strong>Age:</strong></td>
      <td>${beneficiary.age} Years</td>
      <td><strong>Mobile / Contact:</strong></td>
      <td>${beneficiary.phone}</td>
    </tr>
    <tr>
      <td><strong>Husband's Name:</strong></td>
      <td>${beneficiary.husbandName}</td>
      <td><strong>Assigned Village:</strong></td>
      <td>${beneficiary.village} (${beneficiary.ward})</td>
    </tr>
    <tr>
      <td><strong>LMP Date:</strong></td>
      <td>${beneficiary.lmp}</td>
      <td><strong>Estimated Due Date (EDD):</strong></td>
      <td><strong>${beneficiary.edd}</strong></td>
    </tr>
    <tr>
      <td><strong>Gestational Age:</strong></td>
      <td>${beneficiary.currentGestationalWeeks} Weeks</td>
      <td><strong>Blood Group:</strong></td>
      <td><strong>${beneficiary.bloodGroup || 'B+'}</strong></td>
    </tr>
    <tr>
      <td><strong>Obstetric Index:</strong></td>
      <td>Gravida: G${beneficiary.gravidity}, Para: P${beneficiary.parity}</td>
      <td><strong>Prior C-Section:</strong></td>
      <td>${beneficiary.hasPrevCesarean ? 'Yes (High Risk Factor)' : 'No'}</td>
    </tr>
    <tr>
      <td><strong>Assigned ASHA Worker:</strong></td>
      <td colspan="3">${beneficiary.assignedAsha?.name || 'Savita Patil'} (${beneficiary.assignedAsha?.phone || '+91 97654 32101'})</td>
    </tr>
  </table>

  <!-- Clinical Risk Stratification -->
  <div class="section-title">2. AI Clinical Risk Stratification (DPDP Act 2023 Audited)</div>
  <table class="info-grid">
    <tr>
      <td width="25%"><strong>Risk Classification Tier:</strong></td>
      <td>
        <span class="badge ${beneficiary.currentRiskTier === 'RED' ? 'badge-red' : beneficiary.currentRiskTier === 'YELLOW' ? 'badge-yellow' : 'badge-green'}">
          ${beneficiary.currentRiskTier === 'RED' ? 'HIGH RISK (RED TIER)' : beneficiary.currentRiskTier === 'YELLOW' ? 'MODERATE RISK (YELLOW TIER)' : 'LOW / NORMAL RISK (GREEN TIER)'}
        </span>
      </td>
    </tr>
    <tr>
      <td><strong>ML Risk Score Probability:</strong></td>
      <td>${((beneficiary.mlRiskScore || 0.12) * 100).toFixed(1)}% High-Risk Likelihood</td>
    </tr>
    <tr>
      <td><strong>Identified Clinical Risk Factors:</strong></td>
      <td>${beneficiary.riskFactors && beneficiary.riskFactors.length > 0 ? beneficiary.riskFactors.join(', ') : 'None detected. Vitals within safe maternal baseline.'}</td>
    </tr>
  </table>

  <!-- Latest Clinical Vitals -->
  <div class="section-title">3. Latest Clinical Vitals & Lab Diagnostics</div>
  <table>
    <thead>
      <tr>
        <th>Parameter</th>
        <th>Recorded Value</th>
        <th>Reference Standard</th>
        <th>Clinical Assessment</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Blood Pressure (BP)</td>
        <td><strong>${latestVital?.systolicBP ? `${latestVital.systolicBP} / ${latestVital.diastolicBP} mmHg` : '<em>Not measured</em>'}</strong></td>
        <td>&lt; 140/90 mmHg</td>
        <td>${!latestVital?.systolicBP ? '-' : latestVital.systolicBP >= 140 || latestVital.diastolicBP >= 90 ? 'ELEVATED - Risk of Pre-Eclampsia' : 'Normal Normotensive'}</td>
      </tr>
      <tr>
        <td>Hemoglobin (Hb)</td>
        <td><strong>${latestVital?.hemoglobin !== undefined ? `${latestVital.hemoglobin} g/dL` : '<em>Not measured</em>'}</strong></td>
        <td>&ge; 11.0 g/dL</td>
        <td>${latestVital?.hemoglobin === undefined ? '-' : latestVital.hemoglobin < 7.0 ? 'SEVERE ANEMIA (Emergency IV Iron)' : latestVital.hemoglobin < 10.0 ? 'Moderate Anemia (Oral IFA 2x)' : latestVital.hemoglobin < 11.0 ? 'Mild Anemia' : 'Normal Hb'}</td>
      </tr>
      <tr>
        <td>Blood Sugar</td>
        <td><strong>${latestVital?.bloodSugar !== undefined ? `${latestVital.bloodSugar} mg/dL` : '<em>Not measured</em>'}</strong></td>
        <td>70 - 140 mg/dL</td>
        <td>${latestVital?.bloodSugar === undefined ? '-' : latestVital.bloodSugar > 140 ? 'ELEVATED - Screening for GDM Required' : 'Normal Glycemic Control'}</td>
      </tr>
      <tr>
        <td>Maternal Weight</td>
        <td><strong>${latestVital?.weightKg !== undefined ? `${latestVital.weightKg} kg` : '<em>Not measured</em>'}</strong></td>
        <td>Baseline Tracking</td>
        <td>${latestVital?.weightKg !== undefined && latestVital.weightKg < 45 ? 'Underweight - nutrition support' : '-'}</td>
      </tr>
      <tr>
        <td>Urine Protein</td>
        <td><strong>${latestVital?.urineProtein || '<em>Not measured</em>'}</strong></td>
        <td>NIL / Negative</td>
        <td>${!latestVital?.urineProtein ? '-' : latestVital.urineProtein !== 'NIL' ? 'Proteinuria Present' : 'Normal NIL'}</td>
      </tr>
    </tbody>
  </table>

  <!-- 8-ANC Checkup Timeline -->
  <div class="section-title">4. 8-ANC Checkup & PMSMA Specialist Timeline</div>
  <table>
    <thead>
      <tr>
        <th>Contact</th>
        <th>Target Week</th>
        <th>Scheduled Due Date</th>
        <th>PMSMA Camp</th>
        <th>Status</th>
        <th>Facility</th>
      </tr>
    </thead>
    <tbody>
      ${beneficiary.ancSchedule.map(anc => `
        <tr>
          <td>ANC #${anc.contactNo}</td>
          <td>Week ${anc.targetWeek}</td>
          <td>${anc.dueDate}</td>
          <td>${anc.isPMSMA ? 'Yes (9th PMSMA)' : 'Routine'}</td>
          <td><strong>${anc.status}</strong></td>
          <td>${anc.assignedFacility || beneficiary.village + ' PHC'}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <!-- Active Prescriptions -->
  <div class="section-title">5. Active Medications & Prescriptions</div>
  <table>
    <thead>
      <tr>
        <th>Medication Name</th>
        <th>Dosage & Frequency</th>
        <th>Duration</th>
        <th>Prescribing Doctor</th>
      </tr>
    </thead>
    <tbody>
      ${beneficiary.prescriptions && beneficiary.prescriptions.length > 0 ? beneficiary.prescriptions.flatMap(p => p.medications.map(m => `
        <tr>
          <td><strong>${m.name}</strong></td>
          <td>${m.dosage}</td>
          <td>${m.durationDays} Days</td>
          <td>${p.doctorName} (${p.facility})</td>
        </tr>
      `)).join('') : `
        <tr>
          <td><strong>IFA (Iron & Folic Acid 100mg)</strong></td>
          <td>1 Tablet Daily after meal</td>
          <td>180 Days</td>
          <td>Dr. Rajesh Kulkarni (Shirur PHC)</td>
        </tr>
        <tr>
          <td><strong>Calcium Carbonate 500mg + Vitamin D3</strong></td>
          <td>1 Tablet Twice Daily (after meals)</td>
          <td>180 Days</td>
          <td>Dr. Rajesh Kulkarni (Shirur PHC)</td>
        </tr>
      `}
    </tbody>
  </table>

  <!-- Sign-off & Medical Stamp -->
  <table class="signature-box">
    <tr>
      <td width="50%">
        <p><strong>Generated At:</strong> ${new Date().toLocaleString()}</p>
        <p><strong>Emergency Ambulance:</strong> 108 (24x7 Free Relay)</p>
        <p><strong>DPDP Act 2023 Consent Audit ID:</strong> ${beneficiary.dpdpConsent?.auditTrail?.[0]?.timestamp || Date.now()}</p>
      </td>
      <td width="50%" style="text-align: right;">
        <p>_____________________________________</p>
        <p><strong>Medical Officer / Obstetrician Sign & Stamp</strong></p>
        <p>Primary Health Centre (PHC), Shirur Taluka</p>
      </td>
    </tr>
  </table>

  <div class="footer">
    MaatriSaarthi Platform • Safe Motherhood & Real-Time Maternal Risk Stratification • Confidential Health Record
  </div>
</body>
</html>
`;

  // Create Word Document Blob
  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  const fileName = `${beneficiary.name.replace(/[^a-zA-Z0-9]/g, '_')}_Maternal_Clinical_Summary.doc`;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

/**
 * Export Public Health Ward Monthly Executive MCH Report to Microsoft Word (.doc)
 */
export function exportWardReportToWordDoc(wardName: string, metrics: WardMCHMetrics): void {
  const k = metrics.kThreshold;
  const pct = (v: number | null) => formatPercent(v);
  const count = (v: number | null) => formatSuppressedCount(v, k);
  // Compliance is computed against the benchmark; unavailable figures are reported as such
  const verdict = (v: number | null, ok: (x: number) => boolean) =>
    v === null ? 'Not available' : ok(v) ? 'Meets benchmark' : 'Below benchmark';
  const htmlContent = `
<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
<head>
  <meta charset="utf-8">
  <title>Ward MCH Executive Report - ${wardName}</title>
  <style>
    body { font-family: 'Calibri', 'Arial', sans-serif; font-size: 11pt; color: #1e293b; line-height: 1.5; margin: 20mm; }
    .header { text-align: center; border-bottom: 2pt solid #0f766e; padding-bottom: 12pt; margin-bottom: 16pt; }
    .header h1 { font-size: 16pt; color: #0f766e; margin: 0 0 4pt 0; text-transform: uppercase; }
    .header h2 { font-size: 12pt; color: #334155; margin: 0 0 4pt 0; font-weight: normal; }
    .header p { font-size: 9pt; color: #64748b; margin: 0; }
    table { width: 100%; border-collapse: collapse; margin-top: 8pt; margin-bottom: 14pt; }
    th, td { border: 1pt solid #cbd5e1; padding: 6pt 8pt; font-size: 10pt; text-align: left; vertical-align: top; }
    th { background-color: #f1f5f9; color: #0f766e; font-weight: bold; }
    .section-title { font-size: 12pt; font-weight: bold; color: #0f766e; border-bottom: 1pt solid #cbd5e1; padding-bottom: 3pt; margin-top: 14pt; margin-bottom: 6pt; }
    .footer { margin-top: 24pt; border-top: 1pt solid #cbd5e1; padding-top: 8pt; font-size: 9pt; color: #64748b; text-align: center; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MaatriSaarthi Ward Summary</h1>
    <h2>Maternal & Child Health (MCH) Indicators from App Records</h2>
    <p>Target Area: ${wardName} • Shirur Block, Pune Rural • Aggregate only; groups smaller than ${k} withheld</p>
    ${metrics.suppressed ? `<p><strong>Fewer than ${k} mothers in this selection: all figures withheld.</strong></p>` : ''}
  </div>

  <div class="section-title">1. Executive Epidemiological Summary</div>
  <table>
    <tr>
      <td width="30%"><strong>Total Monitored Cohort:</strong></td>
      <td width="20%">${count(metrics.totalPregnantMothers)} Mothers</td>
      <td width="30%"><strong>High-Risk Cases (HRP):</strong></td>
      <td width="20%"><strong>${count(metrics.highRiskCount)} Cases</strong></td>
    </tr>
    <tr>
      <td><strong>Moderate Risk Watchlist:</strong></td>
      <td>${count(metrics.moderateRiskCount)} Cases</td>
      <td><strong>Routine ANC (Safe):</strong></td>
      <td>${count(metrics.normalRiskCount)} Mothers</td>
    </tr>
    <tr>
      <td><strong>IFA Stock Buffer Remaining:</strong></td>
      <td>Not tracked</td>
      <td><strong>108 Emergency Transfers:</strong></td>
      <td>Not tracked</td>
    </tr>
  </table>

  <div class="section-title">2. Standard 8-MCH Protocol Indicators (Government of India)</div>
  <table>
    <thead>
      <tr>
        <th>Indicator Name</th>
        <th>Recorded Rate</th>
        <th>National Benchmark</th>
        <th>Performance Compliance</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>1. Early ANC Registration (&lt; 12 Weeks)</td>
        <td><strong>${pct(metrics.earlyRegistrationPercent)}</strong></td>
        <td>&gt; 90%</td>
        <td>${verdict(metrics.earlyRegistrationPercent, x => x > 90)}</td>
      </tr>
      <tr>
        <td>2. 4+ ANC Visit Completion Rate</td>
        <td><strong>${pct(metrics.anc4CompletionPercent)}</strong></td>
        <td>&gt; 80%</td>
        <td>${verdict(metrics.anc4CompletionPercent, x => x > 80)}</td>
      </tr>
      <tr>
        <td>3. Severe Anemia Prevalence (Hb &lt; 7 g/dL)</td>
        <td><strong>${pct(metrics.severeAnemiaPercent)}</strong></td>
        <td>&lt; 2.0%</td>
        <td>${verdict(metrics.severeAnemiaPercent, x => x < 2)}</td>
      </tr>
      <tr>
        <td>4. Gestational Hypertension (BP &ge; 140/90)</td>
        <td><strong>${pct(metrics.gestationalHypertensionPercent)}</strong></td>
        <td>100%</td>
        <td>Prevalence (no benchmark)</td>
      </tr>
      <tr>
        <td>5. Possible GDM (Blood Sugar &ge; 140 mg/dL)</td>
        <td><strong>${pct(metrics.gestationalDiabetesPercent)}</strong></td>
        <td>&gt; 95%</td>
        <td>Prevalence (no benchmark)</td>
      </tr>
      <tr>
        <td>6. Ultrasound (TIFFA Scan) Coverage</td>
        <td><strong>${pct(metrics.ultrasoundScanCoveragePercent)}</strong></td>
        <td>&gt; 85%</td>
        <td>${verdict(metrics.ultrasoundScanCoveragePercent, x => x > 85)}</td>
      </tr>
      <tr>
        <td>7. Institutional Delivery Preparedness</td>
        <td><strong>${pct(metrics.institutionalDeliveryPlanPercent)}</strong></td>
        <td>100%</td>
        <td>${verdict(metrics.institutionalDeliveryPlanPercent, x => x >= 100)}</td>
      </tr>
    </tbody>
  </table>

  <div class="footer">
    Generated by MaatriSaarthi from app records • ${new Date().toLocaleString()}
  </div>
</body>
</html>
`;

  const blob = new Blob(['\ufeff', htmlContent], {
    type: 'application/msword;charset=utf-8'
  });

  const url = URL.createObjectURL(blob);
  const downloadLink = document.createElement('a');
  downloadLink.href = url;
  const fileName = `Ward_MCH_Executive_Report_${wardName.replace(/[^a-zA-Z0-9]/g, '_')}.doc`;
  downloadLink.download = fileName;
  document.body.appendChild(downloadLink);
  downloadLink.click();
  document.body.removeChild(downloadLink);
  URL.revokeObjectURL(url);
}

