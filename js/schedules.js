/**
 * Grey Corner • Plannings & Règles Métier (Domaine)
 * Centralise et unifie la résolution des horaires prévus et le calcul des retards.
 */

// ─── PLANNING FIXE CUISINE (Hebdomadaire) ───
// 0 = Dimanche, 1 = Lundi, 2 = Mardi, 3 = Mercredi, 4 = Jeudi, 5 = Vendredi, 6 = Samedi
const PLANNING_CUISINE = {
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
    IMANE:   { hP: "10:00", off: false, shift: "10h — 18h" },
    ANAS:    { hP: "14:00", off: false, shift: "14h — F.S" },
    JAWAD:   { hP: "14:00", off: false, shift: "14h — F.S" },
    SAAD:    { hP: "13:00", off: false, shift: "13h — F.S" }
  },
  0: { // Dimanche
    NAOUAL:  { hP: "15:00", off: false, shift: "15h — F.S" },
    KHAOULA: { hP: "07:00", off: false, shift: "07h — 15h" },
    FATIMA:  { hP: "07:00", off: false, shift: "07h — 15h" },
    JIHANE:  { hP: "14:00", off: false, shift: "14h — F.S" },
    IMANE:   { hP: "10:00", off: false, shift: "10h — 18h" },
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

// ─── DÉTECTION POSTES & PERSONNELS SPÉCIFIQUES ───
function isMenageStaff(empOrId) {
  if(!empOrId) return false;
  if(typeof empOrId === "object") {
    const p = String(empOrId.poste || "").toUpperCase();
    return p === "MENAGE" || p === "MÉNAGE";
  }
  const emp = (typeof EQUIPE !== 'undefined' ? EQUIPE : []).find(e => empId(e) === empOrId);
  if(emp) {
    const p = String(emp.poste || "").toUpperCase();
    return p === "MENAGE" || p === "MÉNAGE";
  }
  const s = String(empOrId).toUpperCase();
  return s.includes("SBAI") || s.includes("ELGORRAMY") || s.includes("ABOUARSA");
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
  if(s.includes("SAAD") || s.includes("IDRISSI")) return "SAAD";
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

  // Ancre : 24 Septembre 2026 (mois 8 = Septembre)
  const dAnchor = Date.UTC(2026, 8, 24);
  const dTarget = Date.UTC(yy, mm - 1, dd);
  const diffDays = Math.round((dTarget - dAnchor) / 86400000);
  const mod = ((diffDays % 2) + 2) % 2;

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
 * horaire effectif, retard, sévérité du retard (léger <=30m vs saignant >30m), badges.
 */
function resolveEmployeeSchedule(emp, dateISO, currentData = {}) {
  const id = empId(emp);
  const safeHP = normalizeHHMM(currentData.hP || "");
  const safeHA = normalizeHHMM(currentData.hA || "");
  const isOff = currentData.off === true;

  const isSecurite = (emp.poste === "SECURITE" || emp.poste === "SÉCURITÉ");
  const isCuisine = (emp.poste === "CUISINE");
  const isSoumia = isSoumiaStaff(id);
  const isMenage = isMenageStaff(emp) || isMenageStaff(id);
  const isCaisseAlt = (isSalilStaff(id) || isBenkhadaStaff(id));

  const cuisinePlan = isCuisine ? getCuisinePlanningInfo(id, dateISO) : null;
  const soumiaPlan = isSoumia ? getSoumiaPlanning(dateISO) : null;
  const caissePlan = isCaisseAlt ? getCaisseAlternance(id, dateISO) : null;

  const [yy, mm, ddNum] = (dateISO || getMarocDate()).split('-').map(Number);
  const dt = new Date(Date.UTC(yy, mm - 1, ddNum));
  const isMonday = (dt.getUTCDay() === 1);

  // Détermination de l'heure effective de début (saisie ou planifiée)
  let effectiveHP = safeHP;
  if (!effectiveHP) {
    if (soumiaPlan && !soumiaPlan.off) effectiveHP = soumiaPlan.hP;
    else if (caissePlan && caissePlan.hP) effectiveHP = caissePlan.hP;
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
  const isLateLight = (isLate && lateMin <= 30);  // <= 30 min : Orange
  const isLateHeavy = (isLate && lateMin > 30);   // > 30 min : Rouge saignant

  const handled = isOff || hasHA;
  const incomplete = !isMenage && (
    (hasHA && !hasHP) ||
    (isOff && hasHA)
  );

  return {
    id,
    emp,
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
    isMenage,
    isSecurite,
    isCuisine,
    isSoumia,
    isCaisseAlt,
    isMonday,
    cuisinePlan,
    soumiaPlan,
    caissePlan
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
