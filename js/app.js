/**
 * Grey Corner • Application (Point d'Entrée, Authentification & Listeners Temps Réel)
 */

let activeRefs = [];
let equipeRef = null;
let equipeCb = null;
let appInitialized = false;

function stopListeners() {
  activeRefs.forEach(({ ref, cb }) => ref.off("value", cb));
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
  };
  equipeRef.on("value", equipeCb);
}

function load() {
  const selectedDate = document.getElementById('datePicker').value;

  stopListeners();
  presencesCache = {};
  punchesCache = {};
  rootPunchesCache = {};

  const refPres = database.ref('presences/' + selectedDate);
  const cbPres = (snap) => {
    presencesCache = snap.val() || {};
    collectHPFromCache();
    rebuildMerged();
    render();
  };
  refPres.on("value", cbPres);
  activeRefs.push({ ref: refPres, cb: cbPres });

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
    presencesCache = {};
    punchesCache = {};
    rootPunchesCache = {};
    latestDataCache = {};
    EQUIPE = [];
    appInitialized = false;
    showLoginUI();
    return;
  }

  role = await fetchRole(user.uid);
  const isMaster = (user.email || "").toLowerCase().includes("hicham");
  if (!role && isMaster) {
    role = "gerant";
    try { await database.ref("users/" + user.uid).set("gerant"); } catch (_) {}
  }

  if (role !== "gerant" && role !== "equipe") {
    if (isMaster) {
      role = "gerant";
      try { await database.ref("users/" + user.uid).set("gerant"); } catch (_) {}
    } else {
      await auth.signOut();
      role = null;
      showLoginUI();
      document.getElementById("loginMsg").textContent =
        "Compte non autorisé (rôle manquant dans /users).";
      return;
    }
  }

  showLoggedUI();
  initApp();
});
