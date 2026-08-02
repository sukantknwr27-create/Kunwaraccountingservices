// ============================================================
// Kunwar Accounting Services — GST Ecommerce Tools Shared Utils
// Requires SheetJS (xlsx.full.min.js) to be loaded before this file
// ============================================================

// ---------- GST State Codes ----------
const GST_STATE_CODES = {
  '01':'Jammu and Kashmir','02':'Himachal Pradesh','03':'Punjab','04':'Chandigarh',
  '05':'Uttarakhand','06':'Haryana','07':'Delhi','08':'Rajasthan','09':'Uttar Pradesh',
  '10':'Bihar','11':'Sikkim','12':'Arunachal Pradesh','13':'Nagaland','14':'Manipur',
  '15':'Mizoram','16':'Tripura','17':'Meghalaya','18':'Assam','19':'West Bengal',
  '20':'Jharkhand','21':'Odisha','22':'Chhattisgarh','23':'Madhya Pradesh','24':'Gujarat',
  '25':'Daman and Diu','26':'Dadra and Nagar Haveli','27':'Maharashtra','28':'Andhra Pradesh (Old)',
  '29':'Karnataka','30':'Goa','31':'Lakshadweep','32':'Kerala','33':'Tamil Nadu',
  '34':'Puducherry','35':'Andaman and Nicobar Islands','36':'Telangana','37':'Andhra Pradesh',
  '38':'Ladakh','97':'Other Territory','99':'Centre Jurisdiction'
};
const STATE_NAME_TO_CODE = {};
Object.keys(GST_STATE_CODES).forEach(c => { STATE_NAME_TO_CODE[GST_STATE_CODES[c].toLowerCase()] = c; });
// common short/alt names
const STATE_ALIASES = {
  'nct of delhi':'07','odisha':'21','orissa':'21','pondicherry':'34','uttaranchal':'05',
  'andhra pradesh(before division)':'28'
};

function stateNameToCode(name) {
  if (!name) return null;
  const n = String(name).trim().toLowerCase();
  if (STATE_NAME_TO_CODE[n]) return STATE_NAME_TO_CODE[n];
  if (STATE_ALIASES[n]) return STATE_ALIASES[n];
  if (/^\d{1,2}$/.test(n)) return n.padStart(2,'0');
  // partial match
  for (const key in STATE_NAME_TO_CODE) {
    if (key.includes(n) || n.includes(key)) return STATE_NAME_TO_CODE[key];
  }
  return null;
}

const VALID_GST_RATES = [0, 0.1, 0.25, 1, 1.5, 3, 5, 6, 12, 18, 28];

// ---------- GSTIN Validation (GSTN checksum algorithm) ----------
function isValidGSTINFormat(gstin) {
  if (!gstin) return false;
  return /^\d{2}[A-Z]{5}\d{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(String(gstin).trim().toUpperCase());
}
function gstinChecksumValid(gstin) {
  if (!isValidGSTINFormat(gstin)) return false;
  const CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  gstin = gstin.trim().toUpperCase();
  let factor = 1, sum = 0;
  for (let i = 0; i < 14; i++) {
    const code = CHARS.indexOf(gstin[i]);
    let val = code * factor;
    val = Math.floor(val / 36) + (val % 36);
    sum += val;
    factor = factor === 1 ? 2 : 1;
  }
  const checkDigit = CHARS[(36 - (sum % 36)) % 36];
  return checkDigit === gstin[14];
}
function validateGSTIN(gstin) {
  if (!gstin) return { valid:false, reason:'Missing GSTIN' };
  const g = String(gstin).trim().toUpperCase();
  if (!isValidGSTINFormat(g)) return { valid:false, reason:'Invalid GSTIN format' };
  if (!gstinChecksumValid(g)) return { valid:false, reason:'Checksum mismatch (possible typo)' };
  return { valid:true, stateCode: g.slice(0,2), stateName: GST_STATE_CODES[g.slice(0,2)] || 'Unknown' };
}

// ---------- File reading (CSV / XLSX / XLS) ----------
function readWorkbookFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data = new Uint8Array(e.target.result);
        const wb = XLSX.read(data, { type: 'array', cellDates: true });
        resolve(wb);
      } catch (err) { reject(err); }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}
// Returns array of {headers:[], rows:[[...]], sheetName}
function sheetToRows(wb, sheetName) {
  const sn = sheetName || wb.SheetNames[0];
  const ws = wb.Sheets[sn];
  const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: '', raw: false });
  // find header row = first non-empty row
  let headerIdx = 0;
  while (headerIdx < rows.length && rows[headerIdx].every(c => String(c).trim() === '')) headerIdx++;
  const headers = (rows[headerIdx] || []).map(h => String(h).trim());
  const dataRows = rows.slice(headerIdx + 1).filter(r => r.some(c => String(c).trim() !== ''));
  return { headers, rows: dataRows, sheetName: sn };
}
function rowsToObjects(headers, rows) {
  return rows.map(r => {
    const obj = {};
    headers.forEach((h, i) => { obj[h] = r[i] !== undefined ? r[i] : ''; });
    return obj;
  });
}

// ---------- Fuzzy column auto-mapping ----------
// canonicalFields: { fieldKey: [alias1, alias2, ...] }
function autoMapColumns(headers, canonicalFields) {
  const mapping = {};
  const normHeaders = headers.map(h => h.toLowerCase().replace(/[^a-z0-9]/g, ''));
  Object.keys(canonicalFields).forEach(key => {
    const aliases = canonicalFields[key].map(a => a.toLowerCase().replace(/[^a-z0-9]/g,''));
    let found = -1;
    for (let i = 0; i < normHeaders.length; i++) {
      if (aliases.includes(normHeaders[i])) { found = i; break; }
    }
    if (found === -1) {
      // partial contains match
      for (let i = 0; i < normHeaders.length; i++) {
        if (aliases.some(a => a.length > 3 && normHeaders[i].includes(a))) { found = i; break; }
      }
    }
    mapping[key] = found !== -1 ? headers[found] : null;
  });
  return mapping;
}

// ---------- Export helpers ----------
function downloadBlob(content, filename, mime) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
function downloadJSONFile(obj, filename) {
  downloadBlob(JSON.stringify(obj, null, 2), filename, 'application/json');
}
function downloadXMLFile(xmlString, filename) {
  downloadBlob(xmlString, filename, 'application/xml');
}
// sheetsObj: { "SheetName": [ {col:val}, ... ] }
function downloadExcelFile(sheetsObj, filename) {
  const wb = XLSX.utils.book_new();
  Object.keys(sheetsObj).forEach(name => {
    const ws = XLSX.utils.json_to_sheet(sheetsObj[name]);
    XLSX.utils.book_append_sheet(wb, ws, name.slice(0,31));
  });
  XLSX.writeFile(wb, filename);
}
function escapeXml(str) {
  return String(str === undefined || str === null ? '' : str)
    .replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
    .replace(/"/g,'&quot;').replace(/'/g,'&apos;');
}

// ---------- Platform column alias dictionaries ----------
const PLATFORM_ALIASES = {
  amazon: {
    orderId: ['order id','order-id','amazon order id'],
    orderDate: ['order date','order-date','purchase date'],
    invoiceNumber: ['invoice number','invoice no','invoice-number'],
    invoiceDate: ['invoice date','invoice-date'],
    hsn: ['hsn/sac','hsn code','hsn','hsncode'],
    qty: ['quantity','item quantity','qty'],
    itemDesc: ['item description','sku','product name','item-name'],
    taxableValue: ['taxable value','principal amount','item taxable value','taxable amount'],
    gstRate: ['tax rate','igst rate','cgst rate','gst rate','tax %'],
    cgst: ['cgst amount','cgst tax','cgst'],
    sgst: ['sgst amount','sgst tax','sgst','utgst amount'],
    igst: ['igst amount','igst tax','igst'],
    total: ['invoice amount','total amount','item total'],
    shipToState: ['ship to state','shiptostate','customer state','ship-to-state','bill-to-state'],
    customerGstin: ['customer bill to gstid','buyer gstin','gstin'],
    placeOfSupply: ['place of supply']
  },
  flipkart: {
    orderId: ['order id','order item id','order_id'],
    orderDate: ['order date','order approval date'],
    invoiceNumber: ['invoice number','tax invoice number','seller invoice number'],
    invoiceDate: ['invoice date','tax invoice date'],
    hsn: ['hsn code','hsn','hsn/sac'],
    qty: ['quantity','item quantity'],
    itemDesc: ['product title','item description','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','igst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','final invoice amount','total amount'],
    shipToState: ['customer state','buyer state','ship to state','delivery state'],
    customerGstin: ['customer gstin','buyer gstin'],
    placeOfSupply: ['place of supply']
  },
  meesho: {
    orderId: ['sub order no','order id','suborder no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value','total taxable value'],
    gstRate: ['gst rate','gst %'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','invoice amount'],
    shipToState: ['end customer state name','customer state','state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  generic: {
    orderId: ['order id','order no','order number'],
    orderDate: ['order date','date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn','hsn/sac'],
    qty: ['quantity','qty'],
    itemDesc: ['item description','description','product name','sku'],
    taxableValue: ['taxable value','taxable amount'],
    gstRate: ['gst rate','tax rate','rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total amount','invoice amount','total'],
    shipToState: ['customer state','ship to state','state','place of supply'],
    customerGstin: ['customer gstin','buyer gstin','gstin'],
    placeOfSupply: ['place of supply']
  },
  myntra: {
    orderId: ['order id','order item id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['style name','product name','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','total amount'],
    shipToState: ['customer state','delivery state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  snapdeal: {
    orderId: ['order code','order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product title','sku'],
    taxableValue: ['taxable value','base price'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','total amount'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  glowroad: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  limeroad: {
    orderId: ['order id','order no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku','style name'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','total amount'],
    shipToState: ['customer state','ship to state','delivery state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  jiomart: {
    orderId: ['order id','order no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn','hsn/sac'],
    qty: ['quantity'],
    itemDesc: ['item name','sku','product name'],
    taxableValue: ['taxable value','taxable amount'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','total amount'],
    shipToState: ['customer state','ship to state','delivery state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  tatacliq: {
    orderId: ['order id','order line id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product title','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state','delivery state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  ajio: {
    orderId: ['order id','order no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['style name','product name','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state','delivery state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  nykaa: {
    orderId: ['order id','order no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state','delivery state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  shopclues: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  snapmint: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  citymall: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  paytmmall: {
    orderId: ['order id','order no'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  shopsy: {
    orderId: ['order id','order item id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','tax invoice number'],
    invoiceDate: ['invoice date','tax invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product title','sku'],
    taxableValue: ['taxable value','assessable value'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','final invoice amount'],
    shipToState: ['customer state','buyer state','ship to state'],
    customerGstin: ['customer gstin','buyer gstin'],
    placeOfSupply: ['place of supply']
  },
  clubfactory: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  udaan: {
    orderId: ['order id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['customer state','buyer state','ship to state'],
    customerGstin: ['customer gstin','buyer gstin'],
    placeOfSupply: ['place of supply']
  },
  etsy: {
    orderId: ['order id','sale id'],
    orderDate: ['order date','sale date'],
    invoiceNumber: ['invoice number','order id'],
    invoiceDate: ['invoice date','sale date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['item name','title'],
    taxableValue: ['taxable value','item total'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value','order total'],
    shipToState: ['ship state','customer state','ship to state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  },
  indiamart: {
    orderId: ['order id','enquiry id'],
    orderDate: ['order date'],
    invoiceNumber: ['invoice number','invoice no'],
    invoiceDate: ['invoice date'],
    hsn: ['hsn code','hsn'],
    qty: ['quantity'],
    itemDesc: ['product name','sku'],
    taxableValue: ['taxable value'],
    gstRate: ['gst rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total invoice value'],
    shipToState: ['buyer state','customer state','ship to state'],
    customerGstin: ['buyer gstin','customer gstin'],
    placeOfSupply: ['place of supply']
  },
  shopify: {
    orderId: ['order id','name'],
    orderDate: ['created at','order date'],
    invoiceNumber: ['invoice number','order id','name'],
    invoiceDate: ['invoice date','created at'],
    hsn: ['hsn code','hsn'],
    qty: ['lineitem quantity','quantity'],
    itemDesc: ['lineitem name','product name'],
    taxableValue: ['taxable value','subtotal'],
    gstRate: ['gst rate','tax rate'],
    cgst: ['cgst amount','cgst'],
    sgst: ['sgst amount','sgst'],
    igst: ['igst amount','igst'],
    total: ['total','total invoice value'],
    shipToState: ['shipping province','shipping state','customer state'],
    customerGstin: ['customer gstin'],
    placeOfSupply: ['place of supply']
  }
};

function num(v) {
  if (v === null || v === undefined || v === '') return 0;
  const n = parseFloat(String(v).replace(/[₹,\s]/g,''));
  return isNaN(n) ? 0 : n;
}
function fmtINR(n) { return '₹' + Math.round(n).toLocaleString('en-IN'); }
