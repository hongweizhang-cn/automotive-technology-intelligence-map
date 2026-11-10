import type { AppData, Entity, Language } from '../types';

export interface DataQualityIssue {
  key: string;
  entityId: string;
  message: { zh: string; en: string };
}

export interface DataQualityReport {
  totalEntities: number;
  totalRelationships: number;
  pendingReview: number;
  unverifiedSources: number;
  missingInformation: number;
  issues: DataQualityIssue[];
}

const validRelations = new Set([
  'related_to', 'contains', 'part_of', 'controls', 'monitors', 'communicates_with',
  'connected_to', 'powered_by', 'distributes_power_to', 'depends_on', 'implements', 'uses', 'integrates', 'transports', 'defines',
]);

function normalizedName(entity: Entity): string {
  return `${entity.category}|${entity.name.zh.trim().toLocaleLowerCase()}|${entity.name.en.trim().toLocaleLowerCase()}`;
}

export function checkDataQuality(data: AppData): DataQualityReport {
  const issues: DataQualityIssue[] = [];
  const idCounts = new Map<string, number>();
  const nameCounts = new Map<string, number>();
  for (const entity of data.entities) {
    idCounts.set(entity.id, (idCounts.get(entity.id) ?? 0) + 1);
    const key = normalizedName(entity);
    if (entity.name.zh.trim() && entity.name.en.trim()) nameCounts.set(key, (nameCounts.get(key) ?? 0) + 1);
  }
  const knownIds = new Set(data.entities.map((entity) => entity.id));
  let totalRelationships = 0;
  let missingInformation = 0;
  let pendingReview = 0;
  let unverifiedSources = 0;

  const addIssue = (key: string, entityId: string, zh: string, en: string) => {
    issues.push({ key, entityId, message: { zh, en } });
  };

  for (const entity of data.entities) {
    if ((idCounts.get(entity.id) ?? 0) > 1) addIssue('duplicate-id', entity.id, '重复实体 ID', 'Duplicate entity ID');
    if ((nameCounts.get(normalizedName(entity)) ?? 0) > 1) addIssue('duplicate-entity', entity.id, '疑似重复实体名称', 'Potential duplicate entity');
    if (!entity.name.zh.trim() || !entity.name.en.trim()) {
      missingInformation += 1;
      addIssue('missing-name', entity.id, '缺少中英文名称', 'Missing Chinese or English name');
    }
    if (!entity.description.zh.trim() || !entity.description.en.trim()) {
      missingInformation += 1;
      addIssue('missing-description', entity.id, '缺少中英文描述', 'Missing Chinese or English description');
    }
    if (entity.reviewStatus === 'Pending Review') pendingReview += 1;
    if (entity.createdBy === 'Agent' && entity.reviewStatus !== 'Approved' && entity.reviewStatus !== 'Rejected') {
      addIssue('agent-review', entity.id, 'Agent 数据尚未完成人工审核', 'Agent-created data has not completed human review');
    }
    if (!entity.sources?.length || entity.verificationStatus !== 'Verified') {
      unverifiedSources += 1;
      addIssue('unverified-source', entity.id, '来源缺失或尚未核实', 'Source missing or not verified');
    }

    const relations = entity.relations ?? [];
    totalRelationships += relations.length || entity.relatesTo.length;
    for (const targetId of entity.relatesTo) {
      if (!knownIds.has(targetId)) addIssue('missing-target', entity.id, `关系目标不存在：${targetId}`, `Relationship target does not exist: ${targetId}`);
    }
    for (const relation of relations) {
      if (!validRelations.has(relation.type)) addIssue('invalid-relation-type', entity.id, '关系类型无效', 'Invalid relationship type');
      if (!knownIds.has(relation.targetId)) addIssue('missing-target', entity.id, `关系目标不存在：${relation.targetId}`, `Relationship target does not exist: ${relation.targetId}`);
      if (!relation.description.zh.trim() || !relation.description.en.trim()) {
        addIssue('missing-relation-description', entity.id, '关系缺少中英文说明', 'Relationship is missing a Chinese or English description');
      }
    }
  }

  for (const architecture of data.architectures) {
    if (architecture.reviewStatus === 'Pending Review') pendingReview += 1;
    if (architecture.createdBy === 'Agent' && architecture.reviewStatus !== 'Approved' && architecture.reviewStatus !== 'Rejected') {
      addIssue('agent-review', architecture.id, 'Agent 创建的架构尚未完成人工审核', 'Agent-created architecture has not completed human review');
    }
    if (!architecture.sources?.length || architecture.verificationStatus !== 'Verified') {
      unverifiedSources += 1;
      addIssue('unverified-source', architecture.id, '架构来源缺失或尚未核实', 'Architecture source missing or not verified');
    }
    if (!architecture.name.zh.trim() || !architecture.name.en.trim() || !architecture.topology.zh.trim() || !architecture.topology.en.trim()) {
      missingInformation += 1;
      addIssue('missing-architecture-information', architecture.id, '架构名称或拓扑描述不完整', 'Architecture name or topology description is incomplete');
    }
    totalRelationships += architecture.systemIds.length + architecture.ecuIds.length;
    for (const id of [...architecture.systemIds, ...architecture.ecuIds]) {
      if (!knownIds.has(id)) addIssue('missing-target', architecture.id, `架构引用的实体不存在：${id}`, `Architecture references a missing entity: ${id}`);
    }
  }

  return {
    totalEntities: data.entities.length,
    totalRelationships,
    pendingReview,
    unverifiedSources,
    missingInformation,
    issues,
  };
}

export function qualityIssueMessage(issue: DataQualityIssue, language: Language): string {
  return issue.message[language] || issue.message.en;
}
