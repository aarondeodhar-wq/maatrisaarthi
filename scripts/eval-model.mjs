// Evaluates the trained risk model in src/core/riskModel.json against test data.
// Run: node scripts/eval-model.mjs [--benchmark | --audit | --synthetic]
import { readFileSync, existsSync } from 'fs';

const args = process.argv.slice(2);
const forceAudit = args.includes('--audit') || args.includes('--dedup');

if (!existsSync('src/core/riskModel.json')) {
  console.error('❌ Error: src/core/riskModel.json not found. Run "node scripts/train-risk-model.mjs" first.');
  process.exit(1);
}

const model = JSON.parse(readFileSync('src/core/riskModel.json', 'utf8'));
console.log('===========================================================');
console.log('       MAATRI SAARTHI - MODEL EVALUATION & PROOF');
console.log('===========================================================');
console.log(`Model Type         : ${model.type} (${model.hyperparameters?.nEstimators || 1} Estimators)`);
console.log(`Trained On         : ${model.trainedOn}`);
console.log(`Decision Threshold : ${model.threshold}`);
console.log(`Input Features     : ${model.features.join(', ')}`);
if (model.cvMetrics) {
  console.log(`Cross-Validation   : ${model.cvMetrics.k}-Fold Mean CV Accuracy: ${model.cvMetrics.displayRange}`);
}
if (model.auditMetrics) {
  console.log(`Audit Baseline     : ${model.auditMetrics.description} -> ${model.auditMetrics.cvRange}`);
}
console.log('-----------------------------------------------------------');

// Prediction function handling both Random Forest (ensemble) and Single Decision Tree
function predict(model, x) {
  if (model.trees && model.trees.length > 0) {
    let sumProb = 0;
    for (const tree of model.trees) {
      let node = tree;
      while (node.p === undefined) {
        node = x[node.f] < node.t ? node.l : node.r;
      }
      sumProb += node.p;
    }
    const prob = sumProb / model.trees.length;
    return { prob, isHighRisk: prob >= model.threshold ? 1 : 0 };
  } else {
    let node = model.tree;
    while (node.p === undefined) {
      node = x[node.f] < node.t ? node.l : node.r;
    }
    const prob = node.p;
    return { prob, isHighRisk: prob >= model.threshold ? 1 : 0 };
  }
}

let testData = [];
let datasetName = '';

if (forceAudit) {
  datasetName = 'Deduplicated Multi-Source Clinical Cohort (1,334 Unique Records)';
  const REAL_SOURCES = [
    { file: 'data/Maternal Health Risk Data Set.csv', cols: { age: 'Age', sys: 'SystolicBP', dia: 'DiastolicBP', bs: 'BS', temp: 'BodyTemp', hr: 'HeartRate', label: 'RiskLevel' } },
    { file: 'data/Dataset - Updated.csv', cols: { age: 'Age', sys: 'Systolic BP', dia: 'Diastolic', bs: 'BS', temp: 'Body Temp', hr: 'Heart Rate', label: 'Risk Level' } }
  ];
  const rows = [];
  for (const s of REAL_SOURCES) {
    if (!existsSync(s.file)) continue;
    const lines = readFileSync(s.file, 'utf8').split(/\r?\n/).filter(l => l.trim());
    const head = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
    const idx = Object.fromEntries(Object.entries(s.cols).map(([k, v]) => [k, head.indexOf(v)]));
    for (const l of lines.slice(1)) {
      const c = l.split(',').map(x => x.trim());
      const age = parseFloat(c[idx.age]), sys = parseFloat(c[idx.sys]), dia = parseFloat(c[idx.dia]);
      const bs = parseFloat(c[idx.bs]), temp = parseFloat(c[idx.temp]), hr = parseFloat(c[idx.hr]);
      const lab = (c[idx.label] || '').toLowerCase();
      if (![age, sys, dia, bs, temp, hr].every(Number.isFinite) || !lab) continue;
      rows.push({ x: [age, sys, dia, bs, temp, hr], y: lab.startsWith('high') ? 1 : 0 });
    }
  }
  const seen = new Set();
  const unique = rows.filter(r => {
    const k = r.x.join(',') + '|' + r.y;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = unique.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [unique[i], unique[j]] = [unique[j], unique[i]];
  }
  const cut = Math.floor(unique.length * 0.8);
  testData = unique.slice(cut);
} else {
  // Benchmark holdout split (1,014 rows)
  datasetName = 'UCI Benchmark Clinical Cohort (Holdout Test Split)';
  const file = 'data/Maternal Health Risk Data Set.csv';
  if (!existsSync(file)) {
    console.error(`❌ Dataset file not found at ${file}.`);
    process.exit(1);
  }
  const lines = readFileSync(file, 'utf8').split(/\r?\n/).filter(l => l.trim());
  const head = lines[0].replace(/^\uFEFF/, '').split(',').map(h => h.trim());
  const idx = {
    age: head.indexOf('Age'), sys: head.indexOf('SystolicBP'), dia: head.indexOf('DiastolicBP'),
    bs: head.indexOf('BS'), temp: head.indexOf('BodyTemp'), hr: head.indexOf('HeartRate'), label: head.indexOf('RiskLevel')
  };
  const rows = [];
  for (const l of lines.slice(1)) {
    const c = l.split(',').map(x => x.trim());
    const age = parseFloat(c[idx.age]), sys = parseFloat(c[idx.sys]), dia = parseFloat(c[idx.dia]);
    const bs = parseFloat(c[idx.bs]), temp = parseFloat(c[idx.temp]), hr = parseFloat(c[idx.hr]);
    const lab = (c[idx.label] || '').toLowerCase();
    if (![age, sys, dia, bs, temp, hr].every(Number.isFinite) || !lab) continue;
    rows.push({ x: [age, sys, dia, bs, temp, hr], y: lab.startsWith('high') ? 1 : 0 });
  }
  let seed = 42;
  const rnd = () => (seed = (seed * 1664525 + 1013904223) % 4294967296) / 4294967296;
  for (let i = rows.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [rows[i], rows[j]] = [rows[j], rows[i]];
  }
  const cut = Math.floor(rows.length * 0.8);
  testData = rows.slice(cut);
}

console.log(`Evaluating against : ${datasetName}`);
console.log(`Test Records Count : ${testData.length.toLocaleString()} unseen samples`);
console.log('Running batch inference...');

const startTime = process.hrtime.bigint();
let tp = 0, fn = 0, fp = 0, tn = 0;

for (const sample of testData) {
  const { isHighRisk } = predict(model, sample.x);
  if (sample.y === 1) {
    if (isHighRisk === 1) tp++; else fn++;
  } else {
    if (isHighRisk === 1) fp++; else tn++;
  }
}
const endTime = process.hrtime.bigint();
const elapsedMs = Number(endTime - startTime) / 1_000_000;
const perSampleUs = (Number(endTime - startTime) / 1_000 / testData.length).toFixed(2);

const total = testData.length;
const accuracy = ((tp + tn) / total) * 100;
const sensitivity = (tp / (tp + fn)) * 100;
const specificity = (tn / (tn + fp)) * 100;
const precision = (tp / (tp + fp)) * 100;
const f1 = (2 * (precision * sensitivity) / (precision + sensitivity));

console.log('\n================== CONFUSION MATRIX ==================');
console.log(`                     Actual HIGH RISK    Actual NORMAL`);
console.log(`Predicted HIGH RISK  TP: ${String(tp).padStart(8)}    FP: ${String(fp).padStart(8)}`);
console.log(`Predicted NORMAL     FN: ${String(fn).padStart(8)}    TN: ${String(tn).padStart(8)}`);
console.log('------------------------------------------------------');

console.log('\n================ PERFORMANCE METRICS =================');
console.log(`Accuracy          : ${accuracy.toFixed(2)}%   (${testData.length} test records)`);
console.log(`Sensitivity/Recall: ${sensitivity.toFixed(2)}%   (High-risk detection rate)`);
console.log(`Specificity       : ${specificity.toFixed(2)}%   (Healthy mother non-alarm rate)`);
console.log(`Precision (PPV)   : ${precision.toFixed(2)}%`);
console.log(`F1-Score          : ${(f1 / 100).toFixed(4)}`);
console.log(`Inference Speed   : ${elapsedMs.toFixed(2)} ms total (${perSampleUs} µs / sample)`);
console.log('======================================================\n');

// 5 Interactive live test verification examples
console.log('🔬 SAMPLE LIVE CLINICAL PREDICTIONS:');
const sampleCases = [
  { name: 'Normal / Healthy ANC', x: [26, 115, 75, 5.0, 98.0, 72] },
  { name: 'Severe Hypertension (High Risk)', x: [30, 155, 95, 5.2, 98.6, 88] },
  { name: 'Gestational Diabetes (High Risk)', x: [28, 118, 76, 12.5, 98.4, 76] },
  { name: 'Adolescent Pregnancy with High Sugar', x: [17, 120, 80, 8.5, 98.6, 80] },
  { name: 'Advanced Maternal Age with Elevated BP & Fever', x: [38, 134, 84, 5.5, 101.0, 92] }
];

sampleCases.forEach((c, idx) => {
  const res = predict(model, c.x);
  const status = res.isHighRisk ? '🔴 HIGH RISK' : '🟢 ROUTINE';
  console.log(` ${idx + 1}. [${status}] ${(res.prob * 100).toFixed(1)}% prob | ${c.name} (Age: ${c.x[0]}, BP: ${c.x[1]}/${c.x[2]}, Sugar: ${(c.x[3] * 18).toFixed(0)} mg/dL, Temp: ${c.x[4]}°F, HR: ${c.x[5]} bpm)`);
});
console.log('');
