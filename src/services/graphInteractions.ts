import type { Entity, RelationshipCategory, RelationType } from '../types';

export interface RelationshipLink {
  sourceId: string;
  targetId: string;
  type: RelationType;
  description: { zh: string; en: string };
}

export interface NodeHighlight {
  selected: boolean;
  adjacent: boolean;
  dimmed: boolean;
  path: boolean;
}

export function getDirectRelatedEntityIds(entityId: string, entities: Entity[]): string[] {
  const entity = entities.find((item) => item.id === entityId);
  if (!entity) return [];
  return Array.from(new Set([
    ...entity.relatesTo,
    ...(entity.relations ?? []).map((relation) => relation.targetId),
    ...entities.filter((item) => item.relatesTo.includes(entityId)
      || item.relations?.some((relation) => relation.targetId === entityId)).map((item) => item.id),
  ])).filter((id) => id !== entityId);
}

export function getNodeHighlight(entityId: string, selectedId: string | null, neighborIds: Set<string>, pathIds: string[]): NodeHighlight {
  const selected = entityId === selectedId;
  const adjacent = neighborIds.has(entityId);
  return { selected, adjacent, dimmed: Boolean(selectedId && !selected && !adjacent), path: pathIds.includes(entityId) };
}

export function appendExplorationStep(path: string[], entityId: string): string[] {
  return path.includes(entityId) ? path : [...path, entityId];
}

export function collapseExplorationStep(path: string[]): string[] {
  return path.slice(0, -1);
}

export function isRelationVisible(type: RelationType, visibleTypes: RelationType[]): boolean {
  return visibleTypes.includes(type);
}

export function getRelationshipCategory(type: RelationType): RelationshipCategory {
  if (type === 'communicates_with' || type === 'transports') return 'communication';
  if (type === 'controls' || type === 'monitors') return 'control';
  if (type === 'depends_on' || type === 'uses' || type === 'implements') return 'dependency';
  if (type === 'powered_by' || type === 'distributes_power_to') return 'power_flow';
  if (type === 'connected_to') return 'network';
  return 'unclassified';
}

export function getDirectRelationshipNeighbors(entityId: string, entities: Entity[], visibleTypes: RelationType[]): Set<string> {
  const neighbors = new Set<string>();
  for (const entity of entities) {
    for (const relation of entity.relations ?? []) {
      if (!visibleTypes.includes(relation.type)) continue;
      if (entity.id === entityId) neighbors.add(relation.targetId);
      if (relation.targetId === entityId) neighbors.add(entity.id);
    }
  }
  return neighbors;
}
