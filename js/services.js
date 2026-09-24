/**
 * Grey Corner • Services (Firebase, API Google Sheets, Exportations & Sync)
 */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const __exportTimers = new Map();

function uiExportMsg(text, ok = true) {
  const el = document.getElementById("exportMsg");
  if (!el) return;
  el.textContent = text;
  el.classList.remove("hidden");
  el.style.color = ok ? "#64748b" : "#b91c1c";
  clearTimeout(uiExportMsg._t);
  uiExportMsg._t = setTimeout(() => el.classList.add("hidden"), 1800);
}

function buildQuery(params) {
  return Object.keys(params)
    .filter(k => params[k] !== undefined && params[k] !== null)
    .map(k => `${encodeURIComponent(k)}=${encodeURIComponent(String(params[k]))}`)
    .join("&");
}

function exportToSheet(action, payload) {
  const params = { action, secret: EXPORT_SECRET, timestamp: Date.now(), ...payload };
  const url = `${EXPORT_URL}?${buildQuery(params)}`;
  try {
    const img = new Image();
    img.onload = () => uiExportMsg("Export Google Sheet ✅", true);
    img.onerror = () => uiExportMsg("Export Google Sheet ✅", true);
    img.src = url;
    uiExportMsg("Export Google Sheet…", true);
    return true;
  } catch (e) {
    console.log("EXPORT FAIL:", e);
    uiExportMsg("Export Google Sheet ❌", false);
    return false;
  }
}

function schedulePresenceExport(empKey, name, selectedDate, data) {
  const key = `${selectedDate}__${empKey}`;
  clearTimeout(__exportTimers.get(key));
  __exportTimers.set(key, setTimeout(() => {
    const safeHP = normalizeHHMM(data.hP);
    const safeHA = normalizeHHMM(data.hA);

    console.log("EXPORT PRESENCE ->", {
      date: selectedDate,
      empKey,
      name,
      hP: safeHP,
      hA: safeHA,
      off: data.off,
      retard: data.retard,
      retardMin: data.retardMin
    });

    exportToSheet("presence", {
      date: selectedDate,
      empKey,
      name,
      hP: safeHP,
      hA: safeHA,
      off: (typeof data.off === "boolean" ? data.off : ""),
      retard: (typeof data.retard === "boolean" ? data.retard : ""),
      retardMin: (typeof data.retardMin === "number" ? data.retardMin : "")
    });
  }, 350));
}

// ─── PERMISSIONS RÔLES ───
function isGerant() { return role === "gerant"; }
function isEquipe() { return role === "equipe"; }

function canEquipeEditToday(selectedDate) {
  return isEquipe() && selectedDate === getMarocDate();
}

function canEditOFF(selectedDate) {
  return isGerant() || canEquipeEditToday(selectedDate);
}

function canEditHP(id, selectedDate) {
  return isGerant() || canEquipeEditToday(selectedDate);
}

function canEditHA(id, selectedDate) {
  if (isGerant()) return true;
  if (isMenageStaff(id)) return true;
  if (selectedDate !== getMarocDate()) return false;
  return haExceptionsToday.includes(id);
}

// ─── NORMALISATION SNAPSHOT ÉQUIPE ───
function normalizeEquipeSnapshot(val) {
  if (!val) return [];
  const arr = Array.isArray(val)
    ? val.filter(Boolean)
    : Object.keys(val).sort((a, b) => Number(a) - Number(b)).map(k => val[k]).filter(Boolean);

  const cleaned = arr
    .map(x => ({
      nom: normalizeLabelPart(x?.nom),
      prenom: normalizeLabelPart(x?.prenom),
      poste: normalizeLabelPart(x?.poste),
      dateDebut: String(x?.dateDebut || "").trim()
    }))
    .filter(x => x.nom && x.prenom && x.poste);

  const seen = new Set();
  const out = [];
  for (const e of cleaned) {
    const id = `${normalizeKeyPart(e.nom)}_${normalizeKeyPart(e.prenom)}`;
    if (seen.has(id)) continue;
    seen.add(id);
    out.push(e);
  }
  return out;
}

function mergeEmpMaps(a, b) {
  const out = JSON.parse(JSON.stringify(a || {}));
  Object.keys(b || {}).forEach(empId => {
    out[empId] = { ...(out[empId] || {}), ...(b[empId] || {}) };
  });
  return out;
}

async function fetchRole(uid) {
  const snap = await database.ref("users/" + uid).once("value");
  return snap.val() || null;
}

// ─── MUTATIONS DE PRÉSENCE & POINTAGES (UPD) ───
async function upd(id, f, v) {
  const date = document.getElementById('datePicker').value;
  const emp = EQUIPE.find(x => empId(x) === id);
  const name = emp ? empName(emp) : "";

  if (f === "off") {
    if (!canEditOFF(date)) return;
    const val = !!v;
    const ref = database.ref('presences/' + date + '/' + id);

    const payload = { off: val };
    if (val === true) {
      payload.hA = null;
      payload.retard = null;
      payload.retardMin = null;
      payload.on = false;
    }

    try {
      await ref.update(payload);

      const cur = latestDataCache[id] || {};
      schedulePresenceExport(id, name, date, {
        hP: cur.hP || "",
        hA: val ? "" : (cur.hA || ""),
        off: val,
        retard: val ? false : (cur.retard ?? false),
        retardMin: val ? 0 : (cur.retardMin ?? 0)
      });
    } catch (e) {
      console.warn("Write blocked:", id, f, e);
    }
    return;
  }

  if (f === "hP") {
    if (!canEditHP(id, date)) return;

    const hp = normalizeHHMM(v);
    if (hp) {
      saveHPHistory(id, hp);
    }
    const ref = database.ref('presences/' + date + '/' + id);

    try {
      await ref.update({ hP: hp || null });

      const cur = latestDataCache[id] || {};
      const hA = normalizeHHMM(cur.hA || "");
      const lm = lateMinutes(hp, hA, id, date);
      const isLate = (lm !== null && lm > 0);

      schedulePresenceExport(id, name, date, {
        hP: hp || "",
        hA: hA || "",
        off: (typeof cur.off === "boolean" ? cur.off : ""),
        retard: (hA ? !!isLate : ""),
        retardMin: (hA ? (lm || 0) : "")
      });
    } catch (e) {
      console.warn("Write blocked:", id, f, e);
    }
    return;
  }

  if (f === "hA") {
    const selectedDate = date;
    const hA = normalizeHHMM(v);
    const hP = normalizeHHMM((presencesCache[id]?.hP) || (latestDataCache[id]?.hP) || "");
    const lm = lateMinutes(hP, hA, id, selectedDate);
    const isLate = (lm !== null && lm > 0);
    const now = Date.now();

    try {
      if (isGerant()) {
        const refPunch = database.ref('punches/' + selectedDate + '/' + id);
        const payloadPunch = {
          empKey: id,
          hA: hA || null,
          retard: !!(hA && isLate),
          retardMin: hA ? (lm || 0) : 0,
          timestamp: now
        };
        if (hA) await refPunch.set(payloadPunch);
        else await refPunch.remove();

        const refPres = database.ref('presences/' + selectedDate + '/' + id);
        const payloadPres = hA ? {
          hA: hA,
          off: false,
          retard: !!isLate,
          retardMin: (lm || 0),
          timestamp: now,
          lastEditAt: now,
          lastEditByAdmin: true
        } : {
          hA: null,
          retard: null,
          retardMin: null,
          timestamp: null,
          lastEditAt: now,
          lastEditByAdmin: true
        };
        await refPres.update(payloadPres);

        schedulePresenceExport(id, name, selectedDate, {
          hP: hP || "",
          hA: hA || "",
          off: (hA ? false : (typeof (latestDataCache[id]?.off) === "boolean" ? latestDataCache[id].off : "")),
          retard: (hA ? !!isLate : ""),
          retardMin: (hA ? (lm || 0) : "")
        });
        return;
      }

      if (!canEditHA(id, selectedDate)) {
        console.warn("Equipe cannot edit hA:", id);
        return;
      }

      const refPres = database.ref('presences/' + selectedDate + '/' + id);
      const payload = hA ? {
        hA: hA,
        off: false,
        retard: !!isLate,
        retardMin: (lm || 0),
        timestamp: now,
        lastEditAt: now,
        lastEditByAdmin: false
      } : {
        hA: null,
        retard: null,
        retardMin: null,
        timestamp: null,
        lastEditAt: now,
        lastEditByAdmin: false
      };
      await refPres.update(payload);

      schedulePresenceExport(id, name, selectedDate, {
        hP: hP || "",
        hA: hA || "",
        off: (typeof (latestDataCache[id]?.off) === "boolean" ? latestDataCache[id]?.off : ""),
        retard: (hA ? !!isLate : ""),
        retardMin: (hA ? (lm || 0) : "")
      });

    } catch (e) {
      console.warn("hA write blocked:", id, e);
    }
    return;
  }

  try {
    await database.ref('presences/' + date + '/' + id).update({ [f]: v });
  } catch (e) {
    console.warn("Write blocked:", id, f, e);
  }
}

// ─── ACTIONS PLANNING BATCH & UNITAIRES ───
async function applySingleCuisinePlan(id, date) {
  const plan = getCuisinePlanningInfo(id, date);
  if (!plan) return;
  if (plan.off) {
    await upd(id, 'off', true);
  } else {
    await upd(id, 'off', false);
    await upd(id, 'hP', plan.hP);
  }
}

async function applyCuisinePlanningForDate(dateISO) {
  if (!canEditHP("", dateISO)) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }
  const cuisineMembers = EQUIPE.filter(e => e.poste === "CUISINE");
  if (!cuisineMembers.length) {
    alert("Aucun membre en cuisine trouvé.");
    return;
  }

  const updates = {};
  cuisineMembers.forEach(emp => {
    const id = empId(emp);
    const plan = getCuisinePlanningInfo(id, dateISO);
    if (!plan) return;
    if (plan.off) {
      updates[`presences/${dateISO}/${id}/off`] = true;
      updates[`presences/${dateISO}/${id}/hP`] = null;
    } else {
      updates[`presences/${dateISO}/${id}/hP`] = plan.hP;
      updates[`presences/${dateISO}/${id}/off`] = false;
    }
  });

  try {
    await database.ref().update(updates);
    uiExportMsg(`Planning Cuisine appliqué (${dateISO}) ✅`, true);
  } catch (e) {
    console.error("Erreur application planning cuisine:", e);
    uiExportMsg("Erreur lors de l'application du planning ❌", false);
  }
}

async function applyCuisinePlanningForWeek(dateISO) {
  if (!isGerant()) {
    alert("L'application pour toute la semaine est réservée au Gérant.");
    return;
  }
  const [yy, mm, dd] = dateISO.split('-').map(Number);
  const cur = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = cur.getUTCDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(cur);
  monday.setUTCDate(cur.getUTCDate() + diffToMonday);

  const updates = {};
  const cuisineMembers = EQUIPE.filter(e => e.poste === "CUISINE");

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);

    cuisineMembers.forEach(emp => {
      const id = empId(emp);
      const plan = getCuisinePlanningInfo(id, iso);
      if (!plan) return;
      if (plan.off) {
        updates[`presences/${iso}/${id}/off`] = true;
        updates[`presences/${iso}/${id}/hP`] = null;
      } else {
        updates[`presences/${iso}/${id}/hP`] = plan.hP;
        updates[`presences/${iso}/${id}/off`] = false;
      }
    });
  }

  try {
    await database.ref().update(updates);
    uiExportMsg("Planning Cuisine appliqué pour toute la semaine ✅", true);
  } catch (e) {
    console.error("Erreur semaine cuisine:", e);
    uiExportMsg("Erreur application semaine ❌", false);
  }
}

async function applySingleCaissePlan(id, date) {
  if (isSoumiaStaff(id)) {
    const plan = getSoumiaPlanning(date);
    if (!plan) return;
    if (plan.off) {
      await upd(id, 'off', true);
      await upd(id, 'hP', '');
    } else {
      await upd(id, 'off', false);
      await upd(id, 'hP', plan.hP);
    }
  } else {
    const plan = getCaisseAlternance(id, date);
    if (!plan) return;
    await upd(id, 'off', false);
    await upd(id, 'hP', plan.hP);
  }
}

async function applyCaissePlanningForDate(dateISO) {
  if (!canEditHP("", dateISO)) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }
  const caisseMembers = EQUIPE.filter(e => e.poste === "CAISSE");
  if (!caisseMembers.length) {
    alert("Aucun membre en caisse trouvé.");
    return;
  }
  const updates = {};
  caisseMembers.forEach(emp => {
    const id = empId(emp);
    if (isSoumiaStaff(id)) {
      const plan = getSoumiaPlanning(dateISO);
      if (!plan) return;
      if (plan.off) {
        updates[`presences/${dateISO}/${id}/off`] = true;
        updates[`presences/${dateISO}/${id}/hP`] = null;
      } else {
        updates[`presences/${dateISO}/${id}/hP`] = plan.hP;
        updates[`presences/${dateISO}/${id}/off`] = false;
      }
    } else {
      const plan = getCaisseAlternance(id, dateISO);
      if (!plan) return;
      updates[`presences/${dateISO}/${id}/hP`] = plan.hP;
      updates[`presences/${dateISO}/${id}/off`] = false;
    }
  });
  try {
    await database.ref().update(updates);
    uiExportMsg(`Planning Caisse appliqué (${dateISO}) ✅`, true);
  } catch (e) {
    console.error("Erreur application planning caisse:", e);
    uiExportMsg("Erreur lors de l'application du planning ❌", false);
  }
}

async function applyCaissePlanningForWeek(dateISO) {
  if (!isGerant()) {
    alert("L'application pour toute la semaine est réservée au Gérant.");
    return;
  }
  const [yy, mm, dd] = dateISO.split('-').map(Number);
  const cur = new Date(Date.UTC(yy, mm - 1, dd));
  const dayOfWeek = cur.getUTCDay();
  const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
  const monday = new Date(cur);
  monday.setUTCDate(cur.getUTCDate() + diffToMonday);

  const caisseMembers = EQUIPE.filter(e => e.poste === "CAISSE");
  const updates = {};

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);

    caisseMembers.forEach(emp => {
      const id = empId(emp);
      if (isSoumiaStaff(id)) {
        const plan = getSoumiaPlanning(iso);
        if (!plan) return;
        if (plan.off) {
          updates[`presences/${iso}/${id}/off`] = true;
          updates[`presences/${iso}/${id}/hP`] = null;
        } else {
          updates[`presences/${iso}/${id}/hP`] = plan.hP;
          updates[`presences/${iso}/${id}/off`] = false;
        }
      } else {
        const plan = getCaisseAlternance(id, iso);
        if (!plan) return;
        updates[`presences/${iso}/${id}/hP`] = plan.hP;
        updates[`presences/${iso}/${id}/off`] = false;
      }
    });
  }

  try {
    await database.ref().update(updates);
    uiExportMsg("Planning Caisse appliqué pour toute la semaine ✅", true);
  } catch (e) {
    console.error("Erreur semaine caisse:", e);
    uiExportMsg("Erreur application semaine ❌", false);
  }
}

async function applySheetPlanningForPoste(poste, sheetUrl, dateISO) {
  if (!canEditHP("", dateISO)) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }
  const members = EQUIPE.filter(e => e.poste === poste);
  if (!members.length) {
    alert(`Aucun membre trouvé pour le poste ${poste}.`);
    return;
  }

  uiExportMsg(`Lecture Sheet ${poste}…`, true);

  try {
    const resp = await fetch(sheetUrl, { cache: "no-store" });
    const text = await resp.text();
    const rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);

    const [yy, mm, dd] = dateISO.split('-').map(Number);
    const targetDate = new Date(yy, mm - 1, dd);
    targetDate.setHours(0, 0, 0, 0);

    let matchingRow = null;
    for (let i = 1; i < rows.length; i++) {
      const c = parseSheetCsvLine(rows[i]);
      if (!c[0] || c[0].toUpperCase().includes("DATE")) continue;
      const rowDate = parseSheetDateLabel(c[0]);
      if (rowDate && rowDate.getFullYear() === targetDate.getFullYear() &&
          rowDate.getMonth() === targetDate.getMonth() &&
          rowDate.getDate() === targetDate.getDate()) {
        matchingRow = c;
        break;
      }
    }

    if (!matchingRow) {
      alert(`Date ${dateISO} introuvable dans le Google Sheet ${poste}.`);
      uiExportMsg(`Date absente du Sheet ⚠️`, false);
      return;
    }

    const matinStr = matchingRow[1] || "";
    const soirStr  = matchingRow[2] || "";

    const updates = {};
    members.forEach(emp => {
      const id = empId(emp);
      const inMatin = isStaffInSheetShift(matinStr, emp);
      const inSoir  = isStaffInSheetShift(soirStr, emp);

      if (inMatin || inSoir) {
        updates[`presences/${dateISO}/${id}/hP`] = (inMatin ? SHIFT_H_MATIN : SHIFT_H_SOIR);
        updates[`presences/${dateISO}/${id}/off`] = false;
      } else {
        updates[`presences/${dateISO}/${id}/off`] = true;
        updates[`presences/${dateISO}/${id}/hP`] = null;
      }
    });

    await database.ref().update(updates);
    uiExportMsg(`Planning ${poste} appliqué (${dateISO}) ✅`, true);
  } catch (e) {
    console.error(`Erreur application planning ${poste}:`, e);
    alert(`Erreur réseau lors de la lecture du Google Sheet ${poste}.`);
    uiExportMsg(`Erreur Sheet ${poste} ❌`, false);
  }
}

async function applyBarPlanningForDate(dateISO) {
  return applySheetPlanningForPoste("BAR", BAR_SHEET_URL, dateISO);
}

async function applyServicePlanningForDate(dateISO) {
  return applySheetPlanningForPoste("SERVICE", SERVICE_SHEET_URL, dateISO);
}
