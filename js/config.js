/**
 * Grey Corner • Configuration générale et constantes
 */

const firebaseConfig = {
  apiKey: "AIzaSyC5al_6xWbJC8S0FAvaEnRmx9BvYtGgnAM",
  authDomain: "grey-corner-presence.firebaseapp.com",
  databaseURL: "https://grey-corner-presence-default-rtdb.europe-west1.firebasedatabase.app",
  projectId: "grey-corner-presence",
  storageBucket: "grey-corner-presence.firebasestorage.app",
  messagingSenderId: "730206093359",
  appId: "1:730206093359:web:59e3c145120807f29e46da",
  measurementId: "G-4HCKPGNED7"
};

const EXPORT_URL = "https://script.google.com/macros/s/AKfycbyZFLn4Z8KHsB60caPMkdAFTXHkJcd_aP_oxP5cI_nDG7kZf5MzFm-U7vYPcNEUD4HY1Q/exec";
const EXPORT_SECRET = "greycorner2026";

// ─── GOOGLE SHEETS PLANNING (BAR & SERVICE) ───
const BAR_SHEET_URL = "https://docs.google.com/spreadsheets/d/1mfwB4zNHS79YsNH4vTMUGOdWeQwC3htMgPtDWsrMbWg/gviz/tq?tqx=out:csv&gid=294813093";
const SERVICE_SHEET_URL = "https://docs.google.com/spreadsheets/d/1aKrmu7Hdf1tb4_0QFCGC6VYjUVlRKeDJYLYs9qIM6Aw/gviz/tq?tqx=out:csv&gid=0";

const SHIFT_H_MATIN = "07:00";
const SHIFT_H_SOIR  = "14:30";

// Collaborateurs autorisés à saisir hA aujourd'hui si équipe
const haExceptionsToday = ["SBAI_HAKIMA", "ELGORRAMY_ANISSA", "ELGORRAMY_SOUAD", "ABOUARSA_EDDRISSIA"];
const noLateCalcIds = [];

// Heures habituelles standards de référence
const defaultHPTimes = ["06:00", "07:00", "07:30", "09:00", "10:00", "12:00", "13:00", "14:00", "14:30", "15:00", "17:00"];

const DEFAULT_EQUIPE = [
  { nom: 'ALAOUI',     prenom: 'LAZIZ',     poste: 'SERVICE' },
  { nom: 'BELQASSE',   prenom: 'KHAOULA',   poste: 'CUISINE' },
  { nom: 'BENKHADA',   prenom: 'ABDESLAM',  poste: 'CAISSE' },
  { nom: 'BOUCHNAK',   prenom: 'NAOUAL',    poste: 'CUISINE' },
  { nom: 'BOURAHMA',   prenom: 'ANAS',      poste: 'CUISINE' },
  { nom: 'CHKAIRI',    prenom: 'YOUSSEF',   poste: 'BAR' },
  { nom: 'ELKOBBI',    prenom: 'MOSTAFA',   poste: 'BAR' },
  { nom: 'ELGORRAMY',  prenom: 'ANISSA',    poste: 'MENAGE' },
  { nom: 'ELGORRAMY',  prenom: 'SOUAD',     poste: 'MENAGE' },
  { nom: 'ENNHAILI',   prenom: 'SOUMIA',    poste: 'CAISSE' },
  { nom: 'FILALI',     prenom: 'ABDERAFI',  poste: 'BAR' },
  { nom: 'HATTAF',     prenom: 'MOHAMED',   poste: 'SERVICE' },
  { nom: 'HIDARA',     prenom: 'YOUSSEF',   poste: 'SERVICE' },
  { nom: 'IDRISSI',    prenom: 'SAAD',      poste: 'CUISINE' },
  { nom: 'KAFOUNI',    prenom: 'ZAKARIAE',  poste: 'SERVICE' },
  { nom: 'KHALOUQ',    prenom: 'RACHID',    poste: 'BAR' },
  { nom: 'KTAMI',      prenom: 'EL MOKHTAR',poste: 'SERVICE' },
  { nom: 'LEMSSIEH',   prenom: 'JAWAD',     poste: 'CUISINE' },
  { nom: 'MAJDOUB',    prenom: 'JIHANE',    poste: 'CUISINE' },
  { nom: 'MOHSINE',    prenom: 'YOUNESS',   poste: 'SERVICE' },
  { nom: 'MOUJAHID',   prenom: 'IMANE',     poste: 'CUISINE' },
  { nom: 'SALIL',      prenom: 'HOUDA',     poste: 'CAISSE' },
  { nom: 'SBAI',       prenom: 'HAKIMA',    poste: 'MENAGE' },
  { nom: 'ZAIR',       prenom: 'FATIMA',    poste: 'CUISINE' }
];
