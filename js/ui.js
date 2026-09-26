/**
 * Grey Corner • Interface Utilisateur (Rendu, KPIs, Filtrage & Habituels)
 */

let role = null;
let currentFilter = "all";
let EQUIPE = [];

let presencesCache = {};
let punchesCache = {};
let rootPunchesCache = {};
let latestDataCache = {};

let hpHistory = [];

// ─── GESTION DES HEURES HABITUELLES (HP HISTORY) ───
function initHPHistory() {
  let saved = [];
  try {
    saved = JSON.parse(localStorage.getItem("gc_hp_history") || "[]");
  } catch (e) {}
  const combined = new Set([...defaultHPTimes, ...saved]);
  hpHistory = Array.from(combined).sort();
  updateHPDatalist();
}

function saveHPHistory(empId, hpVal) {
  const clean = normalizeHHMM(hpVal);
  if (!clean) return;

  if (empId) {
    try { localStorage.setItem(`gc_hp_emp_${empId}`, clean); } catch (e) {}
  }

  if (!hpHistory.includes(clean)) {
    hpHistory.push(clean);
    hpHistory.sort();
    try { localStorage.setItem("gc_hp_history", JSON.stringify(hpHistory)); } catch (e) {}
    updateHPDatalist();
  }
}

function updateHPDatalist() {
  let dl = document.getElementById("hpHistoryDatalist");
  if (!dl) {
    dl = document.createElement("datalist");
    dl.id = "hpHistoryDatalist";
    document.body.appendChild(dl);
  }
  dl.innerHTML = hpHistory.map(t => `<option value="${t}">${t}</option>`).join("");
}

function collectHPFromCache() {
  if (!presencesCache) return;
  let changed = false;
  Object.values(presencesCache).forEach(p => {
    const hp = normalizeHHMM(p?.hP);
    // Filtrage pour n'enregistrer que des shifts ronds/standards dans la liste globale rapide
    if (hp && (hp.endsWith(":00") || hp.endsWith(":30")) && !hpHistory.includes(hp)) {
      hpHistory.push(hp);
      changed = true;
    }
  });
  if (changed) {
    hpHistory.sort();
    try { localStorage.setItem("gc_hp_history", JSON.stringify(hpHistory)); } catch (e) {}
    updateHPDatalist();
  }
}

// ─── CONSOLIDATION DU CACHE TEMPS RÉEL ───
function rebuildMerged() {
  const allPunches = mergeEmpMaps(punchesCache || {}, rootPunchesCache || {});
  const merged = {};

  EQUIPE.forEach(emp => {
    const id = empId(emp);
    const p = presencesCache[id] || {};
    const pu = allPunches[id] || {};

    merged[id] = {
      ...p,
      ...pu,
      hP: normalizeHHMM(p?.hP || pu?.hP || ""),
      hA: normalizeHHMM((pu && pu.hA) ? pu.hA : (p && p.hA ? p.hA : "")),
      retard: (pu && typeof pu.retard === "boolean") ? pu.retard : (p && typeof p.retard === "boolean" ? p.retard : false),
      retardMin: (pu && typeof pu.retardMin === "number") ? pu.retardMin : (p && typeof p.retardMin === "number" ? p.retardMin : 0),
      off: p?.off === true
    };
  });

  latestDataCache = merged;
}

// ─── FILTRAGE ET RECHERCHE ───
function setFilter(f) {
  currentFilter = f;
  document.querySelectorAll(".chipBtn").forEach(b => b.classList.remove("active"));
  const btn = document.getElementById(`chip-${f}`);
  if (btn) btn.classList.add("active");
  applyFilters();
}

function applyFilters() {
  const q = (document.getElementById("searchInput").value || "").trim().toLowerCase();
  const cards = document.querySelectorAll("#staffList .empCard");

  cards.forEach(card => {
    const matchName = (card.dataset.name || "").includes(q);

    let matchFilter = true;
    if (currentFilter === "punched") matchFilter = card.dataset.punched === "1";
    if (currentFilter === "off") matchFilter = card.dataset.off === "1";
    if (currentFilter === "pending") matchFilter = card.dataset.pending === "1";
    if (currentFilter === "late") matchFilter = card.dataset.late === "1";
    if (currentFilter === "incomplete") matchFilter = card.dataset.incomplete === "1";

    card.style.display = (matchName && matchFilter) ? "block" : "none";
  });
}

// ─── CALCUL DES KPIS (LOGIQUE UNIFIÉE DRY) ───
function computeKPIs() {
  const total = EQUIPE.length;
  let punched = 0, off = 0, pending = 0, lateCount = 0, lateMinSum = 0;
  const selectedDate = document.getElementById('datePicker')?.value || getMarocDate();

  EQUIPE.forEach(emp => {
    const id = empId(emp);
    const d = latestDataCache[id] || {};
    const sched = resolveEmployeeSchedule(emp, selectedDate, d);

    if (sched.hasHA) punched++;
    if (sched.isOff) off++;
    if (!sched.handled) pending++;

    if (sched.hasHP && sched.hasHA && sched.isLate) {
      lateCount++;
      lateMinSum += sched.lateMin;
    }
  });

  document.getElementById("kpiTotal").textContent = total;
  document.getElementById("kpiPunched").textContent = punched;
  document.getElementById("kpiOff").textContent = off;
  document.getElementById("kpiPending").textContent = pending;
  document.getElementById("kpiLate").textContent = lateCount;
  document.getElementById("kpiLateMin").textContent = lateMinSum;
}

// ─── GESTION DE L'AFFICHAGE AUTH & RÔLES ───
function setRoleLine() {
  const el = document.getElementById("roleLine");
  if (role === "gerant") {
    el.textContent = "Mode : GÉRANT";
  } else if (role === "equipe") {
    el.textContent = "Mode : ÉQUIPE";
  } else {
    el.textContent = "Mode : — (connexion requise)";
  }

  const info = document.getElementById("infoSource");
  if (role === "gerant") {
    info.textContent = "Source hA : punches + presences + compatibilité racine/date";
    info.classList.remove("hidden");
  } else if (role === "equipe") {
    info.textContent = "Source hA : presences uniquement";
    info.classList.remove("hidden");
  } else {
    info.classList.add("hidden");
  }
}

function showLoggedUI() {
  document.getElementById("loginWrap").classList.add("hidden");
  document.getElementById("filtersWrap").classList.remove("hidden");
  document.getElementById("kpisWrap").classList.remove("hidden");
  document.getElementById("topActions").classList.remove("hidden");
  setRoleLine();
}

function showLoginUI() {
  document.getElementById("loginWrap").classList.remove("hidden");
  document.getElementById("filtersWrap").classList.add("hidden");
  document.getElementById("kpisWrap").classList.add("hidden");
  document.getElementById("topActions").classList.add("hidden");
  document.getElementById("staffList").innerHTML = "";
  setRoleLine();
}

// ─── RENDU DU PERSONNEL (AVEC VIGNETTES RETARD ORANGE & ROUGE SAIGNANT) ───
function render() {
  const selectedDate = document.getElementById('datePicker').value || getMarocDate();
  const list = document.getElementById('staffList');
  list.innerHTML = "";

  if (!EQUIPE.length) {
    list.innerHTML = `
      <div class="card rounded-3xl p-6 text-center">
        <div class="text-[10px] font-extrabold uppercase tracking-[0.2em] text-slate-500">Équipe</div>
        <div class="mt-2 text-sm font-extrabold text-slate-800">Aucun collaborateur</div>
        <div class="mt-1 text-[11px] font-semibold text-slate-500">
          Ajoute des personnes via le Dashboard (settings/equipe).
        </div>
      </div>
    `;
    computeKPIs();
    return;
  }

  const groupes = EQUIPE.reduce((acc, emp) => {
    (acc[emp.poste] = acc[emp.poste] || []).push(emp);
    return acc;
  }, {});

  Object.keys(groupes).sort().forEach(poste => {
    const section = document.createElement('section');
    section.className = "card rounded-3xl overflow-hidden";

    const header = document.createElement('div');
    header.className = "w-full flex items-center justify-between px-4 py-4 bg-white cursor-pointer select-none";
    header.innerHTML = `
      <div class="flex items-center gap-3 flex-wrap">
        <div class="sectionTitle text-xs font-extrabold tracking-[0.18em] uppercase text-slate-500">${poste}</div>
        ${poste === "CUISINE" ? `
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="event.stopPropagation(); applyCuisinePlanningForDate(document.getElementById('datePicker').value)"
              title="Remplir les HP et OFF de la cuisine pour la date sélectionnée selon le planning fixe"
              class="text-[10px] font-extrabold bg-amber-600 hover:bg-amber-700 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              ⚡ Remplir Cuisine (Jour)
            </button>
            <button type="button" onclick="event.stopPropagation(); applyCuisinePlanningForWeek(document.getElementById('datePicker').value)"
              title="Remplir les HP et OFF de la cuisine pour les 7 jours de la semaine"
              class="text-[10px] font-extrabold bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              📅 Semaine Cuisine
            </button>
          </div>
        ` : poste === "BAR" ? `
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="event.stopPropagation(); applyBarPlanningForDate(document.getElementById('datePicker').value)"
              title="Remplir les HP (06:45 ou 07:00 / 14:30) et OFF du Bar depuis Google Sheets"
              class="text-[10px] font-extrabold bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              ⚡ Remplir Bar (Sheet)
            </button>
          </div>
        ` : poste === "SERVICE" ? `
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="event.stopPropagation(); applyServicePlanningForDate(document.getElementById('datePicker').value)"
              title="Remplir les HP (06:45 ou 07:00 / 14:30) et OFF du Service depuis Google Sheets"
              class="text-[10px] font-extrabold bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              ⚡ Remplir Service (Sheet)
            </button>
          </div>
        ` : poste === "CAISSE" ? `
          <div class="flex items-center gap-1.5 flex-wrap">
            <button type="button" onclick="event.stopPropagation(); applyCaissePlanningForDate(document.getElementById('datePicker').value)"
              title="Remplir les HP de la caisse pour la date sélectionnée (Alternance 07:30 / 15:00 & Soumia 09:00)"
              class="text-[10px] font-extrabold bg-purple-600 hover:bg-purple-700 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              ⚡ Remplir Caisse (Jour)
            </button>
            <button type="button" onclick="event.stopPropagation(); applyCaissePlanningForWeek(document.getElementById('datePicker').value)"
              title="Remplir les HP de la caisse pour les 7 jours de la semaine"
              class="text-[10px] font-extrabold bg-slate-800 hover:bg-slate-900 text-white px-2.5 py-1 rounded-full shadow-sm flex items-center gap-1 active:scale-95 transition-all">
              📅 Semaine Caisse
            </button>
          </div>
        ` : (poste === "MENAGE" || poste === "MÉNAGE") ? `
          <div class="flex items-center gap-1.5 flex-wrap">
            <span class="text-[10px] font-bold text-sky-800 bg-sky-50 border border-sky-200/80 px-2.5 py-0.5 rounded-full">
              🧹 Pas de pointage · Créneaux : 07:00 · 12:00 · 14:00 · 15:00
            </span>
          </div>
        ` : ''}
      </div>
      <div class="flex items-center gap-2">
        <span class="badge">${groupes[poste].length} pers.</span>
        <span class="text-slate-400 font-black">▾</span>
      </div>
    `;

    const body = document.createElement('div');
    body.className = "px-4 pb-4 space-y-3";

    let open = true;
    header.addEventListener('click', () => {
      open = !open;
      body.style.display = open ? "block" : "none";
    });

    groupes[poste]
      .slice()
      .sort((a, b) => {
        const A = empId(a);
        const B = empId(b);
        if (A === "BOUCHNAK_NAOUAL") return -1;
        if (B === "BOUCHNAK_NAOUAL") return 1;
        return (a.nom + a.prenom).localeCompare(b.nom + b.prenom);
      })
      .forEach(emp => {
        const id = empId(emp);
        const d = latestDataCache[id] || {};

        // Résolution unifiée via schedules.js
        const sched = resolveEmployeeSchedule(emp, selectedDate, d);

        const statusBadges = [];

        if (sched.isOff) {
          statusBadges.push(`<span class="badge bad">Repos (OUT)</span>`);
        } else if (sched.isMenage) {
          if (sched.hasHA) {
            statusBadges.push(`<span class="badge ok">🧹 Pointé (${sched.safeHA})</span>`);
          } else {
            statusBadges.push(`<span class="badge" style="border-color:rgba(14,165,233,.35);background:rgba(14,165,233,.10);color:#0369a1">🧹 Saisie manuelle</span>`);
          }
        } else if (sched.hasHA) {
          statusBadges.push(`<span class="badge ok">Pointé</span>`);
        } else if (sched.isSoumia && sched.soumiaPlan?.off) {
          statusBadges.push(`<span class="badge" style="border-color:rgba(168,85,247,.35);background:rgba(168,85,247,.10);color:#6b21a8">💜 Repos Mardi</span>`);
        } else if (sched.caissePlan) {
          statusBadges.push(`<span class="badge" style="border-color:rgba(99,102,241,.35);background:rgba(99,102,241,.10);color:#4338ca">🔄 Rotation : ${sched.caissePlan.shift}</span>`);
        } else if (sched.isSecurite && sched.isMonday) {
          statusBadges.push(`<span class="badge" style="border-color:rgba(99,102,241,.35);background:rgba(99,102,241,.10);color:#3730a3">🛡️ Repos Lundi</span>`);
        } else if (sched.isCuisine && sched.cuisinePlan?.off) {
          statusBadges.push(`<span class="badge" style="border-color:rgba(245,158,11,.35);background:rgba(245,158,11,.10);color:#92400e">📋 Repos Planning</span>`);
        } else {
          statusBadges.push(`<span class="badge">En attente</span>`);
        }

        // Badges spécifiques selon gravité du retard
        if (sched.isLateHeavy) {
          statusBadges.push(`<span class="badge font-black text-rose-950 bg-rose-200 border-rose-500 shadow-sm animate-pulse">🚨 Retard +${sched.lateMin} min</span>`);
        } else if (sched.isLateLight) {
          statusBadges.push(`<span class="badge warn font-bold">⚠️ Retard ${fmtLate(sched.lateMin)}</span>`);
        }

        if (sched.incomplete) statusBadges.push(`<span class="badge">Incomplet</span>`);
        if (haExceptionsToday.includes(id) && !sched.isMenage) {
          statusBadges.push(`<span class="badge" style="border-color:rgba(197,160,89,.35);background:rgba(197,160,89,.10);color:#7a5b1d">🌿 hA Exception</span>`);
        }

        const canOFF = canEditOFF(selectedDate);
        const canHP = canEditHP(id, selectedDate);
        const canHA = canEditHA(id, selectedDate);

        const empLastHP = (function() {
          try { return localStorage.getItem(`gc_hp_emp_${id}`) || ""; } catch (e) { return ""; }
        })();

        const card = document.createElement('div');

        // Application de la couleur de vignette demandée :
        // - Pointé à l'heure : Fond vert clair (.on-time)
        // - Non pointé (en attente) : Fond blanc (.not-punched)
        // - Retard léger (<= 30 min) : Fond orange (.late-light)
        // - Retard saignant (> 30 min) : Fond rouge alerte (.late-heavy)
        // - Repos : (.emp-off)
        let cardClasses = "card rounded-2xl p-4 empCard";
        if (sched.isOff) {
          cardClasses += " emp-off";
        } else if (sched.isLateHeavy) {
          cardClasses += " late-heavy";
        } else if (sched.isLateLight) {
          cardClasses += " late-light";
        } else if (sched.hasHA) {
          cardClasses += " on-time";
        } else {
          cardClasses += " not-punched";
        }
        card.className = cardClasses;

        card.dataset.name = `${emp.nom} ${emp.prenom}`.toLowerCase();
        card.dataset.punched = sched.hasHA ? "1" : "0";
        card.dataset.off = sched.isOff ? "1" : "0";
        card.dataset.pending = (!sched.handled) ? "1" : "0";
        card.dataset.late = sched.isLate ? "1" : "0";
        card.dataset.lateHeavy = sched.isLateHeavy ? "1" : "0";
        card.dataset.lateLight = sched.isLateLight ? "1" : "0";
        card.dataset.incomplete = sched.incomplete ? "1" : "0";

        // Sélection ciblée des heures habituelles (évite l'explosion de 30 boutons)
        const curatedQuickHours = Array.from(new Set([
          "06:45", "07:00", "07:30", "09:00", "12:00", "14:00", "14:30", "15:00",
          ...(empLastHP ? [empLastHP] : [])
        ])).filter(Boolean).sort();

        // Photo du collaborateur et fallback
        const photoUrl = getCollaboratorPhoto(emp);
        const fallbackAvatar = getInitialsAvatar(emp);

        let photoBorderClass = "border border-slate-200 shadow-sm";
        if (sched.isOff) {
          photoBorderClass = "border border-slate-300 opacity-60 grayscale";
        } else if (sched.isLateHeavy) {
          photoBorderClass = "border-2 border-red-500 shadow-md ring-2 ring-red-300/80";
        } else if (sched.isLateLight) {
          photoBorderClass = "border-2 border-amber-500 shadow-md ring-2 ring-amber-300/80";
        } else if (sched.hasHA) {
          photoBorderClass = "border-2 border-emerald-500 shadow-md ring-2 ring-emerald-300/80";
        }

        card.innerHTML = `
          <div class="flex items-start justify-between gap-3">
            <div class="flex items-center gap-3 min-w-0 flex-1">
              <!-- Photo du Collaborateur -->
              <div class="relative flex-shrink-0">
                <img src="${photoUrl}" alt="${emp.nom} ${emp.prenom}"
                  class="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl object-cover object-center bg-slate-100 ${photoBorderClass} transition-all"
                  loading="lazy"
                  onerror="handleImgError(this, '${id}')" />
              </div>

              <div class="min-w-0 flex-1">
                <div class="font-extrabold text-sm sm:text-base tracking-tight ${sched.isLateHeavy ? 'text-red-950 font-black' : sched.hasHA && !sched.isLate ? 'text-emerald-950' : 'text-slate-900'} truncate">
                  ${emp.nom} ${emp.prenom}
                </div>
                <div class="mt-1 flex gap-1.5 flex-wrap">
                  ${statusBadges.join("")}
                </div>
              </div>
            </div>

            <div class="toggleWrap rounded-2xl p-2 flex gap-2 ${
              sched.isLateHeavy ? 'border-red-300 bg-red-100/50' :
              sched.isLateLight ? 'border-amber-300 bg-amber-100/50' :
              sched.hasHA && !sched.isOff ? 'border-emerald-200 bg-emerald-100/50' : ''
            }">
              <label class="flex flex-col items-center px-2">
                <span class="text-[9px] font-extrabold text-slate-400 tracking-wide">OUT</span>
                <input type="checkbox" class="w-4 h-4 accent-[color:var(--accent)]"
                  ${sched.isOff ? "checked" : ""} ${canOFF ? "" : "disabled"}
                  onchange="upd('${id}','off',this.checked)">
              </label>
            </div>
          </div>

          ${sched.isMenage ? `
            <div class="mt-4 p-3.5 rounded-2xl bg-sky-50/80 border border-sky-200/90 shadow-sm">
              <div class="flex items-center justify-between gap-2 mb-2 flex-wrap">
                <div>
                  <div class="flex items-center gap-1.5">
                    <label class="text-[10px] font-black tracking-[0.14em] uppercase text-sky-950 block">
                      🧹 Pointage Réel (hA) — Créneaux Rapides
                    </label>
                  </div>
                  <p class="text-[10px] text-sky-700 font-semibold mt-0.5">
                    Choisir un créneau au choix ou entrer une heure libre.
                  </p>
                </div>
                <div class="flex items-center gap-2">
                  <span class="text-[11px] font-black ${sched.safeHA ? 'text-sky-900 bg-sky-100 border border-sky-300' : 'text-slate-500 bg-slate-100'} px-2.5 py-0.5 rounded-lg whitespace-nowrap">
                    ${sched.safeHA ? `✅ Pointé ${sched.safeHA}` : '💤 Repos / Congé auto'}
                  </span>
                  ${canHA && sched.safeHA ? `
                    <button type="button" onclick="upd('${id}','hA','')"
                      title="Effacer le pointage"
                      class="text-[10px] font-extrabold text-red-700 bg-red-50 hover:bg-red-100 border border-red-200 rounded-lg px-2 py-1 transition-all active:scale-95 flex items-center gap-1">
                      ✕ Effacer
                    </button>
                  ` : ''}
                </div>
              </div>

              <!-- Boutons créneaux au choix (07:00, 12:00, 14:00, 15:00) -->
              <div class="grid grid-cols-4 gap-2 my-2.5">
                ${["07:00", "12:00", "14:00", "15:00"].map(creneau => {
                  const isActive = (sched.safeHA === creneau);
                  return `
                    <button type="button"
                      ${canHA ? `onclick="upd('${id}','hA','${isActive ? '' : creneau}')"` : 'disabled'}
                      title="${isActive ? 'Désélectionner ce créneau' : `Valider ${creneau}`}"
                      class="py-2.5 px-1 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-1 shadow-sm active:scale-95 ${
                        isActive
                          ? 'bg-sky-600 text-white ring-2 ring-sky-400 shadow-md font-black'
                          : 'bg-white hover:bg-sky-100/80 text-sky-950 border border-sky-300 font-extrabold'
                      }">
                      <span>${creneau}</span>
                      ${isActive ? '<span class="text-[10px]">✓</span>' : ''}
                    </button>
                  `;
                }).join("")}
              </div>

              <!-- Saisie libre personnalisée -->
              <div class="flex items-center gap-2 pt-2 border-t border-sky-200/70">
                <span class="text-[9px] font-extrabold uppercase tracking-wider text-sky-800 whitespace-nowrap">Autre heure :</span>
                <div class="flex-1">
                  ${
                    canHA
                    ? `<input type="time" step="60"
                        class="w-full rounded-xl text-xs font-extrabold px-2.5 py-1.5 accentRing"
                        style="background: #ffffff; border:1px solid rgba(14,165,233,.45); color:#0c4a6e"
                        value="${sched.safeHA}"
                        placeholder="--:--"
                        onchange="upd('${id}','hA',this.value)">`
                    : `<div class="w-full bg-slate-100 rounded-xl text-xs font-extrabold px-2.5 py-1.5 text-slate-500 text-center">
                        ${sched.safeHA || "Non renseigné"}
                      </div>`
                  }
                </div>
              </div>
            </div>
          ` : `
            <div class="mt-4 grid grid-cols-2 gap-3">
              <div>
                <div class="flex items-center justify-between mb-1">
                  <label class="text-[10px] font-extrabold tracking-[0.14em] uppercase text-slate-500 block">Shift prévu (hP)</label>
                  ${empLastHP && empLastHP !== sched.displayHP && canHP ? `
                    <button type="button" onclick="upd('${id}','hP','${empLastHP}')"
                      title="Appliquer le dernier shift utilisé (${empLastHP})"
                      class="text-[9px] font-extrabold text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200/80 rounded-md px-1.5 py-0.5 transition-all inline-flex items-center gap-1 active:scale-95">
                      ⚡ ${empLastHP}
                    </button>
                  ` : ''}
                </div>
                <input type="time" step="60" list="hpHistoryDatalist"
                  class="w-full bg-[color:var(--soft)] rounded-xl text-sm font-bold px-3 py-2 accentRing"
                  value="${sched.displayHP}"
                  ${canHP ? "" : "disabled"}
                  onchange="upd('${id}','hP',this.value)">
                
                ${sched.soumiaPlan ? `
                  <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-bold text-purple-800 bg-purple-50 border border-purple-200/80 rounded px-1.5 py-0.5">
                      💜 ${sched.soumiaPlan.off ? 'Repos Fixe (Mardi)' : 'Shift Unique : 09:00'}
                    </span>
                    ${canHP && !sched.soumiaPlan.off && sched.safeHP !== "09:00" ? `
                      <button type="button" onclick="upd('${id}','hP','09:00')"
                        title="Appliquer 09:00"
                        class="text-[9px] font-extrabold text-purple-800 hover:bg-purple-100 bg-purple-50 border border-purple-300 rounded px-1.5 py-0.5 transition-all active:scale-95">
                        ⚡ 09:00
                      </button>
                    ` : ''}
                  </div>
                ` : ''}

                ${sched.caissePlan ? `
                  <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 rounded px-1.5 py-0.5">
                      🔄 Rotation 24h : <strong>${sched.caissePlan.shift}</strong>
                    </span>
                    ${canHP && (sched.safeHP !== sched.caissePlan.hP || sched.isOff) ? `
                      <button type="button" onclick="applySingleCaissePlan('${id}', '${selectedDate}')"
                        title="Appliquer le shift de rotation (${sched.caissePlan.shift})"
                        class="text-[9px] font-extrabold text-indigo-800 hover:bg-indigo-100 bg-indigo-50 border border-indigo-300 rounded px-1.5 py-0.5 transition-all active:scale-95">
                        ⚡ Appliquer
                      </button>
                    ` : ''}
                  </div>
                ` : ''}

                ${sched.cuisinePlan ? `
                  <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                    <span class="text-[9px] font-bold text-amber-800 bg-amber-50 border border-amber-200/80 rounded px-1.5 py-0.5">
                      📋 Plan: <strong>${sched.cuisinePlan.shift}</strong>
                    </span>
                    ${canHP && (sched.safeHP !== sched.cuisinePlan.hP || sched.isOff !== sched.cuisinePlan.off) ? `
                      <button type="button" onclick="applySingleCuisinePlan('${id}', '${selectedDate}')"
                        title="Appliquer le shift du planning fixe"
                        class="text-[9px] font-extrabold text-amber-800 hover:bg-amber-100 bg-amber-50 border border-amber-300 rounded px-1.5 py-0.5 transition-all active:scale-95">
                        ⚡ Appliquer
                      </button>
                    ` : ''}
                  </div>
                ` : ''}

                ${canHP && curatedQuickHours.length > 0 ? `
                  <div class="mt-1 flex flex-wrap gap-1 items-center py-0.5">
                    <span class="text-[8px] font-bold text-slate-400 uppercase tracking-wider">Habituels:</span>
                    ${curatedQuickHours.map(h => `
                      <button type="button" onclick="upd('${id}','hP','${h}')"
                        class="text-[9px] font-bold px-1.5 py-0.5 rounded ${sched.safeHP === h ? 'bg-amber-500 text-white font-extrabold shadow-sm' : 'bg-slate-200/70 text-slate-700 hover:bg-amber-100 hover:text-amber-900'} transition-colors">
                        ${h}
                      </button>
                    `).join('')}
                  </div>
                ` : ''}
              </div>

              <div>
                <label class="text-[10px] font-extrabold tracking-[0.14em] uppercase text-slate-500 mb-1 block">Arrivée réelle (hA)</label>
                ${
                  canHA
                  ? `<input type="time" step="60"
                      class="w-full rounded-xl text-sm font-extrabold px-3 py-2 accentRing ${sched.isLateHeavy ? 'text-red-900 font-black' : ''}"
                      style="background: ${sched.isLateHeavy ? 'rgba(239,68,68,.15)' : 'rgba(197,160,89,.10)'}; border:1px solid ${sched.isLateHeavy ? 'rgba(239,68,68,.40)' : 'rgba(197,160,89,.30)'}"
                      value="${sched.safeHA}"
                      onchange="upd('${id}','hA',this.value)">`
                  : `<div class="w-full ${sched.isLateHeavy ? 'bg-red-100/70 text-red-900 font-black' : 'bg-slate-100 text-slate-500'} rounded-xl text-sm font-extrabold px-3 py-2 text-center">
                      ${sched.safeHA || "--:--"}
                    </div>`
                }
              </div>
            </div>
          `}
        `;

        body.appendChild(card);
      });

    section.appendChild(header);
    section.appendChild(body);
    list.appendChild(section);
  });

  computeKPIs();
  applyFilters();
}
