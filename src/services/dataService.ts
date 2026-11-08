import { initialData } from '../data/initialData';
import type { AppData, ChangeRecord, Entity, EntityRelation, EvidenceSource, LearningData, Propulsion, RelationType, ReviewStatus, VerificationStatus } from '../types';

const DATA_KEY = 'automotive-map:data:v1';
const HISTORY_KEY = 'automotive-map:history:v1';
const LEARNING_KEY = 'automotive-map:learning:v1';
const propulsions: Propulsion[] = ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'];
const reviewStatuses: ReviewStatus[] = ['Draft', 'Pending Review', 'Approved', 'Rejected'];
const categories = ['system', 'ecu', 'sensor', 'actuator', 'hardware', 'network', 'technology', 'standard', 'company'];
const relationTypes: RelationType[] = ['related_to', 'contains', 'part_of', 'controls', 'monitors', 'communicates_with', 'connected_to', 'powered_by', 'distributes_power_to', 'depends_on', 'implements', 'uses', 'integrates'];
const verificationStatuses: VerificationStatus[] = ['Unverified', 'Pending Verification', 'Verified'];

function isHttpUrl(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

function isEntity(value: unknown): value is Entity {
  if (!value || typeof value !== 'object') return false;
  const item = value as Partial<Entity>;
  return typeof item.id === 'string' && categories.includes(item.category ?? '')
    && typeof item.name?.zh === 'string' && typeof item.name?.en === 'string'
    && typeof item.description?.zh === 'string' && typeof item.description?.en === 'string'
    && Array.isArray(item.relatesTo) && item.relatesTo.every((id) => typeof id === 'string')
    && reviewStatuses.includes(item.reviewStatus as ReviewStatus)
    && ['High', 'Medium', 'Low', 'Unverified'].includes(item.confidence ?? '')
    && ['Human', 'Agent'].includes(item.createdBy ?? '')
    && typeof item.createdAt === 'string'
    && typeof item.updatedAt === 'string'
    && (item.relations === undefined || Array.isArray(item.relations) && item.relations.every(isRelation))
    && (item.sources === undefined || Array.isArray(item.sources) && item.sources.every(isEvidenceSource))
    && (item.verificationStatus === undefined || verificationStatuses.includes(item.verificationStatus))
    && (item.appliesTo === undefined || Array.isArray(item.appliesTo) && item.appliesTo.every((id) => propulsions.includes(id)))
    && (item.sourceUrl === undefined || item.sourceUrl === '' || typeof item.sourceUrl === 'string' && isHttpUrl(item.sourceUrl))
    && (item.sourceTitle === undefined || typeof item.sourceTitle === 'string')
    && (item.sourceType === undefined || typeof item.sourceType === 'string')
    && (item.retrievedAt === undefined || typeof item.retrievedAt === 'string')
    && (item.verifiedAt === undefined || typeof item.verifiedAt === 'string');
}

function isLocalizedText(value: unknown): value is { zh: string; en: string } {
  return Boolean(value && typeof value === 'object'
    && typeof (value as { zh?: unknown }).zh === 'string'
    && typeof (value as { en?: unknown }).en === 'string');
}

function isRelation(value: unknown): value is EntityRelation {
  if (!value || typeof value !== 'object') return false;
  const relation = value as Partial<EntityRelation>;
  return typeof relation.targetId === 'string'
    && relationTypes.includes(relation.type as RelationType)
    && isLocalizedText(relation.description);
}

function isEvidenceSource(value: unknown): value is EvidenceSource {
  if (!value || typeof value !== 'object') return false;
  const source = value as Partial<EvidenceSource>;
  return typeof source.id === 'string' && isLocalizedText(source.title)
    && typeof source.type === 'string' && source.type.trim().length > 0
    && Boolean(source.title.zh.trim() || source.title.en.trim())
    && (source.url === undefined || source.url === '' || typeof source.url === 'string' && isHttpUrl(source.url))
    && (source.publisher === undefined || typeof source.publisher === 'string')
    && (source.accessedAt === undefined || typeof source.accessedAt === 'string' && Number.isFinite(Date.parse(source.accessedAt)))
    && (source.note === undefined || isLocalizedText(source.note));
}

function migrateEntity(value: unknown): Entity {
  if (!value || typeof value !== 'object') throw new Error('Entity must be an object.');
  const entity = value as Partial<Entity>;
  if (!Array.isArray(entity.relatesTo)) throw new Error('Entity is missing its related entity list.');
  const relations = Array.isArray(entity.relations) ? entity.relations : entity.relatesTo.map((targetId) => ({
    targetId,
    type: 'related_to' as const,
    description: { zh: '旧版关联数据未记录关系语义。', en: 'Legacy relationship; semantics were not recorded.' },
  }));
  const legacySource = entity.sourceUrl ? [{
    id: `legacy-source-${entity.id ?? 'unknown'}`,
    title: { zh: entity.sourceTitle || entity.sourceUrl, en: entity.sourceTitle || entity.sourceUrl },
    url: entity.sourceUrl,
    type: entity.sourceType || 'Legacy source',
    accessedAt: typeof entity.retrievedAt === 'string' && Number.isFinite(Date.parse(entity.retrievedAt)) ? entity.retrievedAt : undefined,
  }] : [];
  const createdBy = entity.createdBy === 'Agent' ? 'Agent' : 'Human';
  return {
    ...entity,
    createdBy,
    createdAt: typeof entity.createdAt === 'string' ? entity.createdAt : new Date(0).toISOString(),
    updatedAt: typeof entity.updatedAt === 'string' ? entity.updatedAt : (typeof entity.createdAt === 'string' ? entity.createdAt : new Date(0).toISOString()),
    reviewStatus: createdBy === 'Agent' && entity.reviewStatus === 'Approved'
      ? 'Pending Review'
      : (reviewStatuses.includes(entity.reviewStatus as ReviewStatus) ? entity.reviewStatus as ReviewStatus : 'Draft'),
    confidence: ['High', 'Medium', 'Low', 'Unverified'].includes(entity.confidence ?? '') ? entity.confidence! : 'Unverified',
    relations,
    relatesTo: Array.from(new Set([...(entity.relatesTo ?? []), ...relations.map((relation) => relation.targetId)])),
    sources: Array.isArray(entity.sources) && (entity.sources.length > 0 || legacySource.length === 0) ? entity.sources : legacySource,
    verificationStatus: verificationStatuses.includes(entity.verificationStatus as VerificationStatus)
      ? entity.verificationStatus
      : 'Unverified',
  } as Entity;
}

function migrateArchitecture(value: unknown): AppData['architectures'][number] {
  if (!value || typeof value !== 'object') throw new Error('Architecture must be an object.');
  const architecture = value as Partial<AppData['architectures'][number]>;
  const createdBy = architecture.createdBy === 'Agent' ? 'Agent' : 'Human';
  const legacySource = architecture.sourceUrl ? [{
    id: `legacy-source-${architecture.id ?? 'unknown'}`,
    title: { zh: architecture.sourceTitle || architecture.sourceUrl, en: architecture.sourceTitle || architecture.sourceUrl },
    url: architecture.sourceUrl, type: 'Legacy source',
  }] : [];
  return {
    ...architecture,
    createdBy,
    createdAt: typeof architecture.createdAt === 'string' ? architecture.createdAt : new Date(0).toISOString(),
    updatedAt: typeof architecture.updatedAt === 'string' ? architecture.updatedAt : (typeof architecture.createdAt === 'string' ? architecture.createdAt : new Date(0).toISOString()),
    reviewStatus: createdBy === 'Agent' && architecture.reviewStatus === 'Approved'
      ? 'Pending Review'
      : (reviewStatuses.includes(architecture.reviewStatus as ReviewStatus) ? architecture.reviewStatus as ReviewStatus : 'Draft'),
    confidence: ['High', 'Medium', 'Low', 'Unverified'].includes(architecture.confidence ?? '') ? architecture.confidence! : 'Unverified',
    sources: Array.isArray(architecture.sources) && (architecture.sources.length > 0 || legacySource.length === 0) ? architecture.sources : legacySource,
    verificationStatus: verificationStatuses.includes(architecture.verificationStatus as VerificationStatus)
      ? architecture.verificationStatus
      : 'Unverified',
  } as AppData['architectures'][number];
}

export function readData(): { data: AppData; warning?: string } {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (!raw) return { data: initialData };
    const parsed: unknown = JSON.parse(raw);
    const data = validateImport(parsed);
    if ((parsed as { version?: number }).version !== data.version) {
      try {
        saveData(data);
      } catch (error) {
        return { data, warning: `Local data was migrated in memory but could not be saved: ${error instanceof Error ? error.message : String(error)}` };
      }
    }
    return { data };
  } catch (error) {
    return { data: initialData, warning: `Local data could not be loaded: ${error instanceof Error ? error.message : String(error)}` };
  }
}

export function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

export function readHistory(): ChangeRecord[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed as ChangeRecord[] : [];
  } catch (error) {
    throw new Error(`Change history could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function recordChange(record: ChangeRecord): void {
  const history = readHistory();
  localStorage.setItem(HISTORY_KEY, JSON.stringify([record, ...history].slice(0, 500)));
}

export function readLearning(): LearningData {
  try {
    const raw = localStorage.getItem(LEARNING_KEY);
    if (!raw) return { favorites: [], notes: {} };
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== 'object') return { favorites: [], notes: {} };
    const value = parsed as Partial<LearningData>;
    return {
      favorites: Array.isArray(value.favorites) ? value.favorites.filter((id): id is string => typeof id === 'string') : [],
      notes: value.notes && typeof value.notes === 'object'
        ? Object.fromEntries(Object.entries(value.notes).filter((entry): entry is [string, string] => typeof entry[1] === 'string'))
        : {},
    };
  } catch (error) {
    throw new Error(`Learning data could not be loaded: ${error instanceof Error ? error.message : String(error)}`);
  }
}

export function saveLearning(data: LearningData): void {
  localStorage.setItem(LEARNING_KEY, JSON.stringify(data));
}

export function validateImport(value: unknown): AppData {
  if (!value || typeof value !== 'object') throw new Error('JSON root must be an object.');
  const input = value as { version?: unknown; entities?: unknown; architectures?: unknown };
  if (![1, 2].includes(input.version as number) || !Array.isArray(input.entities) || !Array.isArray(input.architectures)) {
    throw new Error('Expected an export with version 1 or 2, entities, and architectures.');
  }
  const data = { version: 2 as const, entities: input.entities.map(migrateEntity), architectures: input.architectures.map(migrateArchitecture) };
  if (!data.entities.every(isEntity)) throw new Error('One or more entities have invalid required fields.');
  const ids = data.entities.map((entity) => entity.id);
  if (new Set(ids).size !== ids.length) throw new Error('Import contains duplicate entity IDs.');
  if (ids.some((id) => !/^[a-z0-9][a-z0-9-]*$/.test(id))) throw new Error('Entity IDs must use lowercase letters, numbers, and hyphens.');
  const known = new Set(ids);
  for (const entity of data.entities) {
    if (entity.relatesTo.includes(entity.id)) throw new Error(`Entity "${entity.id}" cannot reference itself.`);
    if (new Set(entity.relatesTo).size !== entity.relatesTo.length) throw new Error(`Entity "${entity.id}" contains duplicate relationships.`);
    for (const relatedId of entity.relatesTo) {
      if (!known.has(relatedId)) throw new Error(`Entity "${entity.id}" references missing entity "${relatedId}".`);
    }
    for (const relation of entity.relations ?? []) {
      if (relation.targetId === entity.id) throw new Error(`Entity "${entity.id}" cannot reference itself.`);
      if (!known.has(relation.targetId)) throw new Error(`Entity "${entity.id}" references missing entity "${relation.targetId}".`);
    }
    if (entity.createdBy === 'Agent' && entity.reviewStatus === 'Approved') {
      throw new Error(`Agent-created entity "${entity.id}" cannot be marked approved.`);
    }
    if (new Set((entity.sources ?? []).map((source) => source.id)).size !== (entity.sources ?? []).length) {
      throw new Error(`Entity "${entity.id}" contains duplicate evidence source IDs.`);
    }
  }
  const architectures = data.architectures;
  const architectureIds = architectures.map((architecture) => architecture?.id);
  if (architectureIds.some((id) => typeof id !== 'string' || !id.trim()) || new Set(architectureIds).size !== architectureIds.length) {
    throw new Error('Import contains missing or duplicate architecture IDs.');
  }
  for (const architecture of architectures) {
    if (!architecture || !propulsions.includes(architecture.propulsion)
      || typeof architecture.name?.zh !== 'string' || typeof architecture.name?.en !== 'string'
      || typeof architecture.topology?.zh !== 'string' || typeof architecture.topology?.en !== 'string'
      || !['Distributed', 'Domain', 'Zonal', 'Centralized'].includes(architecture.eeArchitecture)
      || !Array.isArray(architecture.systemIds) || !Array.isArray(architecture.ecuIds)
      || !reviewStatuses.includes(architecture.reviewStatus)
      || !['High', 'Medium', 'Low', 'Unverified'].includes(architecture.confidence)
      || !['Human', 'Agent'].includes(architecture.createdBy)
      || typeof architecture.createdAt !== 'string'
      || typeof architecture.updatedAt !== 'string'
      || (architecture.createdBy === 'Agent' && architecture.reviewStatus === 'Approved')
      || (architecture.sources !== undefined && (!Array.isArray(architecture.sources) || !architecture.sources.every(isEvidenceSource)))
      || (architecture.verificationStatus !== undefined && !verificationStatuses.includes(architecture.verificationStatus))
      || (architecture.sourceUrl !== undefined && architecture.sourceUrl !== '' && (typeof architecture.sourceUrl !== 'string' || !isHttpUrl(architecture.sourceUrl)))
      || (architecture.sourceTitle !== undefined && typeof architecture.sourceTitle !== 'string')) {
      throw new Error('One or more vehicle architectures have invalid entity lists.');
    }
    if (new Set((architecture.sources ?? []).map((source) => source.id)).size !== (architecture.sources ?? []).length) {
      throw new Error(`Architecture "${architecture.id}" contains duplicate evidence source IDs.`);
    }
    if (!/^[a-z0-9][a-z0-9-]*$/.test(architecture.id)) throw new Error(`Architecture "${architecture.id}" has an invalid ID.`);
    if (new Set(architecture.systemIds).size !== architecture.systemIds.length || new Set(architecture.ecuIds).size !== architecture.ecuIds.length) {
      throw new Error(`Architecture "${architecture.id}" contains duplicate entity references.`);
    }
    for (const id of architecture.systemIds) {
      if (!known.has(id)) throw new Error(`Architecture "${architecture.id}" references missing entity "${id}".`);
      const entity = data.entities.find((item) => item.id === id);
      if (entity?.category !== 'system') throw new Error(`Architecture "${architecture.id}" has a non-system in its system list: "${id}".`);
      if (entity.appliesTo && !entity.appliesTo.includes(architecture.propulsion)) throw new Error(`System "${id}" is incompatible with architecture "${architecture.id}".`);
    }
    for (const id of architecture.ecuIds) {
      if (!known.has(id)) throw new Error(`Architecture "${architecture.id}" references missing entity "${id}".`);
      const entity = data.entities.find((item) => item.id === id);
      if (entity?.category !== 'ecu') throw new Error(`Architecture "${architecture.id}" has a non-ECU in its ECU list: "${id}".`);
      if (entity.appliesTo && !entity.appliesTo.includes(architecture.propulsion)) throw new Error(`ECU "${id}" is incompatible with architecture "${architecture.id}".`);
    }
  }
  for (const propulsion of propulsions) {
    if (!architectures.some((architecture) => architecture.propulsion === propulsion && architecture.reviewStatus === 'Approved')) {
      throw new Error(`At least one approved architecture is required for ${propulsion}.`);
    }
  }
  return data as AppData;
}
