/**
 * Grey Corner • Services (Firebase, API Google Sheets, Exportations & Sync)
 */

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

const __exportTimers = new Map();

function uiExportMsg(text, ok = true) {
  if (typeof document === "undefined") return;
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

async function exportToSheet(action, payload) {
  const idToken = (typeof getAuthToken === "function") ? await getAuthToken() : "";
  const params = {
    action,
    secret: (typeof EXPORT_SECRET !== "undefined" ? EXPORT_SECRET : "greycorner2026"),
    timestamp: Date.now(),
    ...payload
  };
  if (idToken) params.idToken = idToken;

  const url = `${EXPORT_URL}?${buildQuery(params)}`;
  uiExportMsg("Export Google Sheet…", true);

  try {
    if (typeof fetch === "function") {
      await fetch(url, { method: "GET", mode: "no-cors", cache: "no-cache" });
      uiExportMsg("Export Google Sheet ✅", true);
      return true;
    } else {
      const img = new Image();
      img.onload = () => uiExportMsg("Export Google Sheet ✅", true);
      img.onerror = () => uiExportMsg("Export Google Sheet ✅", true);
      img.src = url;
      return true;
    }
  } catch (e) {
    console.error("EXPORT FAIL:", e);
    uiExportMsg("Export Google Sheet ❌", false);
    return false;
  }
}

function schedulePresenceExport(empKey, name, selectedDate, data) {
  const key = `${selectedDate}__${empKey}`;
  clearTimeout(__exportTimers.get(key));
  __exportTimers.set(key, setTimeout(async () => {
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
function isGerant() { return typeof role !== "undefined" && role === "gerant"; }
function isEquipe() { return typeof role !== "undefined" && role === "equipe"; }

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
      dateDebut: normalizeDateISO(x?.dateDebut || x?.dateAjout || x?.startDate || x?.createdAt || ""),
      dateSortie: normalizeDateISO(x?.dateSortie || x?.dateFin || x?.endDate || "")
    }))
    .filter(x => x.nom && x.prenom && x.poste);

  const seen = new Set();
  const out = [];
  for (const e of cleaned) {
    const normNom = normalizeKeyPart(e.nom);
    const normPrenom = normalizeKeyPart(e.prenom);
    const isRemovedStaff =
      normNom.includes("ELGORRAMY") || normPrenom.includes("ANISSA") || normPrenom.includes("SOUAD") ||
      normNom.includes("AZHARY") || normPrenom.includes("NAJIA") ||
      ((e.poste === "MENAGE" || e.poste === "MÉNAGE") &&
        (normNom.includes("KHALISSA") || normPrenom.includes("KHALISSA") || normNom.includes("ABOUARSA") || normNom.includes("EDDRISSIA") ||
         (normNom.includes("ZAHRA") && normPrenom.includes("FATIM")) || (normNom.includes("FATIM") && normPrenom.includes("ZAHRA"))));

    // Exclusion des anciens collaborateurs (Souad, Anissa, Najia El Azhary)
    if (isRemovedStaff) {
      continue;
    }

    const id = `${normNom}_${normPrenom}`;
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

function extractMotif(val) {
  if (!val) return "";
  if (typeof val === "string") return val.trim();
  if (typeof val === "object") {
    return String(val.motif || val.reason || val.texte || val.explication || val.msg || "").trim();
  }
  return "";
}

function findEmpRecord(map, emp) {
  if (!map || typeof map !== "object") return null;
  const id = (typeof empId === "function") ? empId(emp) : "";
  if (id && map[id] !== undefined) return map[id];

  const nom = String(emp?.nom || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const prenom = String(emp?.prenom || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
  const k1 = `${nom}_${prenom}`.replace(/\s+/g, "_");
  if (map[k1] !== undefined) return map[k1];
  const k2 = `${prenom}_${nom}`.replace(/\s+/g, "_");
  if (map[k2] !== undefined) return map[k2];
  const k3 = `${nom} ${prenom}`.replace(/\s+/g, "_");
  if (map[k3] !== undefined) return map[k3];

  const keys = Object.keys(map);
  for (const k of keys) {
    const normK = String(k).toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^A-Z0-9]/g, "");
    const normNom = nom.replace(/[^A-Z0-9]/g, "");
    const normPrenom = prenom.replace(/[^A-Z0-9]/g, "");
    if (normNom && normPrenom && normK.includes(normNom) && normK.includes(normPrenom)) {
      return map[k];
    }
  }
  return null;
}

async function fetchRole(uid) {
  const snap = await database.ref("users/" + uid).once("value");
  return snap.val() || null;
}

// ─── SUPPRESSION DU MOTIF DE RETARD DANS FIREBASE & CACHES ───
async function removeEmployeeMotif(id, date) {
  if (!id || !date) return;
  const emp = (typeof EQUIPE !== "undefined" ? EQUIPE : []).find(x => empId(x) === id);

  const matchingKeys = new Set([id]);
  if (emp) {
    const nom = String(emp.nom || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const prenom = String(emp.prenom || "").trim().toUpperCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    if (nom && prenom) {
      matchingKeys.add(`${nom}_${prenom}`.replace(/\s+/g, "_"));
      matchingKeys.add(`${prenom}_${nom}`.replace(/\s+/g, "_"));
      matchingKeys.add(`${nom} ${prenom}`.replace(/\s+/g, "_"));
    }
  }

  // Clés présentes dans motifsCache ou punchesCache correspondant à l'employé
  if (typeof motifsCache === "object" && motifsCache) {
    Object.keys(motifsCache).forEach(k => {
      if (emp && findEmpRecord({ [k]: true }, emp)) matchingKeys.add(k);
    });
  }
  if (typeof punchesCache === "object" && punchesCache) {
    Object.keys(punchesCache).forEach(k => {
      if (emp && findEmpRecord({ [k]: true }, emp)) matchingKeys.add(k);
    });
  }
  if (typeof rootPunchesCache === "object" && rootPunchesCache) {
    Object.keys(rootPunchesCache).forEach(k => {
      if (emp && findEmpRecord({ [k]: true }, emp)) matchingKeys.add(k);
    });
  }

  const delPromises = [];
  matchingKeys.forEach(k => {
    // 1. broadcast/motifs/${date}/${k}
    delPromises.push(database.ref('broadcast/motifs/' + date + '/' + k).remove().catch(() => {}));
    // 2. punches/${date}/${k}/motif
    delPromises.push(database.ref('punches/' + date + '/' + k + '/motif').remove().catch(() => {}));
    // 3. presences/${date}/${k}/motif (au cas où)
    delPromises.push(database.ref('presences/' + date + '/' + k + '/motif').remove().catch(() => {}));

    // Caches locaux
    if (typeof motifsCache === "object" && motifsCache) delete motifsCache[k];
    if (typeof punchesCache === "object" && punchesCache && punchesCache[k]) punchesCache[k].motif = "";
    if (typeof rootPunchesCache === "object" && rootPunchesCache && rootPunchesCache[k]) rootPunchesCache[k].motif = "";
    if (typeof presencesCache === "object" && presencesCache && presencesCache[k]) delete presencesCache[k].motif;
    if (typeof latestDataCache === "object" && latestDataCache && latestDataCache[k]) latestDataCache[k].motif = "";
  });

  if (typeof latestDataCache === "object" && latestDataCache && latestDataCache[id]) {
    latestDataCache[id].motif = "";
  }

  try {
    await Promise.allSettled(delPromises);
  } catch (e) {
    console.warn("Erreur suppression motif:", e);
  }
}

// ─── MUTATIONS DE PRÉSENCE & POINTAGES (UPD) ───
async function upd(id, f, v) {
  const date = (typeof document !== "undefined" && document.getElementById('datePicker')?.value) || (typeof currentDate !== "undefined" ? currentDate : (typeof getMarocDate === "function" ? getMarocDate() : ""));
  const empList = (typeof EQUIPE !== "undefined" && EQUIPE.length) ? EQUIPE : (typeof DEFAULT_EQUIPE !== "undefined" ? DEFAULT_EQUIPE : []);
  const emp = empList.find(x => empId(x) === id);
  if (emp && !isEmployeeStartedOnDate(emp, date)) {
    const start = getEmployeeStartDate(emp);
    uiExportMsg(`⚠️ Collaborateur ajouté le ${start} (non actif le ${date})`, false);
    return;
  }
  const curEmp = (typeof latestDataCache === "object" && latestDataCache[id]) || (typeof presencesCache === "object" && presencesCache[id]) || {};
  if (typeof isExplicitMaladie === "function" && isExplicitMaladie(curEmp) && f === "off") {
    uiExportMsg("⚠️ Statut Arrêt Maladie verrouillé (M)", false);
    return;
  }
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
      await removeEmployeeMotif(id, date);
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
      if (typeof rebuildMerged === "function") rebuildMerged();
      if (typeof render === "function") render();
    } catch (e) {
      console.warn("Write blocked:", id, f, e);
      uiExportMsg("⚠️ Écriture refusée par Firebase", false);
    }
    return;
  }

  if (f === "hP") {
    if (!canEditHP(id, date)) return;

    const hp = normalizeHHMM(v);
    if (hp) {
      if (typeof saveHPHistory === "function") saveHPHistory(id, hp);
    }
    const ref = database.ref('presences/' + date + '/' + id);

    try {
      await ref.update({ hP: hp || null });

      const cur = latestDataCache[id] || {};
      const hA = normalizeHHMM(cur.hA || "");
      const lm = lateMinutes(hp, hA, id, date);
      const isLate = (lm !== null && lm > 0);

      // Si l'employé n'est plus en retard après modification de hP (hA <= hP), suppression du motif
      if (!isLate || !hA) {
        await removeEmployeeMotif(id, date);
      }

      schedulePresenceExport(id, name, date, {
        hP: hp || "",
        hA: hA || "",
        off: (typeof cur.off === "boolean" ? cur.off : ""),
        retard: (hA ? !!isLate : ""),
        retardMin: (hA ? (lm || 0) : "")
      });
      if (typeof rebuildMerged === "function") rebuildMerged();
      if (typeof render === "function") render();
    } catch (e) {
      console.warn("Write blocked:", id, f, e);
      uiExportMsg("⚠️ Écriture refusée par Firebase", false);
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
        const existingMotif = extractMotif(latestDataCache[id]?.motif) || extractMotif(punchesCache[id]?.motif);
        const payloadPunch = {
          empKey: id,
          hA: hA || null,
          retard: !!(hA && isLate),
          retardMin: hA ? (lm || 0) : 0,
          timestamp: now
        };
        if (isLate && existingMotif) {
          payloadPunch.motif = existingMotif;
        }
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

        // Si l'employé n'est pas en retard (ex: hA modifié à l'heure hP ou plus tôt, ou hA effacé),
        // suppression immédiate du motif de retard dans Firebase et les caches locaux
        if (!isLate || !hA) {
          await removeEmployeeMotif(id, selectedDate);
        }

        schedulePresenceExport(id, name, selectedDate, {
          hP: hP || "",
          hA: hA || "",
          off: (hA ? false : (typeof (latestDataCache[id]?.off) === "boolean" ? latestDataCache[id].off : "")),
          retard: (hA ? !!isLate : ""),
          retardMin: (hA ? (lm || 0) : "")
        });
        if (typeof rebuildMerged === "function") rebuildMerged();
        if (typeof render === "function") render();
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

      if (!isLate || !hA) {
        await removeEmployeeMotif(id, selectedDate);
      }

      schedulePresenceExport(id, name, selectedDate, {
        hP: hP || "",
        hA: hA || "",
        off: (typeof (latestDataCache[id]?.off) === "boolean" ? latestDataCache[id]?.off : ""),
        retard: (hA ? !!isLate : ""),
        retardMin: (hA ? (lm || 0) : "")
      });
      if (typeof rebuildMerged === "function") rebuildMerged();
      if (typeof render === "function") render();

    } catch (e) {
      console.warn("hA write blocked:", id, e);
      uiExportMsg("⚠️ Écriture hA refusée par Firebase", false);
    }
    return;
  }

  try {
    await database.ref('presences/' + date + '/' + id).update({ [f]: v });
    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
  } catch (e) {
    console.warn("Write blocked:", id, f, e);
    uiExportMsg("⚠️ Écriture refusée par Firebase", false);
  }
}

// ─── ACTIONS PLANNING BATCH & UNITAIRES ───
async function markAllPendingAsOff(dateISO) {
  const selectedDate = dateISO || document.getElementById('datePicker')?.value || getMarocDate();
  if (!canEditOFF(selectedDate)) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }

  const pendingEmps = getActiveEquipeForDate(selectedDate, EQUIPE).filter(emp => {
    const id = empId(emp);
    const d = latestDataCache[id] || {};
    const sched = resolveEmployeeSchedule(emp, selectedDate, d);
    return !sched.handled;
  });

  if (!pendingEmps.length) return;

  const namesPreview = pendingEmps.map(e => `${e.nom} ${e.prenom}`).join(", ");
  const ok = confirm(
    `Déclarer les ${pendingEmps.length} collaborateur(s) en attente comme Absent / Repos (OUT) pour le ${selectedDate} ?\n\nCollaborateurs concernés :\n${namesPreview}`
  );
  if (!ok) return;

  const updates = {};
  for (const emp of pendingEmps) {
    const id = empId(emp);
    updates[`presences/${selectedDate}/${id}/off`] = true;
    updates[`presences/${selectedDate}/${id}/hA`] = null;
    updates[`presences/${selectedDate}/${id}/retard`] = null;
    updates[`presences/${selectedDate}/${id}/retardMin`] = null;
    updates[`presences/${selectedDate}/${id}/on`] = false;
  }

  try {
    await database.ref().update(updates);
    for (const emp of pendingEmps) {
      const id = empId(emp);
      const cur = latestDataCache[id] || {};
      schedulePresenceExport(id, empName(emp), selectedDate, {
        hP: cur.hP || "",
        hA: "",
        off: true,
        retard: false,
        retardMin: 0
      });
    }
    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
    uiExportMsg(`${pendingEmps.length} collaborateur(s) déclaré(s) OUT ✅`, true);
  } catch (e) {
    console.error("Erreur lors du passage groupé en OUT:", e);
    uiExportMsg("Erreur lors de la déclaration OUT ❌", false);
  }
}

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
  const cuisineMembers = getActiveEquipeForDate(dateISO, EQUIPE).filter(e => e.poste === "CUISINE");
  if (!cuisineMembers.length) {
    alert("Aucun membre actif en cuisine trouvé pour cette date.");
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
      if (!isEmployeeStartedOnDate(emp, iso)) return;
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
    if (plan.off) {
      await upd(id, 'off', true);
      await upd(id, 'hP', '');
    } else {
      await upd(id, 'off', false);
      await upd(id, 'hP', plan.hP);
    }
  }
}

async function applyCaissePlanningForDate(dateISO) {
  if (!canEditHP("", dateISO)) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }
  const caisseMembers = getActiveEquipeForDate(dateISO, EQUIPE).filter(e => e.poste === "CAISSE");
  if (!caisseMembers.length) {
    alert("Aucun membre actif en caisse trouvé pour cette date.");
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
      if (plan.off) {
        updates[`presences/${dateISO}/${id}/off`] = true;
        updates[`presences/${dateISO}/${id}/hP`] = null;
      } else {
        updates[`presences/${dateISO}/${id}/hP`] = plan.hP;
        updates[`presences/${dateISO}/${id}/off`] = false;
      }
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
      if (!isEmployeeStartedOnDate(emp, iso)) return;
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
        if (plan.off) {
          updates[`presences/${iso}/${id}/off`] = true;
          updates[`presences/${iso}/${id}/hP`] = null;
        } else {
          updates[`presences/${iso}/${id}/hP`] = plan.hP;
          updates[`presences/${iso}/${id}/off`] = false;
        }
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

// ─── ACTIONS PLANNING MÉNAGE (S1 / S2 PERMANENT) ───
async function applySingleMenagePlan(id, dateISO) {
  const emp = (typeof EQUIPE !== "undefined" ? EQUIPE : []).find(x => empId(x) === id);
  const plan = getMenagePlanningInfo(emp || id, dateISO);
  if (!plan) return;
  if (plan.off) {
    await upd(id, 'off', true);
  } else {
    await upd(id, 'off', false);
    await upd(id, 'hA', plan.hA);
  }
}

async function autoSyncMenagePlanningIfEmpty(dateISO) {
  if (!isGerant()) return;
  if (!dateISO) dateISO = (typeof getMarocDate === "function" ? getMarocDate() : new Date().toISOString().slice(0, 10));

  const allEquipe = (typeof EQUIPE !== "undefined" && EQUIPE.length) ? EQUIPE : DEFAULT_EQUIPE;
  if (!allEquipe.length) return;

  try {
    const [presSnap, punchSnap] = await Promise.all([
      database.ref('presences/' + dateISO).once('value'),
      database.ref('punches/' + dateISO).once('value')
    ]);
    const currentPres = presSnap.val() || {};
    const currentPunch = punchSnap.val() || {};

    let needsUpdate = false;
    const updates = {};
    const now = Date.now();

    // 1. Nettoyage automatique de toute présence enregistrée avant la date d'ajout (dateDebut) d'un collaborateur
    allEquipe.forEach(emp => {
      if (!isEmployeeStartedOnDate(emp, dateISO)) {
        const id = empId(emp);
        if (currentPres[id] !== undefined) {
          updates[`presences/${dateISO}/${id}`] = null;
          needsUpdate = true;
        }
        if (currentPunch[id] !== undefined) {
          updates[`punches/${dateISO}/${id}`] = null;
          needsUpdate = true;
        }
      }
    });

    // 2. Pointage auto ménage uniquement pour les collaborateurs déjà actifs à cette date
    const menageMembers = getActiveEquipeForDate(dateISO, allEquipe).filter(e => isMenageStaff(e) || isMenageStaff(empId(e)));
    menageMembers.forEach(emp => {
      if (!isEmployeeStartedOnDate(emp, dateISO)) return;
      const id = empId(emp);
      const p = currentPres[id];
      const pu = currentPunch[id];

      // Si aucun pointage ni statut n'existe dans Firebase pour cette date
      if (!p && !pu) {
        const plan = getMenagePlanningInfo(emp, dateISO);
        if (!plan) return;
        needsUpdate = true;
        if (plan.off) {
          updates[`presences/${dateISO}/${id}/off`] = true;
        } else {
          updates[`presences/${dateISO}/${id}/off`] = false;
          updates[`presences/${dateISO}/${id}/hA`] = plan.hA;
          updates[`presences/${dateISO}/${id}/hP`] = plan.hA;
          updates[`presences/${dateISO}/${id}/retard`] = false;
          updates[`presences/${dateISO}/${id}/retardMin`] = 0;
          updates[`presences/${dateISO}/${id}/timestamp`] = now;
          updates[`presences/${dateISO}/${id}/lastEditAt`] = now;
          updates[`presences/${dateISO}/${id}/lastEditByAdmin`] = true;
          updates[`punches/${dateISO}/${id}`] = {
            empKey: id,
            hA: plan.hA,
            retard: false,
            retardMin: 0,
            timestamp: now
          };
        }
      }
    });

    if (needsUpdate && Object.keys(updates).length > 0) {
      await database.ref().update(updates);
      console.log("Synchronisation présence / dateDebut appliquée pour", dateISO);
    }
  } catch (e) {
    console.warn("Auto-sync ménage discret:", e);
  }
}

async function applyMenagePlanningForDate(dateISO) {
  if (!isGerant() && dateISO !== getMarocDate()) {
    alert("Action réservée au Gérant ou pour la date d'aujourd'hui.");
    return;
  }
  const menageMembers = getActiveEquipeForDate(dateISO, EQUIPE).filter(e => isMenageStaff(e) || isMenageStaff(empId(e)));
  if (!menageMembers.length) {
    alert("Aucun membre actif de l'équipe ménage trouvé pour cette date.");
    return;
  }
  const updates = {};
  const now = Date.now();
  const isAdmin = isGerant();

  menageMembers.forEach(emp => {
    const id = empId(emp);
    const plan = getMenagePlanningInfo(emp, dateISO);
    if (!plan) return;

    if (plan.off) {
      updates[`presences/${dateISO}/${id}/off`] = true;
      updates[`presences/${dateISO}/${id}/hA`] = null;
      updates[`presences/${dateISO}/${id}/hP`] = null;
      updates[`presences/${dateISO}/${id}/retard`] = null;
      updates[`presences/${dateISO}/${id}/retardMin`] = null;
      updates[`presences/${dateISO}/${id}/timestamp`] = null;
      updates[`presences/${dateISO}/${id}/lastEditAt`] = now;
      updates[`presences/${dateISO}/${id}/lastEditByAdmin`] = isAdmin;
      if (isAdmin) {
        updates[`punches/${dateISO}/${id}`] = null;
      }
    } else {
      updates[`presences/${dateISO}/${id}/off`] = false;
      updates[`presences/${dateISO}/${id}/hA`] = plan.hA;
      updates[`presences/${dateISO}/${id}/hP`] = plan.hA;
      updates[`presences/${dateISO}/${id}/retard`] = false;
      updates[`presences/${dateISO}/${id}/retardMin`] = 0;
      updates[`presences/${dateISO}/${id}/timestamp`] = now;
      updates[`presences/${dateISO}/${id}/lastEditAt`] = now;
      updates[`presences/${dateISO}/${id}/lastEditByAdmin`] = isAdmin;
      if (isAdmin) {
        updates[`punches/${dateISO}/${id}`] = {
          empKey: id,
          hA: plan.hA,
          retard: false,
          retardMin: 0,
          timestamp: now
        };
      }
    }
  });

  try {
    await database.ref().update(updates);
    menageMembers.forEach(emp => {
      const id = empId(emp);
      const plan = getMenagePlanningInfo(emp, dateISO);
      if (!plan) return;
      schedulePresenceExport(id, empName(emp), dateISO, {
        hP: plan.off ? "" : plan.hA,
        hA: plan.off ? "" : plan.hA,
        off: plan.off,
        retard: false,
        retardMin: 0
      });
    });
    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
    uiExportMsg(`Planning Ménage appliqué (${dateISO}) ✅`, true);
  } catch (e) {
    console.error("Erreur application planning ménage:", e);
    uiExportMsg("Erreur lors de l'application du planning ménage ❌", false);
  }
}

async function applyMenagePlanningForWeek(dateISO) {
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

  const menageMembers = EQUIPE.filter(e => isMenageStaff(e) || isMenageStaff(empId(e)));
  if (!menageMembers.length) {
    alert("Aucun membre de l'équipe ménage trouvé.");
    return;
  }

  const updates = {};
  const now = Date.now();

  for (let i = 0; i < 7; i++) {
    const d = new Date(monday);
    d.setUTCDate(monday.getUTCDate() + i);
    const iso = d.toISOString().slice(0, 10);

    menageMembers.forEach(emp => {
      if (!isEmployeeStartedOnDate(emp, iso)) return;
      const id = empId(emp);
      const plan = getMenagePlanningInfo(emp, iso);
      if (!plan) return;

      if (plan.off) {
        updates[`presences/${iso}/${id}/off`] = true;
        updates[`presences/${iso}/${id}/hA`] = null;
        updates[`presences/${iso}/${id}/hP`] = null;
        updates[`presences/${iso}/${id}/retard`] = null;
        updates[`presences/${iso}/${id}/retardMin`] = null;
        updates[`presences/${iso}/${id}/timestamp`] = null;
        updates[`presences/${iso}/${id}/lastEditAt`] = now;
        updates[`presences/${iso}/${id}/lastEditByAdmin`] = true;
        updates[`punches/${iso}/${id}`] = null;
      } else {
        updates[`presences/${iso}/${id}/off`] = false;
        updates[`presences/${iso}/${id}/hA`] = plan.hA;
        updates[`presences/${iso}/${id}/hP`] = plan.hA;
        updates[`presences/${iso}/${id}/retard`] = false;
        updates[`presences/${iso}/${id}/retardMin`] = 0;
        updates[`presences/${iso}/${id}/timestamp`] = now;
        updates[`presences/${iso}/${id}/lastEditAt`] = now;
        updates[`presences/${iso}/${id}/lastEditByAdmin`] = true;
        updates[`punches/${iso}/${id}`] = {
          empKey: id,
          hA: plan.hA,
          retard: false,
          retardMin: 0,
          timestamp: now
        };
      }
    });
  }

  try {
    await database.ref().update(updates);
    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
    uiExportMsg("Planning Ménage appliqué pour toute la semaine ✅", true);
  } catch (e) {
    console.error("Erreur semaine ménage:", e);
    uiExportMsg("Erreur application semaine ménage ❌", false);
  }
}

async function fetchSheetCsvRows(sheetUrl) {
  let url = sheetUrl;
  if (!url.includes("headers=")) {
    url += (url.includes("?") ? "&" : "?") + "headers=1";
  }
  let resp = await fetch(url, { cache: "no-store" });
  let text = await resp.text();
  let rows = text.split(/\r?\n/).map(r => r.trim()).filter(Boolean);

  // Sécurité anti-agrégation GViz : si <= 8 lignes retournées, bascule sur export CSV direct
  if (rows.length <= 8 && sheetUrl.includes("/gviz/tq")) {
    try {
      const gidMatch = sheetUrl.match(/gid=([^&]+)/);
      const exportUrl = sheetUrl.replace(/\/gviz\/tq.*$/, "/export?format=csv") +
        (gidMatch ? "&gid=" + gidMatch[1] : "");
      const expResp = await fetch(exportUrl, { cache: "no-store" });
      if (expResp.ok) {
        const expText = await expResp.text();
        const expRows = expText.split(/\r?\n/).map(r => r.trim()).filter(Boolean);
        if (expRows.length > rows.length) rows = expRows;
      }
    } catch (e) {
      console.warn("Repli export CSV ignoré:", e);
    }
  }
  return rows;
}

async function applySheetPlanningForPoste(poste, sheetUrl, dateISO) {
  if (!dateISO) dateISO = (typeof getMarocDate === "function" ? getMarocDate() : new Date().toISOString().slice(0, 10));
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
    const rows = await fetchSheetCsvRows(sheetUrl);

    const [yy, mm, dd] = dateISO.split('-').map(Number);
    const targetDate = new Date(yy, mm - 1, dd);
    targetDate.setHours(0, 0, 0, 0);

    let matchingRow = null;
    for (let i = 1; i < rows.length; i++) {
      const c = parseSheetCsvLine(rows[i]);
      if (!c[0] || c[0].toUpperCase().includes("DATE")) continue;
      const rowDate = parseSheetDateLabel(c[0]);
      if (rowDate &&
          rowDate.getMonth() === targetDate.getMonth() &&
          rowDate.getDate() === targetDate.getDate()) {
        const hasExplicitYear = /\b\d{4}\b/.test(c[0]);
        if (!hasExplicitYear || rowDate.getFullYear() === targetDate.getFullYear()) {
          matchingRow = c;
          break;
        }
      }
    }

    if (!matchingRow) {
      const detected = [];
      for (let r = 1; r < rows.length; r++) {
        const row = parseSheetCsvLine(rows[r]);
        if (!row[0] || row[0].toUpperCase().includes("DATE")) continue;
        const pd = parseSheetDateLabel(row[0]);
        if (pd) detected.push(pd);
      }
      let rangeMsg = "";
      if (detected.length > 0) {
        const d0 = detected[0];
        const dEnd = detected[detected.length - 1];
        const fmtD = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        rangeMsg = `\n\nDates présentes dans le Google Sheet : du ${fmtD(d0)} au ${fmtD(dEnd)}.`;
      }
      alert(`Date ${dateISO} introuvable dans le Google Sheet ${poste}.${rangeMsg}\n\nVérifiez que cette date est bien renseignée dans votre Google Sheet.`);
      uiExportMsg(`Date absente du Sheet ⚠️`, false);
      return;
    }

    const matinStr = matchingRow[1] || "";
    const soirStr  = matchingRow[2] || "";

    const updates = {};
    const morningHour = (typeof getShiftHMatin === "function") ? getShiftHMatin(dateISO) : (dateISO >= "2026-09-28" ? "06:45" : SHIFT_H_MATIN);
    members.forEach(emp => {
      if (!isEmployeeStartedOnDate(emp, dateISO)) return;
      const id = empId(emp);
      const inMatin = isStaffInSheetShift(matinStr, emp);
      const inSoir  = isStaffInSheetShift(soirStr, emp);

      if (inMatin || inSoir) {
        updates[`presences/${dateISO}/${id}/hP`] = (inMatin ? morningHour : SHIFT_H_SOIR);
        updates[`presences/${dateISO}/${id}/off`] = false;
      } else {
        updates[`presences/${dateISO}/${id}/off`] = true;
        updates[`presences/${dateISO}/${id}/hP`] = null;
      }
    });

    await database.ref().update(updates);
    uiExportMsg(`Planning ${poste} appliqué (${dateISO}) ✅`, true);
    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
  } catch (e) {
    console.error(`Erreur application planning ${poste}:`, e);
    alert(`Erreur réseau lors de la lecture du Google Sheet ${poste}.`);
    uiExportMsg(`Erreur Sheet ${poste} ❌`, false);
  }
}

async function applySheetPlanningForPosteWeek(poste, sheetUrl, dateISO) {
  if (!dateISO) dateISO = (typeof getMarocDate === "function" ? getMarocDate() : new Date().toISOString().slice(0, 10));
  if (!isGerant()) {
    alert("L'application pour toute la semaine est réservée au Gérant.");
    return;
  }
  const members = EQUIPE.filter(e => e.poste === poste);
  if (!members.length) {
    alert(`Aucun membre trouvé pour le poste ${poste}.`);
    return;
  }

  uiExportMsg(`Lecture Sheet ${poste} (Semaine)…`, true);

  try {
    const rows = await fetchSheetCsvRows(sheetUrl);

    const [yy, mm, dd] = dateISO.split('-').map(Number);
    const cur = new Date(Date.UTC(yy, mm - 1, dd));
    const dayOfWeek = cur.getUTCDay();
    const diffToMonday = (dayOfWeek === 0 ? -6 : 1 - dayOfWeek);
    const monday = new Date(cur);
    monday.setUTCDate(cur.getUTCDate() + diffToMonday);

    const updates = {};
    let appliedDaysCount = 0;
    const missingDays = [];

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setUTCDate(monday.getUTCDate() + i);
      const iso = d.toISOString().slice(0, 10);
      const [yN, mN, dN] = iso.split('-').map(Number);

      let matchingRow = null;
      for (let r = 1; r < rows.length; r++) {
        const c = parseSheetCsvLine(rows[r]);
        if (!c[0] || c[0].toUpperCase().includes("DATE")) continue;
        const rowDate = parseSheetDateLabel(c[0]);
        if (rowDate &&
            rowDate.getMonth() === (mN - 1) &&
            rowDate.getDate() === dN) {
          const hasExplicitYear = /\b\d{4}\b/.test(c[0]);
          if (!hasExplicitYear || rowDate.getFullYear() === yN) {
            matchingRow = c;
            break;
          }
        }
      }

      if (!matchingRow) {
        missingDays.push(iso);
        continue;
      }

      appliedDaysCount++;
      const matinStr = matchingRow[1] || "";
      const soirStr  = matchingRow[2] || "";
      const morningHour = (typeof getShiftHMatin === "function") ? getShiftHMatin(iso) : (iso >= "2026-09-28" ? "06:45" : SHIFT_H_MATIN);

      members.forEach(emp => {
        if (!isEmployeeStartedOnDate(emp, iso)) return;
        const id = empId(emp);
        const inMatin = isStaffInSheetShift(matinStr, emp);
        const inSoir  = isStaffInSheetShift(soirStr, emp);

        if (inMatin || inSoir) {
          updates[`presences/${iso}/${id}/hP`] = (inMatin ? morningHour : SHIFT_H_SOIR);
          updates[`presences/${iso}/${id}/off`] = false;
        } else {
          updates[`presences/${iso}/${id}/off`] = true;
          updates[`presences/${iso}/${id}/hP`] = null;
        }
      });
    }

    if (appliedDaysCount === 0) {
      const detected = [];
      for (let r = 1; r < rows.length; r++) {
        const row = parseSheetCsvLine(rows[r]);
        if (!row[0] || row[0].toUpperCase().includes("DATE")) continue;
        const pd = parseSheetDateLabel(row[0]);
        if (pd) detected.push(pd);
      }
      let rangeMsg = "";
      if (detected.length > 0) {
        const d0 = detected[0];
        const dEnd = detected[detected.length - 1];
        const fmtD = d => `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
        rangeMsg = `\n\nDates actuellement présentes dans le Google Sheet : du ${fmtD(d0)} au ${fmtD(dEnd)}.`;
      }
      const startMondayIso = monday.toISOString().slice(0, 10);
      const endSunday = new Date(monday);
      endSunday.setUTCDate(monday.getUTCDate() + 6);
      const endSundayIso = endSunday.toISOString().slice(0, 10);
      alert(`Aucune date de la semaine (${startMondayIso} au ${endSundayIso}) trouvée dans le Google Sheet ${poste}.${rangeMsg}\n\nVeuillez vérifier que cette semaine est bien saisie dans votre Google Sheet.`);
      uiExportMsg(`Dates absentes du Sheet ⚠️`, false);
      return;
    }

    await database.ref().update(updates);
    const msg = missingDays.length > 0
      ? `Planning ${poste} appliqué pour ${appliedDaysCount}/7 jours (manquants: ${missingDays.join(', ')}) ⚠️`
      : `Planning ${poste} appliqué pour toute la semaine (${appliedDaysCount} jours) ✅`;
    uiExportMsg(msg, missingDays.length === 0);

    if (typeof rebuildMerged === "function") rebuildMerged();
    if (typeof render === "function") render();
  } catch (e) {
    console.error(`Erreur application semaine ${poste}:`, e);
    alert(`Erreur réseau lors de la lecture du Google Sheet ${poste}.`);
    uiExportMsg(`Erreur Sheet ${poste} ❌`, false);
  }
}

async function applyBarPlanningForDate(dateISO) {
  return applySheetPlanningForPoste("BAR", BAR_SHEET_URL, dateISO);
}

async function applyBarPlanningForWeek(dateISO) {
  return applySheetPlanningForPosteWeek("BAR", BAR_SHEET_URL, dateISO);
}

async function applyServicePlanningForDate(dateISO) {
  return applySheetPlanningForPoste("SERVICE", SERVICE_SHEET_URL, dateISO);
}

async function applyServicePlanningForWeek(dateISO) {
  return applySheetPlanningForPosteWeek("SERVICE", SERVICE_SHEET_URL, dateISO);
}
