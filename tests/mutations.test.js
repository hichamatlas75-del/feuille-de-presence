/**
 * Tests Unitaires • Cohérence des Mutations de Présence (upd) & Nettoyage des Motifs
 * Grey Corner • Feuille de Présence
 */

const { describe, it, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

let ctx;
let mockDb;

function createMockDatabase() {
  const store = {};
  const operations = [];

  const getRef = (refPath) => {
    return {
      path: refPath,
      update: async (payload) => {
        operations.push({ type: 'update', path: refPath, payload });
        store[refPath] = { ...(store[refPath] || {}), ...payload };
        return Promise.resolve();
      },
      set: async (payload) => {
        operations.push({ type: 'set', path: refPath, payload });
        store[refPath] = payload;
        return Promise.resolve();
      },
      remove: async () => {
        operations.push({ type: 'remove', path: refPath });
        delete store[refPath];
        return Promise.resolve();
      },
      once: async () => ({
        val: () => (store[refPath] !== undefined ? store[refPath] : null)
      })
    };
  };

  return {
    store,
    operations,
    ref: getRef,
    resetOps: () => { operations.length = 0; }
  };
}

beforeEach(() => {
  mockDb = createMockDatabase();

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
    role: 'gerant',
    currentDate: '2026-11-10',
    document: {
      getElementById: (id) => {
        if (id === 'datePicker') return { value: ctx.currentDate };
        if (id === 'exportMsg') return { textContent: '', classList: { add: () => {}, remove: () => {} }, style: {} };
        return null;
      }
    },
    firebase: {
      initializeApp: () => {},
      auth: () => ({ currentUser: { getIdToken: async () => 'mock-token' } }),
      database: () => mockDb
    },
    database: mockDb,
    localStorage: { getItem: () => null, setItem: () => {} },
    rebuildMerged: () => {},
    render: () => {},
    saveHPHistory: () => {},
    fetch: async () => ({ ok: true, text: async () => '' })
  };
  ctx.window = ctx;
  vm.createContext(ctx);

  const rootDir = path.resolve(__dirname, '..');
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'config.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'schedules.js'), 'utf8'), ctx);
  vm.runInContext(fs.readFileSync(path.join(rootDir, 'js', 'services.js'), 'utf8'), ctx);

  ctx.EQUIPE = ctx.DEFAULT_EQUIPE;
  ctx.presencesCache = {};
  ctx.punchesCache = {};
  ctx.motifsCache = {};
  ctx.latestDataCache = {};
});

describe('1. Mutation Basculement Repos (OUT)', () => {

  const empId = 'ALAOUI_LAZIZ';
  const testDate = '2026-11-10';

  it('bascule un collaborateur en Repos (OUT) et réinitialise hA, retard et on', async () => {
    // État initial avec pointage
    ctx.latestDataCache[empId] = { hP: '07:00', hA: '07:10', retard: true, retardMin: 10 };

    await ctx.upd(empId, 'off', true);

    const updateOp = mockDb.operations.find(op =>
      op.type === 'update' && op.path === `presences/${testDate}/${empId}`
    );

    assert.ok(updateOp, 'Une opération update doit être effectuée sur la présence');
    assert.equal(updateOp.payload.off, true);
    assert.equal(updateOp.payload.hA, null);
    assert.equal(updateOp.payload.retard, null);
    assert.equal(updateOp.payload.retardMin, null);
    assert.equal(updateOp.payload.on, false);
  });

  it('supprime tout motif de retard existant lors du basculement en Repos (OUT)', async () => {
    // Motif présent dans broadcast/motifs et punches
    mockDb.store[`broadcast/motifs/${testDate}/${empId}`] = 'Embouteillage';
    mockDb.store[`punches/${testDate}/${empId}/motif`] = 'Embouteillage';
    ctx.motifsCache[empId] = 'Embouteillage';
    ctx.latestDataCache[empId] = { motif: 'Embouteillage', hA: '07:20', retard: true };

    await ctx.upd(empId, 'off', true);

    // Vérifier les suppressions dans Firebase
    const removeMotifOp = mockDb.operations.find(op =>
      op.type === 'remove' && op.path.includes(`motifs/${testDate}/${empId}`)
    );
    assert.ok(removeMotifOp, 'Le motif doit être supprimé de Firebase lors du passage OUT');

    // Vérifier le nettoyage du cache local
    assert.equal(ctx.latestDataCache[empId].motif, '');
    assert.equal(ctx.motifsCache[empId], undefined);
  });

  it('remet en actif un collaborateur sans effacer les horaires prévus', async () => {
    mockDb.resetOps();
    await ctx.upd(empId, 'off', false);

    const updateOp = mockDb.operations.find(op =>
      op.type === 'update' && op.path === `presences/${testDate}/${empId}`
    );
    assert.ok(updateOp);
    assert.equal(updateOp.payload.off, false);
    assert.equal(updateOp.payload.hA, undefined, 'Ne doit pas modifier hA lors de la réactivation');
  });
});

describe('2. Nettoyage des Motifs lors de la Modification des Horaires', () => {

  const empId = 'ALAOUI_LAZIZ';
  const testDate = '2026-11-10';

  it('supprime le motif si hP est modifié pour être supérieur ou égal à hA (plus en retard)', async () => {
    // L'employé était pointé à 07:20 avec hP=07:00 (en retard de 20 min)
    ctx.latestDataCache[empId] = { hP: '07:00', hA: '07:20', retard: true, retardMin: 20, motif: 'Panne' };
    ctx.motifsCache[empId] = 'Panne';
    mockDb.store[`broadcast/motifs/${testDate}/${empId}`] = 'Panne';

    // Le gérant décale hP à 07:30 -> L'employé arrive à 07:20 donc à l'heure !
    await ctx.upd(empId, 'hP', '07:30');

    const removeOp = mockDb.operations.find(op =>
      op.type === 'remove' && op.path.includes(`motifs/${testDate}/${empId}`)
    );
    assert.ok(removeOp, 'Le motif doit être supprimé car l employé n est plus en retard');
    assert.equal(ctx.latestDataCache[empId].motif, '');
  });

  it('conserve le motif si hP modifié laisse le collaborateur en retard', async () => {
    ctx.latestDataCache[empId] = { hP: '07:00', hA: '07:35', retard: true, retardMin: 35, motif: 'Panne' };
    ctx.motifsCache[empId] = 'Panne';
    mockDb.resetOps();

    // Le gérant passe hP à 07:15 -> L'employé arrive à 07:35 donc toujours en retard de 20 min
    await ctx.upd(empId, 'hP', '07:15');

    const removeOp = mockDb.operations.find(op =>
      op.type === 'remove' && op.path.includes(`motifs/${testDate}/${empId}`)
    );
    assert.equal(removeOp, undefined, 'Le motif doit être conservé si le collaborateur est toujours en retard');
  });

  it('supprime le motif si hA est corrigé à une heure sans retard', async () => {
    ctx.latestDataCache[empId] = { hP: '07:00', hA: '07:25', retard: true, retardMin: 25, motif: 'Retard bus' };
    ctx.presencesCache[empId] = { hP: '07:00' };
    ctx.motifsCache[empId] = 'Retard bus';
    mockDb.store[`broadcast/motifs/${testDate}/${empId}`] = 'Retard bus';

    // Correction de hA à 07:00 pile
    await ctx.upd(empId, 'hA', '07:00');

    const removeOp = mockDb.operations.find(op =>
      op.type === 'remove' && op.path.includes(`motifs/${testDate}/${empId}`)
    );
    assert.ok(removeOp, 'Le motif doit être supprimé dès que hA est mis à l heure');
  });

  it('supprime le motif si le pointage hA est effacé (hA="")', async () => {
    ctx.latestDataCache[empId] = { hP: '07:00', hA: '07:30', retard: true, motif: 'Oubli' };
    ctx.presencesCache[empId] = { hP: '07:00' };
    mockDb.resetOps();

    await ctx.upd(empId, 'hA', '');

    const removeOp = mockDb.operations.find(op =>
      op.type === 'remove' && op.path.includes(`motifs/${testDate}/${empId}`)
    );
    assert.ok(removeOp, 'Le motif doit être supprimé si le pointage hA est effacé');
  });
});

describe('3. Verrouillage de Sécurité pour Arrêt Maladie (M)', () => {

  const empId = 'BOUCHNAK_NAOUAL';

  it('bloque toute mutation Repos (OUT) pour un collaborateur en arrêt maladie validé', async () => {
    ctx.latestDataCache[empId] = {
      statut: 'MALADIE',
      motif: 'Certificat médical reçu'
    };
    mockDb.resetOps();

    await ctx.upd(empId, 'off', true);

    const updateOp = mockDb.operations.find(op =>
      op.type === 'update' && op.path.includes(`presences/`)
    );
    assert.equal(updateOp, undefined, 'La mutation doit être refusée pour un collaborateur en maladie');
  });
});

describe('4. Contrôle de la Date d\'Embauche (dateDebut)', () => {

  const empNajia = 'EL_AZHARY_NAJIA';

  it('bloque toute écriture pour un collaborateur avant sa date d\'embauche effective', async () => {
    // Najia commence le 2026-11-05
    ctx.currentDate = '2026-11-01'; // Date antérieure
    mockDb.resetOps();

    await ctx.upd(empNajia, 'off', true);

    assert.equal(mockDb.operations.length, 0, 'Aucune opération Firebase ne doit être émise avant la date d embauche');
  });

  it('autorise les mutations à partir de sa date d\'embauche', async () => {
    ctx.currentDate = '2026-11-06'; // Date active
    mockDb.resetOps();

    await ctx.upd(empNajia, 'off', true);

    assert.ok(mockDb.operations.length > 0, 'L écriture doit être acceptée pour un collaborateur actif');
  });
});
