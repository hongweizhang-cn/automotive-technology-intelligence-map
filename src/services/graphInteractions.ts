import type { Entity, RelationType } from '../types';

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
