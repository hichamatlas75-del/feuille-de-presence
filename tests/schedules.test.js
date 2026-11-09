/**
 * Tests Unitaires • Logique Métier, Plannings & Arrêts Maladie
 * Grey Corner • Feuille de Présence
 */

const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let ctx;

before(() => {
  ctx = {
    console,
    setTimeout,
    clearTimeout,
    setInterval,
    clearInterval,
    Date,
    Math,
    JSON,
    Set,
    Map,
    Array,
    Object,
    String,
    Number,
    Boolean,
    RegExp,
    Intl,
    firebase: {
      auth: () => ({ currentUser: null })
    },
    localStorage: { getItem: () => null, setItem: () => {} }
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  const rootDir = path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'config.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'schedules.js'), 'utf8'), ctx);
  ctx.EQUIPE = ctx.DEFAULT_EQUIPE;
});

describe('1. Calcul des Retards et Sévérités (resolveEmployeeSchedule)', () => {

  const empService = { nom: 'ALAOUI', prenom: 'LAZIZ', poste: 'SERVICE' };

  it('identifie un collaborateur à l\'heure (hA <= hP) sans retard', () => {
    const resExact = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', hA: '07:00' });
    assert.equal(resExact.isLate, false);
    assert.equal(resExact.isLateLight, false);
    assert.equal(resExact.isLateHeavy, false);
    assert.equal(resExact.lateMin, 0);
    assert.equal(resExact.hasHA, true);
    assert.equal(resExact.handled, true);

    const resAvance = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', hA: '06:50' });
    assert.equal(resAvance.isLate, false);
    assert.equal(resAvance.lateMin, 0);
  });

  it('détecte un retard léger (1 à 15 min inclus) avec isLateLight=true et isLateHeavy=false', () => {
    const resLight = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', hA: '07:12' });
    assert.equal(resLight.isLate, true);
    assert.equal(resLight.isLateLight, true, 'Un retard de 12 min doit être classé retard léger (orange)');
    assert.equal(resLight.isLateHeavy, false);
    assert.equal(resLight.lateMin, 12);
    assert.equal(resLight.handled, true);

    const res15 = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', hA: '07:15' });
    assert.equal(res15.isLate, true);
    assert.equal(res15.isLateLight, true, '15 min pile reste dans la tolérance retard léger');
    assert.equal(res15.isLateHeavy, false);
    assert.equal(res15.lateMin, 15);
  });

  it('détecte un retard lourd (> 15 min) avec isLateHeavy=true et isLateLight=false', () => {
    const resHeavy = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', hA: '07:35' });
    assert.equal(resHeavy.isLate, true);
    assert.equal(resHeavy.isLateLight, false);
    assert.equal(resHeavy.isLateHeavy, true, 'Un retard de 35 min doit être classé retard lourd (rouge saignant)');
    assert.equal(resHeavy.lateMin, 35);
    assert.equal(resHeavy.handled, true);
  });

  it('gère correctement un collaborateur non pointé (en attente)', () => {
    const resPending = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00' });
    assert.equal(resPending.hasHA, false);
    assert.equal(resPending.handled, false, 'Sans hA ni off, le collaborateur doit être non traité (handled=false)');
    assert.equal(resPending.isLate, false);
  });

  it('gère correctement un collaborateur en Repos (OUT)', () => {
    const resOff = ctx.resolveEmployeeSchedule(empService, '2026-11-10', { hP: '07:00', off: true });
    assert.equal(resOff.isOff, true);
    assert.equal(resOff.handled, true, 'Un collaborateur en repos (OUT) est traité (handled=true)');
    assert.equal(resOff.isLate, false);
  });
});

describe('2. Prise en Compte Prioritaire du Statut Arrêt Maladie (M)', () => {

  const empCuisine = { nom: 'BOUCHNAK', prenom: 'NAOUAL', poste: 'CUISINE' };

  it('détecte un arrêt maladie via statut="MALADIE" et garantit handled=true', () => {
    const res = ctx.resolveEmployeeSchedule(empCuisine, '2026-11-10', {
      statut: 'MALADIE',
      motif: 'Certificat 48h'
    });

    assert.equal(res.isMaladie, true);
    assert.equal(res.handled, true, 'Un collaborateur en arrêt maladie doit avoir handled: true');
    assert.equal(res.safeHP, '');
    assert.equal(res.safeHA, '');
    assert.equal(res.isLate, false);
    assert.equal(res.isLateLight, false);
    assert.equal(res.isLateHeavy, false);
    assert.match(res.displayHP, /Maladie/i);
    assert.equal(res.motif, 'Certificat 48h');
  });

  it('détecte un arrêt maladie via tag admin "[MALADIE] Repos médical"', () => {
    const res = ctx.resolveEmployeeSchedule(empCuisine, '2026-11-10', {
      motif: '[MALADIE] Consultation médecin traitant',
      lastEditByAdmin: true
    });

    assert.equal(res.isMaladie, true);
    assert.equal(res.handled, true);
    assert.equal(res.motifMaladie, 'Consultation médecin traitant');
  });

  it('détecte les variantes de statut (M, ARRET_MALADIE, ARRÊT MALADIE)', () => {
    ['M', 'm', 'ARRET_MALADIE', 'ARRÊT MALADIE', 'arret maladie'].forEach(statut => {
      assert.ok(ctx.isExplicitMaladie({ statut }), `Le statut "${statut}" doit être reconnu comme Maladie`);
    });
  });

  it('exclut un collaborateur en arrêt maladie du comptage En Attente', () => {
    const res = ctx.resolveEmployeeSchedule(empCuisine, '2026-11-10', { maladie: true });
    assert.equal(res.handled, true);
    // Dans la logique de kpiPending et pendingBanner :
    // Un collaborateur avec handled=true n'est jamais poussé dans pendingItems
    const isPending = !res.handled;
    assert.equal(isPending, false, 'Un arrêt maladie ne doit jamais être en attente');
  });
});

describe('3. Plannings Spécifiques Métier', () => {

  describe('Rotation Caisse 24h (Salil Houda & Benkhada Abdeslam)', () => {
    it('alterne entre 07:30 et 15:00 par période de 24h hors lundi', () => {
      // 2026-09-24 = Ancre mod 0 (Jeudi) : Salil 07:30, Benkhada 15:00
      const planSal0 = ctx.getCaisseAlternance('SALIL_HOUDA', '2026-09-24');
      const planBen0 = ctx.getCaisseAlternance('BENKHADA_ABDESLAM', '2026-09-24');
      assert.equal(planSal0.hP, '07:30');
      assert.equal(planBen0.hP, '15:00');

      // 2026-09-25 = Lendemain mod 1 (Vendredi) : Salil 15:00, Benkhada 07:30
      const planSal1 = ctx.getCaisseAlternance('SALIL_HOUDA', '2026-09-25');
      const planBen1 = ctx.getCaisseAlternance('BENKHADA_ABDESLAM', '2026-09-25');
      assert.equal(planSal1.hP, '15:00');
      assert.equal(planBen1.hP, '07:30');
    });

    it('applique le repos (OFF) chaque lundi pour celui qui a d\'habitude le shift du soir', () => {
      // Cas A : Lundi 2026-11-09 (mod 0 d'habitude : Salil 07:30, Benkhada 15:00)
      // -> Benkhada (soir d'habitude) est mis en REPOS le lundi
      const planSalA = ctx.getCaisseAlternance('SALIL_HOUDA', '2026-11-09');
      const planBenA = ctx.getCaisseAlternance('BENKHADA_ABDESLAM', '2026-11-09');

      assert.equal(planBenA.off, true, 'Benkhada doit être en REPOS ce lundi car d\'habitude au shift soir');
      assert.equal(planBenA.hP, null);
      assert.equal(planBenA.shift, 'OFF');

      assert.equal(planSalA.off, false, 'Salil reste au shift matin (07:30)');
      assert.equal(planSalA.hP, '07:30');

      // Cas B : Lundi 2026-11-16 (mod 1 d'habitude : Salil 15:00, Benkhada 07:30)
      // -> Salil (soir d'habitude) est mise en REPOS ce lundi-là
      const planSalB = ctx.getCaisseAlternance('SALIL_HOUDA', '2026-11-16');
      const planBenB = ctx.getCaisseAlternance('BENKHADA_ABDESLAM', '2026-11-16');

      assert.equal(planSalB.off, true, 'Salil doit être en REPOS ce lundi car d\'habitude au shift soir');
      assert.equal(planSalB.hP, null);
      assert.equal(planSalB.shift, 'OFF');

      assert.equal(planBenB.off, false, 'Benkhada reste au shift matin (07:30)');
      assert.equal(planBenB.hP, '07:30');
    });

    it('gère le planning fixe de Soumia (09:00 sauf repos le mardi)', () => {
      // 2026-11-10 est un mardi (dayOfWeek = 2)
      const planMardi = ctx.getSoumiaPlanning('2026-11-10');
      assert.equal(planMardi.off, true, 'Soumia doit être en repos (OFF) le mardi');

      // 2026-11-11 est un mercredi (dayOfWeek = 3)
      const planMercredi = ctx.getSoumiaPlanning('2026-11-11');
      assert.equal(planMercredi.off, false);
      assert.equal(planMercredi.hP, '09:00', 'Soumia commence à 09:00 les autres jours');
    });
  });

  describe('Planning Fixe Cuisine Hebdomadaire', () => {
    it('applique les horaires fixes cuisine selon le jour de la semaine', () => {
      // Lundi 2026-11-09 (dayOfWeek = 1)
      const lundiKhaoula = ctx.getCuisinePlanningInfo('KHAOULA', '2026-11-09');
      const lundiNaoual = ctx.getCuisinePlanningInfo('NAOUAL', '2026-11-09');
      const lundiImane = ctx.getCuisinePlanningInfo('IMANE', '2026-11-09');

      assert.equal(lundiKhaoula.hP, '07:00');
      assert.equal(lundiKhaoula.off, false);
      assert.equal(lundiNaoual.hP, '15:00');
      assert.equal(lundiImane.off, true, 'Imane est OFF le lundi');

      // Mardi 2026-11-10 (dayOfWeek = 2)
      const mardiKhaoula = ctx.getCuisinePlanningInfo('KHAOULA', '2026-11-10');
      assert.equal(mardiKhaoula.off, true, 'Khaoula est OFF le mardi');
    });
  });

  describe('Repos Sécurité du Lundi', () => {
    it('considère le poste Sécurité en repos le lundi et à 09:00 les autres jours', () => {
      const empSec = { nom: 'JIRA', prenom: 'MOHAMED', poste: 'SECURITE' };

      // Lundi 2026-11-09
      const resLundi = ctx.resolveEmployeeSchedule(empSec, '2026-11-09', {});
      assert.equal(resLundi.isMonday, true);
      assert.equal(resLundi.effectiveHP, '', 'Le lundi est le repos automatique de sécurité');

      // Mardi 2026-11-10
      const resMardi = ctx.resolveEmployeeSchedule(empSec, '2026-11-10', {});
      assert.equal(resMardi.isMonday, false);
      assert.equal(resMardi.effectiveHP, '09:00', 'Les autres jours le poste sécurité démarre à 09:00');
    });
  });

  describe('Ménage Automatique S1 / S2', () => {
    it('calcule correctement l\'alternance de quinzaine S1 / S2', () => {
      // Calibration : Lundi 5 Octobre 2026 = S2
      assert.equal(ctx.getMenageWeekKey('2026-10-05'), 'S2');
      // Lundi suivant 12 Octobre 2026 = S1
      assert.equal(ctx.getMenageWeekKey('2026-10-12'), 'S1');
      // Lundi 19 Octobre 2026 = S2
      assert.equal(ctx.getMenageWeekKey('2026-10-19'), 'S2');
    });

    it('pré-remplit le pointage automatique pour le personnel de ménage si non saisi', () => {
      const empHakima = { nom: 'SBAI', prenom: 'HAKIMA', poste: 'MENAGE' };
      // Mercredi 14 Octobre 2026 en S1 -> Hakima matin (06:30)
      const res = ctx.resolveEmployeeSchedule(empHakima, '2026-10-14', {});
      assert.equal(res.isMenage, true);
      assert.ok(res.menagePlan, 'Un planning ménage doit être résolu');
      assert.equal(res.isAutoPunched, true, 'Pointage automatique activé');
      assert.equal(res.safeHA, '06:30');
      assert.equal(res.handled, true);
    });
  });
});

describe('4. Respect des Dates d\'Activité (Embauche & Sortie)', () => {

  const empNajia = {
    nom: 'EL AZHARY',
    prenom: 'NAJIA',
    poste: 'MENAGE',
    dateDebut: '2026-11-05',
    dateSortie: '2026-11-07'
  };

  it('résout la date d\'embauche et la date de sortie', () => {
    assert.equal(ctx.getEmployeeStartDate(empNajia), '2026-11-05');
    assert.equal(ctx.getEmployeeEndDate(empNajia), '2026-11-07');
  });

  it('bloque et neutralise un collaborateur avant sa date d\'embauche', () => {
    // 2026-11-04 < 2026-11-05
    const resAvant = ctx.resolveEmployeeSchedule(empNajia, '2026-11-04', {});
    assert.equal(resAvant.notStartedYet, true);
    assert.equal(resAvant.alreadyEnded, false);
    assert.equal(resAvant.handled, true, 'Un non-commencé est neutre et handled=true pour ne pas fausser les KPIs');
    assert.equal(resAvant.safeHA, '');
    assert.equal(resAvant.safeHP, '');
    assert.equal(resAvant.effectiveHP, '');

    assert.equal(ctx.isEmployeeStartedOnDate(empNajia, '2026-11-04'), false);
  });

  it('active le collaborateur durant sa période de contrat (05/11 au 07/11)', () => {
    // 2026-11-06 est entre 2026-11-05 et 2026-11-07
    assert.equal(ctx.isEmployeeStartedOnDate(empNajia, '2026-11-06'), true);
    const resPendant = ctx.resolveEmployeeSchedule(empNajia, '2026-11-06', {});
    assert.equal(resPendant.notStartedYet, false);
    assert.equal(resPendant.alreadyEnded, false);
  });

  it('désactive le collaborateur dès sa date de sortie (à partir du 08/11/2026)', () => {
    // 2026-11-08 > 2026-11-07
    assert.equal(ctx.isEmployeeStartedOnDate(empNajia, '2026-11-08'), false);
    const resSortie = ctx.resolveEmployeeSchedule(empNajia, '2026-11-08', {});
    assert.equal(resSortie.alreadyEnded, true);
    assert.equal(resSortie.handled, true);
  });

  it('filtre les collaborateurs non actifs pour une date donnée dans getActiveEquipeForDate', () => {
    const list = [
      { nom: 'ALAOUI', prenom: 'LAZIZ', poste: 'SERVICE' },
      empNajia
    ];
    // Avant le 05/11 : 1 seul actif
    const activeAvant = ctx.getActiveEquipeForDate('2026-11-01', list);
    assert.equal(activeAvant.length, 1);
    assert.equal(activeAvant[0].nom, 'ALAOUI');

    // Le 06/11 : 2 actifs
    const activePendant = ctx.getActiveEquipeForDate('2026-11-06', list);
    assert.equal(activePendant.length, 2);

    // Le 08/11 : Najia n'est plus dans l'équipe active
    const activeApres = ctx.getActiveEquipeForDate('2026-11-08', list);
    assert.equal(activeApres.length, 1);
    assert.equal(activeApres[0].nom, 'ALAOUI');
  });
});
