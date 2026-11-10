import type {
  AppData,
  Architecture,
  ArchitectureComparisonDimension,
  ComparisonEntryStatus,
  Entity,
  EvidenceSource,
  Language,
  Propulsion,
  ReviewStatus,
  VerificationStatus,
} from '../types';
import { comparisonDimensions } from './comparisonDimensions';

export type EeArchitecture = Architecture['eeArchitecture'];
export type ComparisonMode = 'propulsion' | 'ee';

export interface ComparisonCell {
  status: ComparisonEntryStatus;
  value: string;
  entityIds: string[];
  reviewStatus: ReviewStatus;
  verificationStatus: VerificationStatus;
  sources: EvidenceSource[];
}

export interface ComparisonRow {
  key: ArchitectureComparisonDimension;
  group: 'propulsion' | 'ee';
  label: { zh: string; en: string };
  values: Record<string, ComparisonCell>;
}

const eeArchitectures: EeArchitecture[] = ['Distributed', 'Domain', 'Zonal', 'Centralized'];
function names(ids: string[], entities: Map<string, Entity>, language: Language): string {
  const found = ids.map((id) => entities.get(id))
    .filter((entity): entity is Entity => Boolean(entity && entity.reviewStatus === 'Approved'))
    .map((entity) => entity.name[language] || entity.name.en);
  return found.length ? found.join(', ') : '';
}

function systemsFor(architecture: Architecture, entities: Map<string, Entity>): Entity[] {
  return architecture.systemIds.map((id) => entities.get(id))
    .filter((entity): entity is Entity => Boolean(entity && entity.category === 'system' && entity.reviewStatus === 'Approved'));
}

function relatedCategories(systems: Entity[], entities: Map<string, Entity>, categories: readonly string[]): string[] {
  const ids = systems.flatMap((system) => [
    ...(system.relatesTo ?? []),
    ...(system.relations ?? []).map((relation) => relation.targetId),
  ]);
  return Array.from(new Set(ids)).filter((id) => {
    const target = entities.get(id);
    return Boolean(target && categories.includes(target.category));
  });
}

function cell(
  value: string,
  entityIds: string[],
  records: Architecture[],
  entities: Map<string, Entity>,
  explicitStatus?: ComparisonEntryStatus,
  explicitSources?: EvidenceSource[],
): ComparisonCell {
  const linkedEntities = entityIds.map((id) => entities.get(id)).filter((item): item is Entity => Boolean(item));
  const recordSources = records.flatMap((record) => record.sources ?? []);
  const entitySources = linkedEntities.flatMap((entity) => entity.sources ?? []);
  const sources = explicitSources ?? Array.from(new Map([...recordSources, ...entitySources].map((source) => [source.id, source])).values());
  const statuses = [...records.map((record) => record.reviewStatus), ...linkedEntities.map((entity) => entity.reviewStatus)];
  const reviewStatus: ReviewStatus = statuses.includes('Rejected') ? 'Rejected'
    : statuses.includes('Pending Review') ? 'Pending Review'
      : statuses.includes('Draft') ? 'Draft' : 'Approved';
  const verificationStatus: VerificationStatus = sources.length > 0
    && sources.every((source) => {
      const owner = linkedEntities.find((entity) => entity.sources?.some((item) => item.id === source.id));
      const record = records.find((item) => item.sources?.some((entry) => entry.id === source.id));
      return owner?.verificationStatus === 'Verified' || record?.verificationStatus === 'Verified';
    })
    ? 'Verified'
    : records.some((record) => record.verificationStatus === 'Pending Verification')
      || linkedEntities.some((entity) => entity.verificationStatus === 'Pending Verification')
      ? 'Pending Verification' : 'Unverified';
  return {
    status: explicitStatus ?? (value ? 'Available' : 'Not Available'),
    value,
    entityIds,
    reviewStatus,
    verificationStatus,
    sources,
  };
}

function profileCell(
  records: Architecture[],
  dimension: ArchitectureComparisonDimension,
  entities: Map<string, Entity>,
  language: Language,
): ComparisonCell | undefined {
  const entries = records.map((record) => record.comparisonProfile?.[dimension]).filter((entry): entry is NonNullable<typeof entry> => Boolean(entry));
  if (!entries.length || entries.length !== records.length) return undefined;
  const signatures = new Set(entries.map((entry) => `${entry.status}:${entry.value.zh}:${entry.value.en}`));
  if (signatures.size === 1) {
    const entry = entries[0];
    return cell(entry.status === 'Available' ? entry.value[language] || entry.value.en || entry.value.zh : '', [], records, entities, entry.status);
  }
  const availableValues = Array.from(new Set(entries.filter((entry) => entry.status === 'Available').map((entry) => entry.value[language]).filter(Boolean)));
  if (availableValues.length) return cell(availableValues.join('; '), [], records, entities, 'Available');
  return cell('', [], records, entities, 'Not Available');
}

function addRows(
  definitions: typeof comparisonDimensions,
  values: Map<ArchitectureComparisonDimension, (records: Architecture[]) => { value: string; ids: string[] }>,
  recordsById: Map<string, Architecture[]>,
  entities: Map<string, Entity>,
  mode: ComparisonMode,
  language: Language,
): ComparisonRow[] {
  return definitions.filter((definition) => definition.group === mode).map((definition) => ({
    key: definition.id,
    group: definition.group,
    label: definition.label,
    values: Object.fromEntries([...recordsById].map(([id, records]) => {
        const explicit = profileCell(records, definition.id, entities, language);
      if (explicit) return [id, explicit];
      const result = values.get(definition.id)?.(records) ?? { value: '', ids: [] };
      return [id, cell(result.value, result.ids, records, entities)];
    })),
  }));
}

function propulsionRows(
  architectures: Architecture[],
  entities: Map<string, Entity>,
  language: Language,
): ComparisonRow[] {
  const records = new Map(architectures.map((architecture) => [architecture.propulsion, [architecture]]));
  const derived = new Map<ArchitectureComparisonDimension, (items: Architecture[]) => { value: string; ids: string[] }>([
    ['energyStorage', (items) => {
      const systems = items.flatMap((item) => systemsFor(item, entities)).filter((entity) => /battery|hydrogen/i.test(entity.id));
      return { value: names(systems.map((entity) => entity.id), entities, language), ids: systems.map((entity) => entity.id) };
    }],
    ['energyConversion', (items) => ({ value: items.map((item) => item.topology[language] || item.topology.en).filter(Boolean).join('; '), ids: [] })],
    ['tractionSystem', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => item.systemIds).filter((id) => ['sys-electric-drive', 'sys-transmission', 'sys-powertrain'].includes(id))));
      return { value: names(ids, entities, language), ids };
    }],
    ['mainControlUnits', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => item.ecuIds)));
      return { value: names(ids, entities, language), ids };
    }],
    ['communicationNetworks', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => relatedCategories(systemsFor(item, entities), entities, ['network']))));
      return { value: names(ids, entities, language), ids };
    }],
  ]);
  return addRows(comparisonDimensions, derived, records, entities, 'propulsion', language);
}

function eeRows(
  architectures: Architecture[],
  modeIds: EeArchitecture[],
  entities: Map<string, Entity>,
  language: Language,
): ComparisonRow[] {
  const records = new Map(modeIds.map((mode) => [mode, architectures.filter((item) => item.eeArchitecture === mode)]));
  const derived = new Map<ArchitectureComparisonDimension, (items: Architecture[]) => { value: string; ids: string[] }>([
    ['controllerOrganization', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => item.ecuIds)));
      return { value: names(ids, entities, language), ids };
    }],
    ['mainControlUnits', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => item.ecuIds)));
      return { value: names(ids, entities, language), ids };
    }],
    ['functionalAllocation', (items) => {
      const controllerIds = new Set(items.flatMap((item) => item.ecuIds));
      const links = Array.from(controllerIds).flatMap((id) => {
        const controller = entities.get(id);
        return (controller?.relations ?? []).filter((relation) => relation.type === 'controls').map((relation) => relation.targetId);
      });
      const ids = Array.from(new Set(links));
      return { value: names(ids, entities, language), ids };
    }],
    ['communicationBackbone', (items) => {
      const ids = Array.from(new Set(items.flatMap((item) => relatedCategories(systemsFor(item, entities), entities, ['network']))));
      return { value: names(ids, entities, language), ids };
    }],
  ]);
  return addRows(comparisonDimensions, derived, records, entities, 'ee', language);
}

export function propulsionOptions(data: AppData): Array<{ id: Propulsion; architecture: Architecture }> {
  const options = new Map<Propulsion, Architecture>();
  for (const architecture of data.architectures) {
    if (!options.has(architecture.propulsion) || architecture.reviewStatus === 'Approved') {
      options.set(architecture.propulsion, architecture);
    }
  }
  return Array.from(options, ([id, architecture]) => ({ id, architecture }));
}

export function buildComparisonRows(
  data: AppData,
  mode: ComparisonMode,
  selectedIds: string[],
  language: Language,
): ComparisonRow[] {
  const entityById = new Map(data.entities.map((entity) => [entity.id, entity]));
  if (mode === 'propulsion') {
    const selected = selectedIds.map((id) => data.architectures.find((architecture) =>
      architecture.propulsion === id && architecture.reviewStatus === 'Approved')
      ?? data.architectures.find((architecture) => architecture.propulsion === id))
      .filter((architecture): architecture is Architecture => Boolean(architecture));
    return propulsionRows(selected, entityById, language);
  }
  const selectedModes = selectedIds.filter((id): id is EeArchitecture => eeArchitectures.includes(id as EeArchitecture));
  return eeRows(data.architectures, selectedModes, entityById, language);
}

export function availableArchitectureIds(data: AppData, mode: ComparisonMode): string[] {
  return mode === 'propulsion'
    ? propulsionOptions(data).map(({ id }) => id)
    : eeArchitectures;
}

export function comparisonLabel(id: string, mode: ComparisonMode, language: Language): string {
  if (mode === 'propulsion') {
    const labels: Record<Propulsion, { zh: string; en: string }> = {
      ICE: { zh: '内燃机', en: 'ICE' },
      BEV: { zh: '纯电动', en: 'BEV' },
      HEV: { zh: '混合动力', en: 'HEV' },
      PHEV: { zh: '插电式混合动力', en: 'PHEV' },
      EREV: { zh: '增程式电动', en: 'EREV' },
      FCEV: { zh: '燃料电池电动', en: 'FCEV' },
    };
    return labels[id as Propulsion]?.[language] ?? id;
  }
  const labels: Record<EeArchitecture, { zh: string; en: string }> = {
    Distributed: { zh: '分布式', en: 'Distributed' },
    Domain: { zh: '域集中式', en: 'Domain' },
    Zonal: { zh: '区域式', en: 'Zonal' },
    Centralized: { zh: '中央计算', en: 'Centralized Computing' },
  };
  return labels[id as EeArchitecture]?.[language] ?? id;
}

export function comparisonEntityIds(data: AppData, mode: ComparisonMode, selectedId: string): string[] {
  if (mode === 'propulsion') {
    const architecture = data.architectures.find((item) => item.propulsion === selectedId && item.reviewStatus === 'Approved')
      ?? data.architectures.find((item) => item.propulsion === selectedId);
    return architecture ? [...architecture.systemIds, ...architecture.ecuIds] : [];
  }
  return Array.from(new Set(data.architectures.filter((item) => item.eeArchitecture === selectedId)
    .flatMap((item) => [...item.systemIds, ...item.ecuIds])));
}

export function comparisonArchitecture(data: AppData, mode: ComparisonMode, selectedId: string): Architecture | undefined {
  return mode === 'propulsion'
    ? data.architectures.find((item) => item.propulsion === selectedId && item.reviewStatus === 'Approved')
      ?? data.architectures.find((item) => item.propulsion === selectedId)
    : data.architectures.find((item) => item.eeArchitecture === selectedId && item.reviewStatus === 'Approved')
      ?? data.architectures.find((item) => item.eeArchitecture === selectedId);
}
