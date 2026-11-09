/**
 * Grey Corner • Application (Point d'Entrée, Authentification & Listeners Temps Réel)
 */

let activeRefs = [];
let equipeRef = null;
let equipeCb = null;
let planningsRef = null;
let planningsCb = null;
let appInitialized = false;

function stopListeners() {
  activeRefs.forEach(({ ref, cb }) => {
    try {
      if (ref && typeof ref.off === "function") ref.off("value", cb);
    } catch (e) {}
  });
  activeRefs = [];
}

function stopEquipeListener() {
  try {
    if (equipeRef && equipeCb) {
      equipeRef.off("value", equipeCb);
    }
  } catch (e) {}
  equipeRef = null;
  equipeCb = null;
}

function startEquipeListener() {
  stopEquipeListener();

  equipeRef = database.ref("settings/equipe");
  equipeCb = (snap) => {
    const val = snap.val();
    const norm = normalizeEquipeSnapshot(val);
    EQUIPE = norm.length ? norm : DEFAULT_EQUIPE;
    rebuildMerged();
    render();
    if (isGerant() && typeof autoSyncMenagePlanningIfEmpty === "function") {
      autoSyncMenagePlanningIfEmpty(document.getElementById('datePicker')?.value);
    }
  };
  equipeRef.on("value", equipeCb);
}

function stopPlanningsListener() {
  try {
    if (planningsRef && planningsCb) {
      planningsRef.off("value", planningsCb);
    }
  } catch (e) {}
  planningsRef = null;
  planningsCb = null;
}

function startPlanningsListener() {
  stopPlanningsListener();

  const path = (typeof PLANNINGS_PATH !== "undefined" ? PLANNINGS_PATH : "settings/plannings");
  planningsRef = database.ref(path);
  planningsCb = (snap) => {
    const val = snap.val();
    if (val && typeof val === "object") {
      if (typeof applyCustomPlannings === "function") {
        applyCustomPlannings(val);
      }
      try {
        if (typeof localStorage !== "undefined" && typeof LOCAL_PLANNINGS_KEY !== "undefined") {
          localStorage.setItem(LOCAL_PLANNINGS_KEY, JSON.stringify(val));
        }
      } catch (_) {}
      rebuildMerged();
      render();
      if (isGerant() && typeof autoSyncMenagePlanningIfEmpty === "function") {
        autoSyncMenagePlanningIfEmpty(document.getElementById('datePicker')?.value);
      }
    }
  };
  planningsRef.on("value", planningsCb);
}

function load() {
  const selectedDate = document.getElementById('datePicker').value;

  stopListeners();
  presencesCache = {};
  punchesCache = {};
  rootPunchesCache = {};
  motifsCache = {};

  const refPres = database.ref('presences/' + selectedDate);
  const cbPres = (snap) => {
    presencesCache = snap.val() || {};
    collectHPFromCache();
    rebuildMerged();
    render();
  };
  refPres.on("value", cbPres);
  activeRefs.push({ ref: refPres, cb: cbPres });

  // Écoute temps réel des motifs explicatifs de retard
  const refMotifs = database.ref('broadcast/motifs/' + selectedDate);
  const cbMotifs = (snap) => {
    motifsCache = snap.val() || {};
    rebuildMerged();
    render();
  };
  refMotifs.on("value", cbMotifs);
  activeRefs.push({ ref: refMotifs, cb: cbMotifs });

  if (isGerant()) {
    const refPunch = database.ref('punches/' + selectedDate);
    const cbPunch = (snap) => {
      punchesCache = snap.val() || {};
      rebuildMerged();
      render();
    };
    refPunch.on("value", cbPunch);
    activeRefs.push({ ref: refPunch, cb: cbPunch });

    const refRootPunch = database.ref(selectedDate);
    const cbRootPunch = (snap) => {
      rootPunchesCache = snap.val() || {};
      rebuildMerged();
      render();
    };
    refRootPunch.on("value", cbRootPunch);
    activeRefs.push({ ref: refRootPunch, cb: cbRootPunch });

    if (typeof autoSyncMenagePlanningIfEmpty === "function") {
      autoSyncMenagePlanningIfEmpty(selectedDate);
    }
  } else {
    punchesCache = {};
    rootPunchesCache = {};
    rebuildMerged();
    render();
  }
}

function initApp() {
  if (appInitialized) return;
  appInitialized = true;

  initHPHistory();

  const dp = document.getElementById('datePicker');
  dp.value = getMarocDate();
  dp.addEventListener('change', load);

  startEquipeListener();
  startPlanningsListener();
  load();
}

// ─── GESTION DES BOUTONS DE CONNEXION ───
document.getElementById("btnLogin").onclick = async () => {
  const email = (document.getElementById("loginEmail").value || "").trim();
  const pass  = (document.getElementById("loginPass").value || "").trim();
  document.getElementById("loginMsg").textContent = "";

  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch (e) {
    document.getElementById("loginMsg").textContent = "Identifiants invalides ou accès refusé.";
  }
};

document.getElementById("btnLogout").onclick = async () => {
  await auth.signOut();
  role = null;
  stopListeners();
  stopEquipeListener();
  stopPlanningsListener();
  presencesCache = {};
  punchesCache = {};
  rootPunchesCache = {};
  latestDataCache = {};
  EQUIPE = [];
  appInitialized = false;
  showLoginUI();
};

// ─── ÉCOUTEUR AUTHENTIFICATION FIREBASE ───
auth.onAuthStateChanged(async (user) => {
  if (!user) {
    role = null;
    stopListeners();
    stopEquipeListener();
    stopPlanningsListener();
    presencesCache = {};
    punchesCache = {};
    rootPunchesCache = {};
    latestDataCache = {};
    EQUIPE = [];
    appInitialized = false;
    showLoginUI();
    return;
  }

  // Récupération du rôle depuis Firebase /users/{uid}
  // SÉCURITÉ : Le rôle est exclusivement attribué côté serveur (Firebase RTDB / Custom Claims).
  // Ne JAMAIS promouvoir automatiquement un utilisateur côté client.
  role = await fetchRole(user.uid);

  if (role !== "gerant" && role !== "equipe") {
    await auth.signOut();
    role = null;
    showLoginUI();
    document.getElementById("loginMsg").textContent =
      "Compte non autorisé (rôle manquant dans /users).";
    return;
  }

  showLoggedUI();
  initApp();
});
