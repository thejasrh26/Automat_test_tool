/* EBSL Automat calculator – legacy/mobile-browser compatible ES5 script */
var tests = [];
function byId(id) { return document.getElementById(id); }
function isNum(v) { return typeof v === 'number' && isFinite(v); }
function fmt(n, d) {
  if (typeof d === 'undefined') d = 3;
  if (!isNum(Number(n))) return String(n);
  var value = Number(n);
  var factor = Math.pow(10, d);
  value = Math.round(value * factor) / factor;
  var parts = String(value).split('.');
  parts[0] = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return parts.join('.');
}
function safeScroll(id) {
  var target = byId(id);
  if (!target) return;
  try {
    if (target.scrollIntoView) {
      target.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } catch (e) { /* Scrolling is optional; never block calculation. */ }
}
function showError(msg) {
  var el = byId('error');
  el.textContent = msg || '';
  el.style.display = msg ? 'block' : 'none';
  if (msg) safeScroll('error');
}
function showExportStatus(msg, state) {
  var el = byId('exportStatus');
  if (!el) return;
  el.textContent = msg;
  if (el.setAttribute) el.setAttribute('data-state', state || 'info');
}
function updateExportCount() {
  var n = tests.length;
  byId('exportCount').textContent = n + ' test' + (n === 1 ? '' : 's') + ' recorded';
}
function selectedDiameter() {
  var select = byId('pipeDiameter');
  var value = select.value === 'custom' ? byId('customDiameter').value : select.value;
  return Number(value);
}

/* Classify error magnitude for status badge */
function errorClass(err) {
  var abs = Math.abs(err);
  if (abs === 0) return 'good';
  if (abs <= 2) return 'good';
  if (abs <= 5) return 'warn';
  return 'bad';
}

function calculate() {
  showError('');
  var a = byId('initial').value;
  var b = byId('final').value;
  var c = byId('actual').value;
  var d = byId('duration').value;
  var rawFlow = byId('flowModbus').value;
  if (a === '' || b === '' || c === '' || d === '') {
    showError('Please fill in both totalizer readings, actual collected volume and test interval.');
    return false;
  }
  var initial = Number(a), finalValue = Number(b), actual = Number(c), duration = Number(d);
  var modbusFlow = rawFlow === '' ? null : Number(rawFlow);
  if (!isNum(initial) || !isNum(finalValue) || !isNum(actual) || !isNum(duration) || initial < 0 || finalValue < 0 || actual <= 0 || duration <= 0 || (modbusFlow !== null && (!isNum(modbusFlow) || modbusFlow < 0))) {
    showError('Enter valid numbers. Readings and flow rate cannot be negative; actual volume and interval must be greater than zero.');
    return false;
  }
  var diameter = selectedDiameter();
  if (!isNum(diameter) || diameter <= 0) {
    showError('Select a pipe diameter or enter a custom diameter greater than zero.');
    return false;
  }
  if (finalValue < initial) {
    showError('The new cumulative reading is lower than the previous reading. Check the readings, totalizer reset or rollover before calculating.');
    return false;
  }
  var unitValue = byId('unit').value;
  var minutes = duration * (unitValue === 'sec' ? 1 / 60 : (unitValue === 'hr' ? 60 : 1));
  var meter = finalValue - initial;
  var err = ((meter - actual) / actual) * 100;
  var diff = meter - actual;
  var actualFlow = actual / minutes;
  var flowErr = (modbusFlow === null) ? null : ((modbusFlow - actualFlow) / actualFlow) * 100;
  byId('meterVolume').textContent = fmt(meter) + ' L';
  byId('difference').textContent = (diff > 0 ? '+' : '') + fmt(diff) + ' L';
  byId('errorPct').textContent = (err > 0 ? '+' : '') + fmt(err, 2) + '%';
  byId('actualFlow').textContent = fmt(actualFlow) + ' L/min';
  byId('meterFlow').textContent = modbusFlow === null ? 'Not entered' : fmt(modbusFlow) + ' L/min';
  byId('flowError').textContent = flowErr === null ? 'Use flow calculator' : ((flowErr > 0 ? '+' : '') + fmt(flowErr, 2) + '%');
  var status = byId('status');
  var cls = errorClass(err);
  status.className = 'status ' + cls;
  status.textContent = err > 0 ? 'Over-registering' : (err < 0 ? 'Under-registering' : 'Exact match');
  byId('interpretation').textContent = err > 0 ? ('The totalizer registered ' + fmt(Math.abs(diff)) + ' L more than the collected volume (' + fmt(Math.abs(err), 2) + '% error). Flow-rate comparison is calculated separately.') : (err < 0 ? ('The totalizer registered ' + fmt(Math.abs(diff)) + ' L less than the collected volume (' + fmt(Math.abs(err), 2) + '% error). Flow-rate comparison is calculated separately.') : 'The totalizer and physical collection match for this test. Flow-rate comparison is calculated separately.');
  byId('formula').innerHTML = 'Meter volume = ' + fmt(finalValue) + ' − ' + fmt(initial) + ' = ' + fmt(meter) + ' L<br>Error % = (' + fmt(meter) + ' − ' + fmt(actual) + ') ÷ ' + fmt(actual) + ' × 100 = ' + fmt(err, 2) + '%';
  var interval = duration + ' ' + (unitValue === 'sec' ? 'seconds' : (unitValue === 'hr' ? 'hours' : 'minutes'));
  var record = { actual: actual, meter: meter, error: err, interval: interval, notes: byId('notes').value, initial: initial, final: finalValue, actualFlow: actualFlow, meterFlow: modbusFlow, flowError: flowErr, diameter: diameter, duration: duration, durationUnit: unitValue };
  tests.push(record);
  renderLog();
  safeScroll('resultCard');
  return true;
}

function flowCalc() {
  showError('');
  var actualText = byId('actual').value;
  var durationText = byId('duration').value;
  var raw = byId('flowModbus').value;
  if (actualText === '' || durationText === '' || raw === '') {
    showError('For flow-rate accuracy, enter actual collected volume, test interval and average Modbus flow rate.');
    return false;
  }
  var actual = Number(actualText), duration = Number(durationText), modbus = Number(raw);
  if (!isNum(actual) || !isNum(duration) || !isNum(modbus) || actual <= 0 || duration <= 0 || modbus < 0) {
    showError('Enter valid positive volume and interval, and a non-negative Modbus flow rate.');
    return false;
  }
  var unitValue = byId('unit').value;
  var minutes = duration * (unitValue === 'sec' ? 1 / 60 : (unitValue === 'hr' ? 60 : 1));
  var physical = actual / minutes;
  var diff = modbus - physical;
  var err = (diff / physical) * 100;
  byId('flowActualResult').textContent = fmt(physical) + ' L/min';
  byId('flowModbusResult').textContent = fmt(modbus) + ' L/min';
  byId('flowDifference').textContent = (diff > 0 ? '+' : '') + fmt(diff) + ' L/min';
  byId('flowErrorResult').textContent = (err > 0 ? '+' : '') + fmt(err, 2) + '%';
  byId('physicalFlowPreview').textContent = fmt(actual) + ' L / ' + fmt(minutes) + ' min = ' + fmt(physical) + ' L/min';
  byId('flowInterpretation').textContent = err > 0 ? ('Modbus average flow is higher than the physical average by ' + fmt(Math.abs(err), 2) + '%.') : (err < 0 ? ('Modbus average flow is lower than the physical average by ' + fmt(Math.abs(err), 2) + '%.') : 'The average Modbus and physical flow rates match for this test.');
  var diameter = selectedDiameter();
  var i, latest = null;
  for (i = tests.length - 1; i >= 0; i--) {
    if (tests[i].initial === Number(byId('initial').value) && tests[i].final === Number(byId('final').value) && tests[i].actual === actual && tests[i].duration === duration && tests[i].durationUnit === unitValue && tests[i].diameter === diameter) { latest = tests[i]; break; }
  }
  if (latest) {
    latest.meterFlow = modbus;
    latest.flowError = err;
    renderLog();
    showExportStatus('Flow-rate result added to the matching test record. Excel and Word exports include it.', 'success');
  } else {
    showExportStatus('Flow-rate result calculated. To include it in exports, calculate and record the matching volume test first.', 'info');
  }
  safeScroll('flowActualResult');
  return true;
}

function deleteTest(index) {
  if (index >= 0 && index < tests.length) {
    tests.splice(index, 1);
    renderLog();
  }
}

function renderLog() {
  var body = byId('log');
  updateExportCount();
  if (!tests.length) {
    body.innerHTML = '<tr><td colspan="8" style="color:#64748b">No tests recorded yet.</td></tr>';
    showExportStatus('Your export buttons are ready. Calculate at least one test before downloading a report.', 'info');
    return;
  }
  var html = '', i, t;
  for (i = 0; i < tests.length; i++) {
    t = tests[i];
    html += '<tr><td>' + (i + 1) + '</td><td>' + fmt(t.actual) + '</td><td>' + fmt(t.meter) + '</td><td>' + fmt(t.error, 2) + '%</td><td>' + (t.flowError === null ? 'N/A' : fmt(t.flowError, 2) + '%') + '</td><td>' + fmt(t.diameter) + ' mm</td><td>' + t.interval + '</td><td><button class="btn-delete" onclick="deleteTest(' + i + ')" title="Delete test #' + (i + 1) + '" type="button">✕</button></td></tr>';
  }
  body.innerHTML = html;
  showExportStatus(tests.length + ' test(s) available for export. Choose Excel, Word, CSV or PDF.', 'success');
}

function resetCalculator() {
  var ids = ['initial', 'final', 'actual', 'flowModbus', 'duration', 'notes'];
  var i;
  for (i = 0; i < ids.length; i++) byId(ids[i]).value = '';
  byId('unit').value = 'min';
  /* Reset pipe diameter to default */
  byId('pipeDiameter').value = '24';
  byId('customDiameterWrap').className = 'field hidden';
  byId('diameterPill').textContent = 'Selected pipe diameter: 24 mm';
  showError('');
  var resetIds = ['meterVolume', 'difference', 'errorPct', 'actualFlow', 'meterFlow', 'flowError', 'flowActualResult', 'flowModbusResult', 'flowDifference', 'flowErrorResult'];
  for (i = 0; i < resetIds.length; i++) byId(resetIds[i]).textContent = '—';
  byId('physicalFlowPreview').textContent = 'Enter actual collected volume and test interval above.';
  byId('flowInterpretation').textContent = 'Enter the actual collected volume and interval above, then enter the average Modbus flow rate here.';
  byId('status').className = 'status';
  byId('status').textContent = 'Waiting for inputs';
  byId('interpretation').textContent = 'Enter readings and calculate to view the comparison.';
  byId('formula').innerHTML = 'Meter volume = New totalizer − Previous totalizer<br>Error % = (Meter volume − Actual volume) ÷ Actual volume × 100';
}

function exportRows() {
  var rows = [['Test', 'Pipe diameter (mm)', 'Previous totalizer (L)', 'New totalizer (L)', 'Meter volume (L)', 'Actual collected volume (L)', 'Volume error (%)', 'Test interval', 'Actual average flow (L/min)', 'Average Modbus flow (L/min)', 'Flow-rate error (%)', 'Notes']];
  var i, t;
  for (i = 0; i < tests.length; i++) {
    t = tests[i];
    rows.push([i + 1, t.diameter, t.initial, t.final, t.meter, t.actual, t.error, t.interval, t.actualFlow, t.meterFlow === null ? '' : t.meterFlow, t.flowError === null ? '' : t.flowError, t.notes || '']);
  }
  return rows;
}

function xmlEscape(v) {
  return String(v === null || typeof v === 'undefined' ? '' : v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&apos;');
}

function downloadFile(filename, content, mime) {
  try {
    var blob = new Blob([content], { type: mime });
    var url = (window.URL || window.webkitURL).createObjectURL(blob);
    var link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.setTimeout(function () { (window.URL || window.webkitURL).revokeObjectURL(url); }, 3000);
    showExportStatus('Report created. Check your phone/browser Downloads folder.', 'success');
  } catch (e) {
    showExportStatus('Your browser blocked the automatic download. Open this page in Chrome or Safari and try again.', 'warning');
  }
}

function csvExport() {
  if (!tests.length) { showExportStatus('Calculate at least one test before exporting.', 'warning'); return; }
  var rows = exportRows(), csv = '', i, j, val;
  for (i = 0; i < rows.length; i++) {
    var fields = [];
    for (j = 0; j < rows[i].length; j++) {
      val = String(rows[i][j] === null || typeof rows[i][j] === 'undefined' ? '' : rows[i][j]).replace(/"/g, '""');
      fields.push('"' + val + '"');
    }
    csv += fields.join(',') + '\r\n';
  }
  downloadFile('EBSL_Automat_Water_Meter_Test_Report.csv', csv, 'text/csv;charset=utf-8');
}

function excelExport() {
  if (!tests.length) { showExportStatus('Calculate at least one test before exporting.', 'warning'); return; }
  var rows = exportRows(), xmlRows = '', i, j, v, type, style;
  for (i = 0; i < rows.length; i++) {
    xmlRows += '<Row>';
    for (j = 0; j < rows[i].length; j++) {
      v = rows[i][j]; type = typeof v === 'number' && isFinite(v) ? 'Number' : 'String';
      style = i === 0 ? ' ss:StyleID="Header"' : '';
      xmlRows += '<Cell' + style + '><Data ss:Type="' + type + '">' + xmlEscape(v) + '</Data></Cell>';
    }
    xmlRows += '</Row>';
  }
  var xml = '<?xml version="1.0"?><Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet"><DocumentProperties xmlns="urn:schemas-microsoft-com:office:office"><Title>EBSL Automat Water Meter Verification</Title><Author>EBSL Automat</Author></DocumentProperties><Styles><Style ss:ID="Default" ss:Name="Normal"><Font ss:FontName="Arial" ss:Size="10"/></Style><Style ss:ID="Header"><Interior ss:Color="#DDF5F1" ss:Pattern="Solid"/><Font ss:Bold="1" ss:Color="#07545B"/></Style></Styles><Worksheet ss:Name="Test Results"><Table>' + xmlRows + '</Table></Worksheet></Workbook>';
  downloadFile('EBSL_Automat_Water_Meter_Test_Report.xls', xml, 'application/vnd.ms-excel;charset=utf-8');
}

function wordExport() {
  if (!tests.length) { showExportStatus('Calculate at least one test before exporting.', 'warning'); return; }
  var rows = '', i, t;
  for (i = 0; i < tests.length; i++) {
    t = tests[i];
    rows += '<tr><td>' + (i + 1) + '</td><td>' + fmt(t.diameter) + ' mm</td><td>' + fmt(t.initial) + '</td><td>' + fmt(t.final) + '</td><td>' + fmt(t.meter) + '</td><td>' + fmt(t.actual) + '</td><td>' + fmt(t.error, 2) + '%</td><td>' + xmlEscape(t.interval) + '</td><td>' + fmt(t.actualFlow) + '</td><td>' + (t.meterFlow === null ? '-' : fmt(t.meterFlow)) + '</td><td>' + (t.flowError === null ? '-' : fmt(t.flowError, 2) + '%') + '</td><td>' + xmlEscape(t.notes) + '</td></tr>';
  }
  var doc = '<!DOCTYPE html><html><head><meta charset="utf-8"><title>EBSL Automat Water Meter Verification Report</title><style>body{font-family:Arial,sans-serif;color:#173b40;margin:28px}h1{color:#087f86;font-size:22px}table{border-collapse:collapse;width:100%;font-size:8pt}th{background:#dff5f1;color:#07545b}th,td{border:1px solid #b9d8d6;padding:6px;text-align:left}p{font-size:10pt;line-height:1.5}</style></head><body><h1>EBSL AUTOMAT</h1><h2>Water Meter Physical Verification Report</h2><p>Generated: ' + new Date().toLocaleString() + ' | Total tests: ' + tests.length + '</p><table><thead><tr><th>Test</th><th>Pipe diameter</th><th>Previous totalizer</th><th>New totalizer</th><th>Meter volume</th><th>Actual volume</th><th>Volume error</th><th>Interval</th><th>Actual avg flow</th><th>Modbus avg flow</th><th>Flow error</th><th>Notes</th></tr></thead><tbody>' + rows + '</tbody></table><p>Meter volume = New totalizer − Previous totalizer.</p><p>Volume error (%) = (Meter volume − Actual volume) ÷ Actual volume × 100.</p><p>Actual average flow (L/min) = Actual collected volume ÷ duration in minutes.</p><p>Flow-rate error (%) = (Average Modbus flow − Actual average flow) ÷ Actual average flow × 100.</p><p>These are comparison results, not a calibration certificate.</p></body></html>';
  downloadFile('EBSL_Automat_Water_Meter_Test_Report.doc', doc, 'application/msword;charset=utf-8');
}

function pdfExport() {
  if (!tests.length) { showExportStatus('Calculate at least one test before exporting.', 'warning'); return; }
  var area = byId('printReport');
  wordExportForPrint(area);
  window.print();
}

function wordExportForPrint(area) {
  var rows = '', i, t;
  for (i = 0; i < tests.length; i++) {
    t = tests[i];
    rows += '<tr><td>' + (i + 1) + '</td><td>' + fmt(t.diameter) + '</td><td>' + fmt(t.initial) + '</td><td>' + fmt(t.final) + '</td><td>' + fmt(t.meter) + '</td><td>' + fmt(t.actual) + '</td><td>' + fmt(t.error, 2) + '%</td><td>' + xmlEscape(t.interval) + '</td><td>' + fmt(t.actualFlow) + '</td><td>' + (t.meterFlow === null ? '-' : fmt(t.meterFlow)) + '</td><td>' + (t.flowError === null ? '-' : fmt(t.flowError, 2) + '%') + '</td></tr>';
  }
  area.innerHTML = '<h1>EBSL AUTOMAT − Water Meter Physical Verification Report</h1><p>Generated: ' + new Date().toLocaleString() + ' | Tests: ' + tests.length + '</p><table><tr><th>Test</th><th>Diameter</th><th>Initial</th><th>Final</th><th>Meter volume</th><th>Actual volume</th><th>Volume error</th><th>Interval</th><th>Actual flow</th><th>Modbus flow</th><th>Flow error</th></tr>' + rows + '</table><p>Volume error = (Meter volume − Actual volume) ÷ Actual volume × 100.</p><p>Flow error = (Average Modbus flow − Actual average flow) ÷ Actual average flow × 100.</p>';
}

function wireButton(id, fn) {
  var el = byId(id);
  if (!el) return;
  el.onclick = fn;
}

function updatePhysicalPreview() {
  var a = Number(byId('actual').value), d = Number(byId('duration').value);
  if (byId('actual').value !== '' && byId('duration').value !== '' && a > 0 && d > 0) {
    var minutes = d * (byId('unit').value === 'sec' ? 1 / 60 : (byId('unit').value === 'hr' ? 60 : 1));
    byId('physicalFlowPreview').textContent = fmt(a) + ' L / ' + fmt(minutes) + ' min = ' + fmt(a / minutes) + ' L/min';
  }
}

function initCalculator() {
  wireButton('calculate', calculate);
  wireButton('calculateFlow', flowCalc);
  wireButton('reset', resetCalculator);
  wireButton('exportExcel', excelExport);
  wireButton('exportWord', wordExport);
  wireButton('export', csvExport);
  wireButton('exportPdf', pdfExport);
  byId('pipeDiameter').onchange = function () {
    var custom = byId('pipeDiameter').value === 'custom';
    byId('customDiameterWrap').className = custom ? 'field' : 'field hidden';
    byId('diameterPill').textContent = 'Selected pipe diameter: ' + (custom ? (byId('customDiameter').value || 'Custom') : byId('pipeDiameter').value) + ' mm';
  };
  byId('customDiameter').oninput = function () { byId('diameterPill').textContent = 'Selected pipe diameter: ' + (byId('customDiameter').value || 'Custom') + ' mm'; };
  byId('actual').oninput = updatePhysicalPreview;
  byId('duration').oninput = updatePhysicalPreview;
  byId('unit').onchange = updatePhysicalPreview;
  updateExportCount();
  if (document.documentElement && document.documentElement.classList) document.documentElement.classList.add('js-enabled');
  var notice = byId('runtimeStatus');
  if (notice) { notice.innerHTML = 'Calculator ready on this device. Enter readings and tap a calculation button.'; notice.style.display = 'block'; }
}

if (document.readyState === 'loading' && document.addEventListener) {
  document.addEventListener('DOMContentLoaded', initCalculator);
} else {
  initCalculator();
}
