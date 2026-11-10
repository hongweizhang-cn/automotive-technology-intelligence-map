import { beforeEach, describe, expect, it } from 'vitest';
import { initialData } from '../data/initialData';
import i18n from '../i18n';
import { buildComparisonRows } from './architectureComparison';
import { checkDataQuality } from './dataQuality';
import { readData, readLearning, saveData, saveLearning, validateImport } from './dataService';
import { searchEntities } from './entitySearch';
import { filterTechnologyEntities, getTechnologyRelationLinks, technologyDomains } from './technologyCatalog';
import { appendExplorationStep, collapseExplorationStep, getDirectRelatedEntityIds, getNodeHighlight, isRelationVisible } from './graphInteractions';
import type { AppData, Entity } from '../types';

const storage = new Map<string, string>();

beforeEach(() => {
  storage.clear();
  Object.defineProperty(globalThis, 'localStorage', {
    configurable: true,
    value: {
      getItem: (key: string) => storage.get(key) ?? null,
      setItem: (key: string, value: string) => storage.set(key, String(value)),
      removeItem: (key: string) => storage.delete(key),
    },
  });
});

describe('reference data and migration', () => {
  it('loads all six propulsion types and all four E/E architectures', () => {
    expect(new Set(initialData.architectures.map((item) => item.propulsion))).toEqual(new Set(['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']));
    expect(new Set(initialData.architectures.map((item) => item.eeArchitecture))).toEqual(new Set(['Distributed', 'Domain', 'Zonal', 'Centralized']));
    expect(validateImport(initialData).architectures).toHaveLength(6);
  });

  it('validates relationship targets and rejects missing targets or duplicate IDs', () => {
    expect(() => validateImport(initialData)).not.toThrow();
    const broken = structuredClone(initialData);
    broken.entities[0].relatesTo.push('missing-target');
    expect(() => validateImport(broken)).toThrow(/references missing entity/);
    const duplicate = structuredClone(initialData);
    duplicate.entities.push(duplicate.entities[0]);
    expect(() => validateImport(duplicate)).toThrow(/duplicate entity IDs/);
  });

  it('round-trips JSON and migrates version 1 without replacing local records unexpectedly', () => {
    const exported: unknown = JSON.parse(JSON.stringify(initialData));
    expect(validateImport(exported)).toEqual(initialData);
    storage.set('automotive-map:data:v1', JSON.stringify({ ...initialData, version: 1 }));
    const migrated = readData();
    expect(migrated.data.version).toBe(2);
    expect(JSON.parse(storage.get('automotive-map:data:v1') ?? '{}').version).toBe(2);
    saveData(initialData);
    expect(readData().data.entities).toHaveLength(initialData.entities.length);
  });

  it('round-trips comparison profiles while accepting older records with no profile', () => {
    const data = structuredClone(initialData);
    const architecture = data.architectures.find((item) => item.propulsion === 'BEV');
    if (!architecture) throw new Error('BEV reference architecture is missing.');
    architecture.comparisonProfile = {
      technicalAdvantages: { status: 'Available', value: { zh: '经审核的测试内容', en: 'Reviewed test content' } },
      powerGeneration: { status: 'Not Applicable', value: { zh: '', en: '' } },
      technicalLimitations: { status: 'Not Available', value: { zh: '', en: '' } },
    };
    const imported = validateImport(JSON.parse(JSON.stringify(data)));
    expect(imported.architectures.find((item) => item.id === architecture.id)?.comparisonProfile).toEqual(architecture.comparisonProfile);
    expect(validateImport(initialData).architectures.every((item) => item.comparisonProfile === undefined)).toBe(true);
    const invalid = structuredClone(data);
    const invalidRecord = invalid.architectures.find((item) => item.id === architecture.id);
    if (!invalidRecord?.comparisonProfile?.technicalLimitations) throw new Error('Comparison fixture is missing.');
    invalidRecord.comparisonProfile.technicalLimitations = { status: 'Not Applicable', value: { zh: '填错', en: '' } };
    expect(() => validateImport(invalid)).toThrow(/invalid entity lists/);
  });

  it('persists learning data in localStorage', () => {
    const learning = { favorites: ['tech-canfd'], notes: { 'tech-canfd': 'Review later' } };
    saveLearning(learning);
    expect(readLearning()).toEqual(learning);
  });

  it('merges new seed technologies into existing local data without replacing user records or learning data', () => {
    const stored = structuredClone(initialData);
    stored.entities = stored.entities.filter((entity) => entity.id !== 'tech-arp');
    for (const entity of stored.entities) {
      entity.relatesTo = entity.relatesTo.filter((id) => id !== 'tech-arp');
      entity.relations = entity.relations?.filter((relation) => relation.targetId !== 'tech-arp');
    }
    const ethernet = stored.entities.find((entity) => entity.id === 'tech-ethernet');
    if (!ethernet) throw new Error('Legacy Automotive Ethernet record is missing.');
    ethernet.name = { zh: '用户自定义车载以太网', en: 'User-edited Automotive Ethernet' };
    ethernet.reviewStatus = 'Approved';
    ethernet.createdBy = 'Human';
    ethernet.technologyDetails = undefined;
    ethernet.sources = [];
    storage.set('automotive-map:data:v1', JSON.stringify(stored));
    const learning = { favorites: ['tech-ethernet'], notes: { 'tech-ethernet': 'Keep this note' } };
    storage.set('automotive-map:learning:v1', JSON.stringify(learning));

    const migrated = readData();
    expect(migrated.data.entities.some((entity) => entity.id === 'tech-arp')).toBe(true);
    const mergedEthernet = migrated.data.entities.find((entity) => entity.id === 'tech-ethernet');
    expect(mergedEthernet?.name.en).toBe('User-edited Automotive Ethernet');
    expect(mergedEthernet?.technologyDetails?.domain).toBe('automotive-ethernet');
    expect(mergedEthernet?.reviewStatus).toBe('Pending Review');
    expect(mergedEthernet?.createdBy).toBe('Agent');
    expect(readLearning()).toEqual(learning);
    expect(JSON.parse(storage.get('automotive-map:data:v1') ?? '{}').entities.some((entity: Entity) => entity.id === 'tech-arp')).toBe(true);
  });

  it('moves Agent-created approved imports back into human review', () => {
    const attempted = structuredClone(initialData) as AppData;
    attempted.entities[0] = { ...attempted.entities[0], createdBy: 'Agent', reviewStatus: 'Approved' };
    expect(validateImport(attempted).entities[0].reviewStatus).toBe('Pending Review');
  });

  it('keeps content review independent from source verification', () => {
    const record = initialData.entities.find((entity) => entity.reviewStatus === 'Approved');
    expect(record?.verificationStatus).toBe('Unverified');
    expect(validateImport(initialData).entities.find((entity) => entity.id === record?.id)?.reviewStatus).toBe('Approved');
    expect(validateImport(initialData).entities.find((entity) => entity.id === record?.id)?.verificationStatus).toBe('Unverified');
  });
});

describe('architecture comparison, search, and data quality', () => {
  it('derives propulsion comparison content from current systems and topology', () => {
    const rows = buildComparisonRows(initialData, 'propulsion', ['ICE', 'BEV'], 'en');
    const storage = rows.find((row) => row.key === 'energyStorage');
    const conversion = rows.find((row) => row.key === 'energyConversion');
    const controls = rows.find((row) => row.key === 'mainControlUnits');
    expect(storage?.values.BEV.value).toContain('Traction Battery System');
    expect(controls?.values.ICE.value).toContain('Engine Control Unit');
    expect(conversion?.values.BEV.value).toBe(initialData.architectures.find((item) => item.propulsion === 'BEV')?.topology.en);
    expect(rows.find((row) => row.key === 'primaryEnergySource')?.values.BEV.status).toBe('Not Available');
    expect(rows).toHaveLength(12);
  });

  it('compares E/E modes using existing ECU and relation data', () => {
    const rows = buildComparisonRows(initialData, 'ee', ['Distributed', 'Domain', 'Zonal', 'Centralized'], 'en');
    expect(rows).toHaveLength(10);
    expect(rows.find((row) => row.key === 'controllerOrganization')?.values.Domain.value).toContain('Powertrain Domain Controller');
    expect(rows.find((row) => row.key === 'controllerOrganization')?.values.Zonal.value).toContain('Zonal Controller');
    expect(rows.find((row) => row.key === 'wiringArchitecture')?.values.Domain.status).toBe('Not Available');
  });

  it('builds comparison rows for all six propulsion types and four E/E modes', () => {
    const powertrainRows = buildComparisonRows(initialData, 'propulsion', ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'], 'en');
    const eeRows = buildComparisonRows(initialData, 'ee', ['Distributed', 'Domain', 'Zonal', 'Centralized'], 'en');
    expect(powertrainRows.every((row) => ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'].every((id) => row.values[id]))).toBe(true);
    expect(eeRows.every((row) => ['Distributed', 'Domain', 'Zonal', 'Centralized'].every((id) => row.values[id]))).toBe(true);
  });

  it('distinguishes explicit Not Applicable from missing comparison information', () => {
    const data = structuredClone(initialData);
    const bev = data.architectures.find((item) => item.propulsion === 'BEV');
    if (!bev) throw new Error('BEV reference architecture is missing.');
    bev.comparisonProfile = {
      primaryEnergySource: { status: 'Not Applicable', value: { zh: '', en: '' } },
      technicalAdvantages: { status: 'Available', value: { zh: '仅供测试', en: 'Test only' } },
    };
    const rows = buildComparisonRows(data, 'propulsion', ['BEV', 'ICE'], 'en');
    const chineseRows = buildComparisonRows(data, 'propulsion', ['BEV'], 'zh');
    expect(rows.find((row) => row.key === 'primaryEnergySource')?.values.BEV.status).toBe('Not Applicable');
    expect(rows.find((row) => row.key === 'primaryEnergySource')?.values.ICE.status).toBe('Not Available');
    expect(rows.find((row) => row.key === 'technicalAdvantages')?.values.BEV.value).toBe('Test only');
    expect(chineseRows.find((row) => row.key === 'technicalAdvantages')?.values.BEV.value).toBe('仅供测试');
  });

  it('filters only selected, explicitly recorded relationship types', () => {
    expect(isRelationVisible('contains', ['contains'])).toBe(true);
    expect(isRelationVisible('controls', ['contains'])).toBe(false);
    expect(isRelationVisible('related_to', ['related_to'])).toBe(true);
  });

  it('highlights direct neighbors and expands or collapses a bounded exploration path', () => {
    const neighbors = getDirectRelatedEntityIds('sys-battery', initialData.entities);
    expect(neighbors).toContain('ecu-bms');
    expect(neighbors).toContain('hw-battery-pack');
    const highlight = getNodeHighlight('ecu-bms', 'sys-battery', new Set(neighbors), ['sys-battery']);
    expect(highlight).toEqual({ selected: false, adjacent: true, dimmed: false, path: false });
    expect(getNodeHighlight('company-bosch', 'sys-battery', new Set(neighbors), []).dimmed).toBe(true);
    const expanded = appendExplorationStep(['sys-battery'], 'ecu-bms');
    expect(expanded).toEqual(['sys-battery', 'ecu-bms']);
    expect(appendExplorationStep(expanded, 'ecu-bms')).toEqual(expanded);
    expect(collapseExplorationStep(expanded)).toEqual(['sys-battery']);
  });

  it('searches bilingual descriptions and filters by category, propulsion, and E/E architecture', () => {
    expect(searchEntities(initialData, 'battery', { category: 'system', propulsion: 'BEV' }).some((entity) => entity.id === 'sys-battery')).toBe(true);
    expect(searchEntities(initialData, 'fuel cell', { category: 'system', propulsion: 'BEV' })).toHaveLength(0);
    expect(searchEntities(initialData, 'domain', { category: 'ecu', eeArchitecture: 'Domain' }).length).toBeGreaterThan(0);
  });

  it('reports duplicates, incomplete fields, missing relation targets, and unverified evidence', () => {
    const data = structuredClone(initialData) as AppData;
    data.entities[0].relations = [{
      targetId: 'not-present',
      type: 'not-a-relation' as never,
      description: { zh: '', en: '' },
    }];
    data.entities[1] = {
      ...data.entities[1],
      name: { zh: '', en: '' },
      description: { zh: '', en: '' },
    };
    data.entities.push({ ...data.entities[0], id: 'duplicate-copy' });
    data.architectures[0].systemIds.push('missing-system');
    const report = checkDataQuality(data);
    expect(report.totalEntities).toBe(data.entities.length);
    expect(report.issues.some((issue) => issue.key === 'missing-target')).toBe(true);
    expect(report.issues.some((issue) => issue.key === 'invalid-relation-type')).toBe(true);
    expect(report.issues.some((issue) => issue.key === 'missing-name')).toBe(true);
    expect(report.issues.some((issue) => issue.key === 'missing-relation-description')).toBe(true);
    expect(report.issues.some((issue) => issue.key === 'duplicate-entity')).toBe(true);
    expect(report.unverifiedSources).toBeGreaterThan(0);
  });

  it('provides labels in both supported languages', async () => {
    await i18n.changeLanguage('en');
    expect(i18n.t('comparison')).toBe('Architecture Comparison');
    await i18n.changeLanguage('zh');
    expect(i18n.t('comparison')).toBe('架构比较');
  });
});

describe('technology knowledge catalog', () => {
  it('loads the five engineering domains and the requested core technology records', () => {
    expect(technologyDomains.map((item) => item.id)).toEqual([
      'vehicle-communication', 'automotive-ethernet', 'automotive-diagnostics',
      'automotive-software-architecture', 'software-defined-vehicle',
    ]);
    const ids = new Set(initialData.entities.map((entity) => entity.id));
    for (const id of [
      'tech-can', 'tech-canfd', 'tech-lin', 'tech-ethernet', 'tech-100base', 'tech-1000base',
      'tech-ethernet-mac', 'tech-ethernet-switch', 'tech-vlan', 'tech-ipv4', 'tech-ipv6', 'tech-arp', 'tech-ndp',
      'tech-uds', 'tech-doip', 'tech-diagnostic-tester', 'tech-diagnostic-session', 'tech-dtc', 'tech-ecu-reprogramming',
      'tech-autosar-classic', 'tech-autosar-adaptive', 'tech-soa', 'tech-middleware', 'tech-sdv', 'tech-ota', 'tech-fota', 'tech-sota',
    ]) expect(ids.has(id), `missing technology ${id}`).toBe(true);
  });

  it('filters technology domain and searches bilingual names and hierarchy fields', () => {
    const ethernet = filterTechnologyEntities(initialData.entities, '', 'automotive-ethernet', 'en');
    expect(ethernet.some((entity) => entity.id === 'tech-100base')).toBe(true);
    expect(ethernet.every((entity) => entity.technologyDetails?.domain === 'automotive-ethernet')).toBe(true);
    expect(filterTechnologyEntities(initialData.entities, '邻居发现', 'all', 'zh').map((entity) => entity.id)).toContain('tech-ndp');
    expect(filterTechnologyEntities(initialData.entities, 'Diagnostic Session', 'automotive-diagnostics', 'en').map((entity) => entity.id)).toContain('tech-diagnostic-session');
  });

  it('uses explicit layered protocol classifications and preserves bilingual names', () => {
    const byId = new Map(initialData.entities.map((entity) => [entity.id, entity]));
    expect(byId.get('tech-100base')?.technologyDetails?.layer?.en).toBe('Physical layer');
    expect(byId.get('tech-ethernet-mac')?.technologyDetails?.layer?.en).toBe('Data link');
    expect(byId.get('tech-ipv4')?.technologyDetails?.layer?.en).toBe('Network');
    expect(byId.get('tech-arp')?.technologyDetails?.subdomain?.en).toBe('IPv4 address resolution');
    expect(byId.get('tech-ndp')?.name.zh).toBe('NDP');
    expect(byId.get('tech-ndp')?.name.en).toContain('Neighbor Discovery');
  });

  it('records semantically typed diagnostic, protocol, and AUTOSAR relations', () => {
    const entity = (id: string) => initialData.entities.find((item) => item.id === id);
    const has = (sourceId: string, targetId: string, type: string) =>
      entity(sourceId)?.relations?.some((relation) => relation.targetId === targetId && relation.type === type);
    expect(has('tech-ipv4', 'tech-arp', 'uses')).toBe(true);
    expect(has('tech-ipv6', 'tech-ndp', 'uses')).toBe(true);
    expect(has('tech-doip', 'tech-uds', 'transports')).toBe(true);
    expect(has('tech-diagnostic-session', 'tech-uds', 'part_of')).toBe(true);
    expect(has('tech-soa', 'tech-autosar-adaptive', 'related_to')).toBe(true);
    expect(has('tech-autosar-classic', 'tech-autosar-adaptive', 'related_to')).toBe(true);
  });

  it('explores incoming and outgoing links and keeps agent-authored records pending review', () => {
    const autosar = initialData.entities.find((entity) => entity.id === 'tech-autosar-adaptive');
    if (!autosar) throw new Error('Adaptive AUTOSAR seed is missing.');
    const links = getTechnologyRelationLinks(autosar, initialData.entities);
    expect(links.some((link) => link.entity.id === 'tech-soa' && link.direction === 'incoming')).toBe(true);
    expect(links.some((link) => link.entity.id === 'tech-autosar-classic' && link.direction === 'incoming')).toBe(true);
    const agentCreated = initialData.entities.filter((entity) => entity.category === 'technology' && entity.createdBy === 'Agent');
    expect(agentCreated.length).toBeGreaterThan(0);
    expect(agentCreated.every((entity) => entity.reviewStatus === 'Pending Review')).toBe(true);
    const imported = validateImport(JSON.parse(JSON.stringify(initialData)));
    expect(imported.entities.find((entity) => entity.id === 'tech-arp')?.sources?.[0]?.publisher).toBe('IETF');
  });

  it('accepts legacy technology records without optional details or publication dates', () => {
    const legacy = structuredClone(initialData);
    delete legacy.entities[0].technologyDetails;
    expect(validateImport({ ...legacy, version: 1 }).version).toBe(2);
  });
});
