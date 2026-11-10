/**
 * Grey Corner • Plannings & Règles Métier (Domaine)
 * Centralise et unifie la résolution des horaires prévus et le calcul des retards.
 */

// ─── PLANNING FIXE CUISINE (Hebdomadaire, synchronisable via settings/plannings) ───
// 0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi
let PLANNING_CUISINE = {
  1: { // Lundi
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 14h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 14h" },
    JIHANE:  { hP: "12:00", off: false, shift: "12h — 21h" },
    IMANE:   { hP: "",      off: true,  shift: "OFF" },
    ANAS:    { hP: "14:00", off: false, shift: "14h — F.S" },
    JAWAD:   { hP: "",      off: true,  shift: "OFF" },
    SAAD:    { hP: "14:00", off: false, shift: "14h — F.S" }
  },
  2: { // Mardi
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "",      off: true,  shift: "OFF" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 14h" },
    JIHANE:  { hP: "15:00", off: false, shift: "15h — F.S" },
    IMANE:   { hP: "07:00", off: false, shift: "07h — 14h" },
    ANAS:    { hP: "12:00", off: false, shift: "12h — 21h" },
    JAWAD:   { hP: "12:00", off: false, shift: "12h — 15h / 17h - F.S" },
    SAAD:    { hP: "",      off: true,  shift: "OFF" }
  },
  3: { // Mercredi
    NAOUAL:  { hP: "",      off: true,  shift: "OFF" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 14h" },
    FATIMA:  { hP: "",      off: true,  shift: "OFF" },
    JIHANE:  { hP: "14:00", off: false, shift: "14h — F.S" },
    IMANE:   { hP: "07:00", off: false, shift: "07h — 14h" },
    ANAS:    { hP: "",      off: true,  shift: "OFF" },
    JAWAD:   { hP: "15:00", off: false, shift: "15h — F.S" },
    SAAD:    { hP: "12:00", off: false, shift: "12h — 15h / 17h - F.S" }
  },
  4: { // Jeudi
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 14h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 14h" },
    JIHANE:  { hP: "",      off: true,  shift: "OFF" },
    IMANE:   { hP: "12:00", off: false, shift: "12h — 21h" },
    ANAS:    { hP: "15:00", off: false, shift: "15h — F.S" },
    JAWAD:   { hP: "12:00", off: false, shift: "12h — 21h" },
    SAAD:    { hP: "14:00", off: false, shift: "14h — F.S" }
  },
  5: { // Vendredi
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 14h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 14h" },
    JIHANE:  { hP: "12:00", off: false, shift: "12h — 15h / 17h - F.S" },
    IMANE:   { hP: "12:00", off: false, shift: "12h — 21h" },
    ANAS:    { hP: "13:00", off: false, shift: "13h — F.S" },
    JAWAD:   { hP: "14:00", off: false, shift: "14h — F.S" },
    SAAD:    { hP: "15:00", off: false, shift: "15h — F.S" }
  },
  6: { // Samedi
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 15h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 15h" },
    JIHANE:  { hP: "14:00", off: false, shift: "14h — F.S" },
    IMANE:   { hP: "11:00", off: false, shift: "10h — 18h" },
    ANAS:    { hP: "14:00", off: false, shift: "14h — F.S" },
    JAWAD:   { hP: "14:00", off: false, shift: "14h — F.S" },
    SAAD:    { hP: "13:00", off: false, shift: "13h — F.S" }
  },
  0: { // Dimanche
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 15h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 15h" },
    JIHANE:  { hP: "14:00", off: false, shift: "14h — F.S" },
    IMANE:   { hP: "11:00", off: false, shift: "10h — 18h" },
    ANAS:    { hP: "14:00", off: false, shift: "14h — F.S" },
    JAWAD:   { hP: "14:00", off: false, shift: "14h — F.S" },
    SAAD:    { hP: "14:00", off: false, shift: "14h — 21h" }
  }
};

// ─── HELPERS NORMALISATION ───
function normalizeKeyPart(x){
  return String(x || "").trim().toUpperCase().replace(/\s+/g, "_");
}

function normalizeLabelPart(x){
  return String(x || "").trim().toUpperCase().replace(/\s+/g, " ");
}

function empId(emp){
  return `${normalizeKeyPart(emp?.nom)}_${normalizeKeyPart(emp?.prenom)}`;
}

function empName(emp){
  return `${normalizeLabelPart(emp?.nom)} ${normalizeLabelPart(emp?.prenom)}`.trim();
}

function normalizeHHMM(v){
  const s = String(v || "").trim();
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s) ? s : "";
}

function timeToMin(t){
  if(!t || typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  if(Number.isNaN(h) || Number.isNaN(m)) return null;
  return h * 60 + m;
}

const getMarocDate = () =>
  new Intl.DateTimeFormat('fr-CA', {
    timeZone: 'GMT',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).format(new Date());

// ─── GESTION DE LA DATE D'AJOUT / DÉBUT DU COLLABORATEUR ───
function normalizeDateISO(val) {
  const s = String(val || "").trim();
  if (!s) return "";
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const mDMY = s.match(/^(\d{2})[\/-](\d{2})[\/-](\d{4})$/);
  if (mDMY) return `${mDMY[3]}-${mDMY[2]}-${mDMY[1]}`;
  const mYMD = s.match(/^(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})/);
  if (mYMD) return `${mYMD[1]}-${String(mYMD[2]).padStart(2, "0")}-${String(mYMD[3]).padStart(2, "0")}`;
  return "";
}

function getEmployeeStartDate(emp) {
  if (!emp || typeof emp !== "object") return "";
  const explicit = normalizeDateISO(emp.dateDebut || emp.dateAjout || emp.startDate || emp.createdAt || "");
  if (explicit) return explicit;
  return "";
}

function getEmployeeEndDate(emp) {
  if (!emp || typeof emp !== "object") return "";
  const explicit = normalizeDateISO(emp.dateSortie || emp.dateFin || emp.endDate || "");
  if (explicit) return explicit;
  return "";
}

function isEmployeeStartedOnDate(emp, dateISO) {
  if (!emp) return false;
  const start = getEmployeeStartDate(emp);
  if (start && dateISO && String(dateISO) < start) return false;
  const end = getEmployeeEndDate(emp);
  if (end && dateISO && String(dateISO) > end) return false;
  return true;
}

function getActiveEquipeForDate(dateISO, list) {
  const arr = Array.isArray(list) ? list : (typeof EQUIPE !== "undefined" ? EQUIPE : []);
  if (!dateISO) return arr;
  return arr.filter(emp => isEmployeeStartedOnDate(emp, dateISO));
}

// ─── PLANNING FIXE MÉNAGE (Alternance 2 semaines S1 / S2, surchargeable via settings/plannings) ───
// Équipe ménage : Hakima, Fouzia, Fatimaa (Najia sortie le 08/11/2026)
let MENAGE_PLANNING_DATA = {
  S1: {
    title: 'Semaine 01',
    schedules: [
      { day: 'lundi', matin: { staff: 'Fouzia' }, soir: { staff: 'Hakima' } },
      { day: 'mardi', matin: { staff: 'Hakima' }, soir: { staff: 'Fouzia' } },
      { day: 'mercredi', matin: { staff: 'Hakima' }, soir: { staff: 'Fouzia' } },
      { day: 'jeudi', matin: { staff: 'Fouzia' }, soir: { staff: 'Hakima' } },
      { day: 'vendredi', matin: { staff: 'Hakima / Fouzia' }, soir: { staff: 'Hakima / Fouzia' } },
      { day: 'samedi', matin: { staff: 'Hakima' }, soir: { staff: 'Fouzia' } },
      { day: 'dimanche', matin: { staff: 'Hakima / Fouzia' }, soir: { staff: 'Hakima / Fouzia' } },
    ]
  },
  S2: {
    title: 'Semaine 02',
    schedules: [
      { day: 'lundi', matin: { staff: 'Hakima' }, soir: { staff: 'Fouzia' } },
      { day: 'mardi', matin: { staff: 'Fouzia' }, soir: { staff: 'Hakima' } },
      { day: 'mercredi', matin: { staff: 'Hakima' }, soir: { staff: 'Fouzia' } },
      { day: 'jeudi', matin: { staff: 'Fouzia' }, soir: { staff: 'Hakima' } },
      { day: 'vendredi', matin: { staff: 'Hakima / Fouzia' }, soir: { staff: 'Hakima / Fouzia' } },
      { day: 'samedi', matin: { staff: 'Hakima / Fouzia' }, soir: { staff: 'Hakima / Fouzia' } },
      { day: 'dimanche', matin: { staff: 'Hakima / Fouzia' }, soir: { staff: 'Hakima / Fouzia' } },
    ]
  }
};

// ─── SYNCHRONISATION DYNAMIQUE DES PLANNINGS (Firebase settings/plannings + Secours localStorage) ───
const LOCAL_PLANNINGS_KEY = "gc_custom_plannings_v1";

function applyCustomPlannings(data) {
  if (!data || typeof data !== "object") return;
  if (data.cuisine && typeof data.cuisine === "object") {
    for (const dow of [0, 1, 2, 3, 4, 5, 6]) {
      if (data.cuisine[dow] && typeof data.cuisine[dow] === "object") {
        PLANNING_CUISINE[dow] = { ...PLANNING_CUISINE[dow], ...data.cuisine[dow] };
      }
    }
  }
  if (data.menage && typeof data.menage === "object") {
    if (data.menage.S1 && Array.isArray(data.menage.S1.schedules)) {
      MENAGE_PLANNING_DATA.S1 = data.menage.S1;
    }
    if (data.menage.S2 && Array.isArray(data.menage.S2.schedules)) {
      MENAGE_PLANNING_DATA.S2 = data.menage.S2;
    }
  }
}

function initCustomPlanningsFromLocal() {
  try {
    const rawLocal = typeof localStorage !== "undefined" ? localStorage.getItem(LOCAL_PLANNINGS_KEY) : null;
    if (rawLocal) {
      applyCustomPlannings(JSON.parse(rawLocal));
    }
  } catch (_) {}
}
initCustomPlanningsFromLocal();

function getMenageWeekKey(dateISO) {
  if (!dateISO) dateISO = (typeof getMarocDate === "function" ? getMarocDate() : new Date().toISOString().slice(0, 10));
  const [yy, mm, dd] = String(dateISO).split('-').map(Number);
  if (!yy || !mm || !dd) return 'S2';
  const cur = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = cur.getUTCDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const curMonday = new Date(cur);
  curMonday.setUTCDate(cur.getUTCDate() + diffToMonday);

  // Ancre de calibration : Semaine du Lundi 5 Octobre 2026 = Semaine 02 (S2)
  const anchorMonday = new Date(Date.UTC(2026, 9, 5)); // 9 = Octobre (0-indexé)
  const diffWeeks = Math.round((curMonday - anchorMonday) / (7 * 86400000));
  const mod = ((diffWeeks % 2) + 2) % 2;
  return (mod === 0) ? 'S2' : 'S1';
}

function getMenageStaffKey(empOrId) {
  if (!empOrId) return null;
  const s = (typeof empOrId === "object"
    ? `${empOrId.nom || ""} ${empOrId.prenom || ""}`
    : String(empOrId)
  ).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

  // Exclure NAJIA EL AZHARY (sortie le 08/11/2026) avant la détection de FOUZIA EZHAR ("AZHARY" contient "ZHAR")
  if (s.includes("NAJIA") || s.includes("AZHARY") || s.includes("ELAZHARY")) {
    return null;
  }
  // Exclure FATIMA ZAIR (Cuisine)
  if (s.includes("ZAIR")) {
    return null;
  }
  if (s.includes("HAKIMA") || s.includes("SBAI")) return "HAKIMA";
  if (s.includes("FOUZIA") || s.includes("EZHAR") || (s.includes("ZHAR") && !s.includes("AZHAR"))) return "FOUZIA";
  if (s.includes("FATIMAA") || (s.includes("FATIMA") && !s.includes("ZAIR"))) return "FATIMA";
  if (s.includes("SOUAD") || s.includes("GOURRAMY") || s.includes("GORRAMY")) return "SOUAD";

  // Membre ménage dynamique ajouté via settings/equipe
  if (typeof empOrId === "object") {
    const p = String(empOrId.poste || "").toUpperCase();
    if (p === "MENAGE" || p === "MÉNAGE") {
      const pName = (empOrId.prenom || empOrId.nom || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      if (pName) return pName;
    }
  }
  return null;
}

function isStaffInMenageShift(shiftStaffStr, empOrId) {
  if (!shiftStaffStr) return false;
  const staffKey = getMenageStaffKey(empOrId);
  if (!staffKey) return false;
  const s = String(shiftStaffStr).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (staffKey === "HAKIMA") return s.includes("HAKIMA") || s.includes("SBAI");
  if (staffKey === "FOUZIA") return s.includes("FOUZIA") || s.includes("EZHAR");
  if (staffKey === "FATIMA") return s.includes("FATIMA") || s.includes("FATIMAA");
  if (staffKey === "SOUAD") return s.includes("SOUAD") || s.includes("GOURRAMY") || s.includes("GORRAMY");
  return s.includes(staffKey);
}

function getMenagePlanningInfo(empOrId, dateISO) {
  if (!dateISO || !empOrId) return null;
  const staffKey = getMenageStaffKey(empOrId);
  if (!staffKey) return null;

  const [yy, mm, dd] = String(dateISO).split('-').map(Number);
  if (!yy || !mm || !dd) return null;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = dt.getUTCDay();

  const DAYS_MAP = { 1: 'lundi', 2: 'mardi', 3: 'mercredi', 4: 'jeudi', 5: 'vendredi', 6: 'samedi', 0: 'dimanche' };
  const dayName = DAYS_MAP[dayOfWeek];
  if (!dayName) return null;

  const weekKey = getMenageWeekKey(dateISO);
  const weekData = MENAGE_PLANNING_DATA[weekKey];
  if (!weekData) return null;

  const daySchedule = weekData.schedules.find(s => s.day === dayName);
  if (!daySchedule) return null;

  const inMatin = isStaffInMenageShift(daySchedule.matin.staff, empOrId);
  const inSoir = isStaffInMenageShift(daySchedule.soir.staff, empOrId);

  const isWeekend = (dayOfWeek === 5 || dayOfWeek === 6 || dayOfWeek === 0);
  const matinTime = "06:30";
  const soirTime = isWeekend ? "14:00" : "12:00";

  let shiftLabel = "Repos (OFF)";
  let hA = null;
  const off = !inMatin && !inSoir;

  if (inMatin && inSoir) {
    shiftLabel = `Double (${matinTime} + ${soirTime})`;
    hA = matinTime;
  } else if (inMatin) {
    shiftLabel = `Matin (${matinTime})`;
    hA = matinTime;
  } else if (inSoir) {
    shiftLabel = `Soir (${soirTime})`;
    hA = soirTime;
  }

  return {
    week: weekKey,
    title: weekData.title,
    day: dayName,
    staffKey,
    inMatin,
    inSoir,
    off,
    hA,
    hP: hA,
    shift: shiftLabel,
    isWeekend
  };
}

// ─── DÉTECTION POSTES & PERSONNELS SPÉCIFIQUES ───
function isMenageStaff(empOrId) {
  if (!empOrId) return false;
  if (typeof empOrId === "object") {
    const p = String(empOrId.poste || "").toUpperCase();
    return p === "MENAGE" || p === "MÉNAGE";
  }
  const emp = (typeof EQUIPE !== 'undefined' ? EQUIPE : []).find(e => empId(e) === empOrId);
  if (emp) {
    const p = String(emp.poste || "").toUpperCase();
    return p === "MENAGE" || p === "MÉNAGE";
  }
  const s = String(empOrId).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if (s.includes("ZAIR")) return false; // Cuisinière Fatima Zair
  return s.includes("SBAI") || s.includes("HAKIMA") || s.includes("FOUZIA") || s.includes("EZHAR") || s.includes("FATIMA") || s.includes("FATIMAA") || s.includes("SOUAD") || s.includes("GOURRAMY") || s.includes("GORRAMY");
}

function matchCuisineStaffKey(nameOrId) {
  if(!nameOrId) return null;
  const s = String(nameOrId).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  if(s.includes("NAOUAL") || s.includes("BOUCHNAK")) return "NAOUAL";
  if(s.includes("KHAOULA") || s.includes("BELQAS")) return "KHAOULA";
  if(s.includes("FATIMA") || s.includes("ZAIR")) return "FATIMA";
  if(s.includes("JIHANE") || s.includes("MAJDOUB")) return "JIHANE";
  if(s.includes("IMANE") || s.includes("MOUJAHID")) return "IMANE";
  if(s.includes("ANAS") || s.includes("BOURAHMA")) return "ANAS";
  if(s.includes("JAWAD") || s.includes("JAOUAD") || s.includes("LEMSSIEH") || s.includes("LAMSSIAH")) return "JAWAD";
  if(s.includes("SAAD") || (s.includes("IDRISSI") && !s.includes("KARIMA") && !s.includes("SERGINI") && (s.includes("OUDGHRI") || s.includes("OUDGHIRI") || s.includes("SAAD")))) return "SAAD";
  return null;
}

function getCuisinePlanningInfo(empKeyOrName, dateISO) {
  if(!dateISO) return null;
  const memberKey = matchCuisineStaffKey(empKeyOrName);
  if(!memberKey) return null;
  const [yy, mm, dd] = String(dateISO).split('-').map(Number);
  if(!yy || !mm || !dd) return null;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = dt.getUTCDay();
  return PLANNING_CUISINE[dayOfWeek]?.[memberKey] || null;
}

function isSoumiaStaff(idOrName) {
  if(!idOrName) return false;
  const s = String(idOrName).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("SOUMIA") || s.includes("NHAILI") || s.includes("NHAJLI") || s.includes("ENNHAILI");
}

function getSoumiaPlanning(dateISO) {
  if(!dateISO) return null;
  const [yy, mm, dd] = String(dateISO).split('-').map(Number);
  if(!yy || !mm || !dd) return null;
  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = dt.getUTCDay();
  if(dayOfWeek === 2) {
    return { off: true, hP: null, shift: "OFF" };
  }
  return { off: false, hP: "09:00", shift: "09:00" };
}

function isSalilStaff(idOrName) {
  if(!idOrName) return false;
  const s = String(idOrName).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("SALIL") || s.includes("SALIH") || s.includes("HOUDA");
}

function isBenkhadaStaff(idOrName) {
  if(!idOrName) return false;
  const s = String(idOrName).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  return s.includes("BENKHADA") || s.includes("ABDESLAM") || s.includes("ABDESSLAM") || s.includes("ABDELSSAM");
}

function getCaisseAlternance(idOrName, dateISO) {
  if(!dateISO) return null;
  const [yy, mm, dd] = String(dateISO).split('-').map(Number);
  if(!yy || !mm || !dd) return null;
  const isSal = isSalilStaff(idOrName);
  const isBen = isBenkhadaStaff(idOrName);
  if(!isSal && !isBen) return null;

  const dt = new Date(Date.UTC(yy, mm - 1, dd));
  const isMonday = (dt.getUTCDay() === 1);

  // Ancre : 24 Septembre 2026 (mois 8 = Septembre)
  const dAnchor = Date.UTC(2026, 8, 24);
  const dTarget = Date.UTC(yy, mm - 1, dd);
  const diffDays = Math.round((dTarget - dAnchor) / 86400000);
  const mod = ((diffDays % 2) + 2) % 2;

  // mod === 0 : Salil Matin (07:30), Benkhada Soir (15:00)
  // mod === 1 : Salil Soir (15:00), Benkhada Matin (07:30)
  const habituelSoir = (mod === 0) ? isBen : isSal;

  // Règle spécifique Lundi : celui qui a d'habitude le shift du soir est en repos (OFF)
  if (isMonday && habituelSoir) {
    return { hP: null, off: true, shift: "OFF" };
  }

  if(mod === 0) {
    return isSal
      ? { hP: "07:30", off: false, shift: "07:30" }
      : { hP: "15:00", off: false, shift: "15:00" };
  } else {
    return isSal
      ? { hP: "15:00", off: false, shift: "15:00" }
      : { hP: "07:30", off: false, shift: "07:30" };
  }
}

// ─── PARSEURS GOOGLE SHEETS CSV ───
function parseSheetCsvLine(line) {
  const out = []; let cur = ""; let inQ = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQ && line[i+1] === '"') { cur += '"'; i++; } else inQ = !inQ;
      continue;
    }
    if (ch === ',' && !inQ) { out.push(cur.trim()); cur = ""; continue; }
    cur += ch;
  }
  out.push(cur.trim());
  return out;
}

function parseSheetDateLabel(label) {
  if (!label) return null;
  let s = String(label).toLowerCase().trim();
  s = s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/\./g, "");

  let m = s.match(/\b(\d{4})[\/-](\d{1,2})[\/-](\d{1,2})\b/);
  if (m) { const d = new Date(+m[1], +m[2]-1, +m[3]); d.setHours(0,0,0,0); return d; }
  m = s.match(/\b(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})\b/);
  if (m) { const d = new Date(+m[3], +m[2]-1, +m[1]); d.setHours(0,0,0,0); return d; }

  // Format JJ/MM sans année explicite -> année courante
  m = s.match(/\b(\d{1,2})[\/-](\d{1,2})\b/);
  if (m) {
    const day = +m[1];
    const month = +m[2];
    if (day >= 1 && day <= 31 && month >= 1 && month <= 12) {
      const d = new Date(new Date().getFullYear(), month - 1, day);
      d.setHours(0, 0, 0, 0);
      return d;
    }
  }

  const months = {
    "janvier":0,"janv":0, "fevrier":1,"fev":1, "mars":2, "mar":2, "avril":3,"avr":3,
    "mai":4, "juin":5, "juillet":6,"juil":6, "aout":7, "septembre":8,"sept":8,
    "octobre":9,"oct":9, "novembre":10,"nov":10, "decembre":11,"dec":11
  };

  m = s.match(/\b(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?/);
  if (m) {
    const day = +m[1];
    const monthName = m[2];
    const year = m[3] ? +m[3] : new Date().getFullYear();
    if (months.hasOwnProperty(monthName)) {
      const d = new Date(year, months[monthName], day);
      d.setHours(0,0,0,0);
      return d;
    }
  }
  return null;
}

function isStaffInSheetShift(shiftStr, emp) {
  if(!shiftStr || !shiftStr.trim() || shiftStr === "-" || shiftStr.includes("— Repos —")) return false;
  const s = shiftStr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const nom = String(emp.nom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const prenom = String(emp.prenom || "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const fullName = `${nom} ${prenom}`;

  const words = fullName.split(/[\s_-]+/).filter(w => w.length >= 3 && w !== "el" && w !== "al");
  for (const w of words) {
    if (s.includes(w)) return true;
  }

  if ((fullName.includes("laziz") || fullName.includes("alaoui") || fullName.includes("aziz")) && (s.includes("aziz") || s.includes("laziz"))) return true;
  if ((fullName.includes("mokhtar") || fullName.includes("ktami")) && s.includes("mokhtar")) return true;
  if ((fullName.includes("zakaria") || fullName.includes("kafouni")) && (s.includes("zakaria") || s.includes("zakariae"))) return true;
  if ((fullName.includes("mostafa") || fullName.includes("mustapha") || fullName.includes("elkobbi")) &&
      (s.includes("mostafa") || s.includes("mustapha") || s.includes("mosatafe"))) return true;
  if ((fullName.includes("anas") || fullName.includes("bourahma")) && (s.includes("anas") || s.includes("anass"))) return true;

  return false;
}

// ─── RÉSOLUTION UNIFIÉE DU PLANNING & CALCUL DES RETARDS (DRY) ───
/**
 * Calcule l'état complet d'un employé pour une date donnée :
 * horaire effectif, retard, sévérité du retard (léger <=15m vs saignant >15m), badges.
 */
function resolveEmployeeSchedule(emp, dateISO, currentData = {}) {
  const id = empId(emp);
  const startDate = getEmployeeStartDate(emp);
  const endDate = getEmployeeEndDate(emp);
  const notStartedYet = !!(startDate && dateISO && String(dateISO) < startDate);
  const alreadyEnded = !!(endDate && dateISO && String(dateISO) > endDate);

  if (notStartedYet || alreadyEnded) {
    return {
      id,
      emp,
      startDate,
      endDate,
      notStartedYet,
      alreadyEnded,
      safeHP: "",
      safeHA: "",
      effectiveHP: "",
      displayHP: "",
      hasHA: false,
      hasHP: false,
      isOff: false,
      isLate: false,
      isLateLight: false,
      isLateHeavy: false,
      lateMin: null,
      handled: true,
      incomplete: false,
      isAutoPunched: false,
      motif: "",
      isMenage: isMenageStaff(emp) || isMenageStaff(id),
      isSecurite: (emp.poste === "SECURITE" || emp.poste === "SÉCURITÉ"),
      isCuisine: (emp.poste === "CUISINE"),
      isSoumia: isSoumiaStaff(id),
      isCaisseAlt: (isSalilStaff(id) || isBenkhadaStaff(id)),
      isMonday: false,
      cuisinePlan: null,
      soumiaPlan: null,
      caissePlan: null,
      menagePlan: null
    };
  }

  // ─── PRISE EN COMPTE DES ARRÊTS MALADIE JUSTIFIÉS (M) ───
  const isMaladie = (typeof isExplicitMaladie === "function")
    ? isExplicitMaladie(currentData)
    : (currentData.maladie === true || String(currentData.statut || "").toUpperCase() === "MALADIE" || String(currentData.statut || "").toUpperCase() === "M");

  if (isMaladie) {
    const motifMaladie = String(currentData.motifMaladie || currentData.motif || "")
      .replace(/^\[MALADIE\]\s*:?\s*/i, "")
      .trim();
    return {
      id,
      emp,
      startDate,
      notStartedYet: false,
      isMaladie: true,
      motifMaladie,
      safeHP: "",
      safeHA: "",
      effectiveHP: "",
      displayHP: "🩺 Arrêt Maladie",
      hasHA: false,
      hasHP: false,
      isOff: false,
      isLate: false,
      isLateLight: false,
      isLateHeavy: false,
      lateMin: null,
      handled: true, // Collaborateur traité (justifié en maladie), PAS en attente de pointage !
      incomplete: false,
      isAutoPunched: false,
      motif: motifMaladie,
      isMenage: (typeof isMenageStaff === "function") && (isMenageStaff(emp) || isMenageStaff(id)),
      isSecurite: (emp.poste === "SECURITE" || emp.poste === "SÉCURITÉ"),
      isCuisine: (emp.poste === "CUISINE"),
      isSoumia: (typeof isSoumiaStaff === "function") && isSoumiaStaff(id),
      isCaisseAlt: (typeof isSalilStaff === "function" && typeof isBenkhadaStaff === "function") && (isSalilStaff(id) || isBenkhadaStaff(id)),
      isMonday: false,
      cuisinePlan: null,
      soumiaPlan: null,
      caissePlan: null,
      menagePlan: null
    };
  }

  const safeHP = normalizeHHMM(currentData.hP || "");
  let safeHA = normalizeHHMM(currentData.hA || "");
  let isOff = currentData.off === true;

  const isSecurite = (emp.poste === "SECURITE" || emp.poste === "SÉCURITÉ");
  const isCuisine = (emp.poste === "CUISINE");
  const isSoumia = isSoumiaStaff(id);
  const isMenage = isMenageStaff(emp) || isMenageStaff(id);
  const isCaisseAlt = (isSalilStaff(id) || isBenkhadaStaff(id));

  const cuisinePlan = isCuisine ? getCuisinePlanningInfo(id, dateISO) : null;
  const soumiaPlan = isSoumia ? getSoumiaPlanning(dateISO) : null;
  const caissePlan = isCaisseAlt ? getCaisseAlternance(id, dateISO) : null;
  const menagePlan = isMenage ? getMenagePlanningInfo(emp, dateISO) : null;

  // ─── POINTAGE AUTOMATIQUE DU MÉNAGE SELON PLANNING MÉNAGE ───
  let isAutoPunched = false;
  if (isMenage && menagePlan) {
    const hasExplicitPunch = !!safeHA;
    const hasExplicitOff = (currentData.off === true);
    const wasExplicitlyCleared = !!(currentData.lastEditAt && !currentData.hA && currentData.off !== true);

    if (!hasExplicitPunch && !hasExplicitOff && !wasExplicitlyCleared) {
      if (menagePlan.off) {
        isOff = true;
        safeHA = "";
        isAutoPunched = true;
      } else if (menagePlan.hA) {
        safeHA = menagePlan.hA;
        isOff = false;
        isAutoPunched = true;
      }
    }
  }

  const [yy, mm, ddNum] = (dateISO || getMarocDate()).split('-').map(Number);
  const dt = new Date(Date.UTC(yy, mm - 1, ddNum));
  const isMonday = (dt.getUTCDay() === 1);

  // Détermination de l'heure effective de début (saisie ou planifiée)
  let effectiveHP = safeHP;
  if (!effectiveHP) {
    if (isMenage && menagePlan && !menagePlan.off) effectiveHP = menagePlan.hA;
    else if (soumiaPlan && !soumiaPlan.off) effectiveHP = soumiaPlan.hP;
    else if (caissePlan && !caissePlan.off && caissePlan.hP) effectiveHP = caissePlan.hP;
    else if (isSecurite && !isMonday) effectiveHP = "09:00";
    else if (cuisinePlan && !cuisinePlan.off) effectiveHP = cuisinePlan.hP;
  }

  // Calcul du retard en minutes
  let lateMin = null;
  if (!isMenage && !noLateCalcIds.includes(id) && safeHA && effectiveHP) {
    const pMin = timeToMin(effectiveHP);
    const aMin = timeToMin(safeHA);
    if (pMin !== null && aMin !== null) {
      lateMin = Math.max(0, aMin - pMin);
    }
  }

  const hasHA = !!safeHA;
  const hasHP = !!effectiveHP;
  const isLate = (lateMin !== null && lateMin > 0);
  const isLateLight = (isLate && lateMin <= 15);  // <= 15 min : Orange (tolérance retard léger)
  const isLateHeavy = (isLate && lateMin > 15);   // > 15 min : Rouge saignant (retard avéré)

  const handled = isOff || hasHA;
  const incomplete = !isMenage && (
    (hasHA && !hasHP) ||
    (isOff && hasHA)
  );

  return {
    id,
    emp,
    startDate,
    endDate,
    notStartedYet: false,
    alreadyEnded: false,
    safeHP,
    safeHA,
    effectiveHP: effectiveHP || "",
    displayHP: effectiveHP || "",
    hasHA,
    hasHP,
    isOff,
    isLate,
    isLateLight,
    isLateHeavy,
    lateMin,
    handled,
    incomplete,
    isAutoPunched,
    motif: (isLate && lateMin > 0) ? String(currentData.motif || "").trim() : "",
    isMenage,
    isSecurite,
    isCuisine,
    isSoumia,
    isCaisseAlt,
    isMonday,
    cuisinePlan,
    soumiaPlan,
    caissePlan,
    menagePlan
  };
}

/**
 * Calcul des minutes de retard pour compatibilité avec le code existant
 */
function lateMinutes(hP, hA, id = null, date = null){
  if(id && (noLateCalcIds.includes(id) || isMenageStaff(id))) return null;
  if(!hA) return null;
  let effectiveHP = hP;
  if(!effectiveHP && id){
    const emp = (typeof EQUIPE !== 'undefined' ? EQUIPE : []).find(x => empId(x) === id);
    if(emp) {
      const selectedDate = date || (typeof document !== 'undefined' && document.getElementById('datePicker')?.value);
      const res = resolveEmployeeSchedule(emp, selectedDate, { hP, hA });
      return res.lateMin;
    }
  }
  const p = timeToMin(effectiveHP);
  const a = timeToMin(hA);
  if(p === null || a === null) return null;
  return Math.max(0, a - p);
}

function fmtLate(min){
  if(min === null) return "—";
  if(min <= 0) return "À l'heure";
  return `+${min} min`;
}

// ─── GESTION DES PHOTOS DES COLLABORATEURS ───
const PHOTO_MAP = {
  "ALAOUI_LAZIZ": "images/HAMID_ALAOUI_ABDELAZIZ.jpg",
  "BELQASSE_KHAOULA": "images/BELQASIM_KHAOULA.jpg",
  "BENKHADA_ABDESLAM": "images/BENKHADA_ABDESSLAM.jpg",
  "BOUCHNAK_NAOUAL": "images/BOUCHNAK_NAOUAL.jpg",
  "BOURAHMA_ANAS": "images/BOURAHMA_ANAS.jpg",
  "CHKAIRI_YOUSSEF": "images/CHKAIRI_YOUSSEF.jpg",
  "ELKOBBI_MOSTAFA": "images/EL_KOBBI_MOSTAFA.jpg",
  "EL_KOBBI_MOSTAFA": "images/EL_KOBBI_MOSTAFA.jpg",
  "ENNHAILI_SOUMIA": "images/EN-NHAILI_SOUMIA.jpg",
  "EN_NHAILI_SOUMIA": "images/EN-NHAILI_SOUMIA.jpg",
  "HATTAF_MOHAMED": "images/HATTAF_MOHAMMED.jpg",
  "HIDARA_YOUSSEF": "images/HIDARA-LACHKAR_YOUSSEF.jpg",
  "IDRISSI_SAAD": "images/IDRISSI_OUDGHRI_SAAD.jpg",
  "IDRISSI_OUDGHRI_SAAD": "images/IDRISSI_OUDGHRI_SAAD.jpg",
  "OUDGHRI_SAAD": "images/IDRISSI_OUDGHRI_SAAD.jpg",
  "SAAD_IDRISSI": "images/IDRISSI_OUDGHRI_SAAD.jpg",
  "SERGINI_IDRISSI_KARIMA": "images/SERGINI_IDRISSI_KARIMA.jpg",
  "SERGINI_KARIMA": "images/SERGINI_IDRISSI_KARIMA.jpg",
  "SERGINI": "images/SERGINI_IDRISSI_KARIMA.jpg",
  "KARIMA_SERGINI": "images/SERGINI_IDRISSI_KARIMA.jpg",
  "IDRISSI_KARIMA": "images/SERGINI_IDRISSI_KARIMA.jpg",
  "KAFOUNI_ZAKARIAE": "images/KAFOUNI_ZAKARIAE.jpg",
  "KHALOUQ_RACHID": "images/KHALOUQ_RACHID.jpg",
  "KTAMI_EL_MOKHTAR": "images/Mokhtar.jpg",
  "LEMSSIEH_JAWAD": "images/LAMSSIAH_JAOUAD.jpg",
  "MAJDOUB_JIHANE": "images/MAJDOUB_JIHANE.jpg",
  "MOHSINE_YOUNESS": "images/MOHSSINE_YOUNESS.jpg",
  "MOUJAHID_IMANE": "images/MOUJAHID_IMANE.jpg",
  "SALIL_HOUDA": "images/SALIL_HOUDA.jpg",
  "SBAI_HAKIMA": "images/SBAI_HAKIMA.jpg",
  "ZAIR_FATIMA": "images/ZAIR_FATIMA.jpg",
  "QUASSIR_HICHAM": "images/QUASSIR_HICHAM.jpg",
  "EL_MOBARAKI_MOHAMED": "images/EL_MOBARAKI_MOHAMED.jpg",
  "JIRA_MOHAMED": "images/JIRA_MOHAMED.jpg",
  "BAJJOU": "images/BAJJOU.jpeg",
  "WALID": "images/WALID.jpg",
  "FOUZIA": "images/FOUZIA.jpg",
  "EZHAR_FOUZIA": "images/FOUZIA.jpg",
  "FOUZIA_EZHAR": "images/FOUZIA.jpg",
  "EL_GOURRAMY_SOUAD": "images/ELGORRAMY_SOUAD.jpg",
  "ELGOURRAMY_SOUAD": "images/ELGORRAMY_SOUAD.jpg",
  "EL_GORRAMY_SOUAD": "images/ELGORRAMY_SOUAD.jpg",
  "GOURRAMY_SOUAD": "images/ELGORRAMY_SOUAD.jpg",
  "SOUAD": "images/ELGORRAMY_SOUAD.jpg"
};

const KNOWN_IMAGE_FILES = [
  "BAJJOU.jpeg",
  "BELQASIM_KHAOULA.jpg",
  "BENKHADA_ABDESSLAM.jpg",
  "BOUCHNAK_NAOUAL.jpg",
  "BOURAHMA_ANAS.jpg",
  "CHKAIRI_YOUSSEF.jpg",
  "EL_KOBBI_MOSTAFA.jpg",
  "EL_MOBARAKI_MOHAMED.jpg",
  "ELGORRAMY_SOUAD.jpg",
  "EN-NHAILI_SOUMIA.jpg",
  "FOUZIA.jpg",
  "FOUZIA6ZHAR.jpg",
  "HAMID_ALAOUI_ABDELAZIZ.jpg",
  "HATTAF_MOHAMMED.jpg",
  "HIDARA-LACHKAR_YOUSSEF.jpg",
  "IDRISSI_OUDGHRI_SAAD.jpg",
  "JIRA_MOHAMED.jpg",
  "KAFOUNI_ZAKARIAE.jpg",
  "KHALOUQ_RACHID.jpg",
  "LAMSSIAH_JAOUAD.jpg",
  "MAJDOUB_JIHANE.jpg",
  "MOHSSINE_YOUNESS.jpg",
  "Mokhtar.jpg",
  "MOUJAHID_IMANE.jpg",
  "QUASSIR_HICHAM.jpg",
  "SALIL_HOUDA.jpg",
  "SBAI_HAKIMA.jpg",
  "SERGINI_IDRISSI_KARIMA.jpg",
  "WALID.jpg",
  "ZAIR_FATIMA.jpg"
];

function getInitialsAvatar(emp) {
  const nom = (emp?.nom || "").trim();
  const prenom = (emp?.prenom || "").trim();
  const initials = `${prenom[0] || ""}${nom[0] || ""}`.toUpperCase() || "GC";
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">`
    + `<rect width="100" height="100" rx="24" fill="#0f172a"/>`
    + `<text x="50" y="58" font-family="system-ui, -apple-system, sans-serif" font-size="36" font-weight="800" fill="#c5a059" text-anchor="middle" dominant-baseline="middle">${initials}</text>`
    + `</svg>`;
  try {
    if (typeof btoa === "function") {
      return "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svg)));
    }
  } catch (e) {}
  return "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
}

function handleImgError(img, empIdStr) {
  if (!img) return;
  img.onerror = null;
  const empList = (typeof EQUIPE !== "undefined" && EQUIPE.length) ? EQUIPE : (typeof DEFAULT_EQUIPE !== "undefined" ? DEFAULT_EQUIPE : []);
  const emp = empList.find(e => empId(e) === empIdStr);
  img.src = getInitialsAvatar(emp);
}

function getCollaboratorPhoto(emp) {
  if (!emp) return getInitialsAvatar(null);
  const id = empId(emp);
  const cleanNom = String(emp.nom || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const cleanPrenom = String(emp.prenom || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
  const fullStr = `${cleanNom}_${cleanPrenom}`;

  // Détection explicite prioritaire pour Karima Sergini Idrissi et Saad Idrissi
  if (fullStr.includes("KARIMA") || fullStr.includes("SERGINI")) {
    return "images/SERGINI_IDRISSI_KARIMA.jpg";
  }
  if (fullStr.includes("SAAD") || fullStr.includes("OUDGHRI")) {
    return "images/IDRISSI_OUDGHRI_SAAD.jpg";
  }

  // 1. Recherche dans le dictionnaire direct
  if (PHOTO_MAP[id]) return PHOTO_MAP[id];

  // 2. Recherche par variantes de clés
  for (const [k, url] of Object.entries(PHOTO_MAP)) {
    if (cleanNom && cleanPrenom && k.includes(cleanNom) && k.includes(cleanPrenom)) return url;
  }

  // 3. Recherche floue dans les fichiers connus
  const words = `${cleanNom} ${cleanPrenom}`.split(/[\s_-]+/).filter(w => w.length >= 3 && w !== "EL" && w !== "AL");
  let bestMatch = null;
  let bestScore = 0;

  for (const file of KNOWN_IMAGE_FILES) {
    const fileNorm = file.toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");

    // Protection anti-collision entre homonymes / noms partagés
    if ((words.includes("KARIMA") || words.includes("SERGINI")) && fileNorm.includes("SAAD")) continue;
    if (words.includes("SAAD") && (fileNorm.includes("KARIMA") || fileNorm.includes("SERGINI"))) continue;

    let score = 0;
    for (const w of words) {
      if (fileNorm.includes(w)) score += 2;
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = file;
    }
  }

  if (bestMatch && bestScore >= 2) {
    return `images/${bestMatch}`;
  }

  // 4. Fallback vers avatar avec initiales
  return getInitialsAvatar(emp);
}
