import type { Entity, Language, TechnologyDomain } from '../types';

export const technologyDomains: Array<{ id: TechnologyDomain; label: { zh: string; en: string } }> = [
  { id: 'vehicle-communication', label: { zh: '车载通信', en: 'Vehicle Communication' } },
  { id: 'automotive-ethernet', label: { zh: '汽车以太网技术', en: 'Automotive Ethernet Technologies' } },
  { id: 'automotive-diagnostics', label: { zh: '汽车诊断', en: 'Automotive Diagnostics' } },
  { id: 'automotive-software-architecture', label: { zh: '汽车软件架构', en: 'Automotive Software Architecture' } },
  { id: 'software-defined-vehicle', label: { zh: '软件定义汽车', en: 'Software Defined Vehicle' } },
];

export function filterTechnologyEntities(
  entities: Entity[],
  query: string,
  domain: TechnologyDomain | 'all',
  language: Language,
): Entity[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return entities.filter((entity) => {
    if (entity.category !== 'technology' || entity.reviewStatus === 'Rejected') return false;
    if (domain !== 'all' && entity.technologyDetails?.domain !== domain) return false;
    if (!normalizedQuery) return true;
    const details = entity.technologyDetails;
    const text = [
      entity.id, entity.name.zh, entity.name.en, entity.description.zh, entity.description.en,
      details?.subdomain?.zh, details?.subdomain?.en, details?.layer?.zh, details?.layer?.en,
    ].filter(Boolean).join(' ').toLocaleLowerCase();
    return text.includes(normalizedQuery) || entity.name[language].toLocaleLowerCase().includes(normalizedQuery);
  });
}

export interface TechnologyRelationLink {
  entity: Entity;
  type: string;
  description: { zh: string; en: string };
  direction: 'outgoing' | 'incoming';
}

export function getTechnologyRelationLinks(entity: Entity, entities: Entity[]): TechnologyRelationLink[] {
  const links: TechnologyRelationLink[] = [];
  for (const related of entities) {
    const outgoing = (entity.relations ?? []).filter((relation) => relation.targetId === related.id);
    if (outgoing.length) {
      for (const relation of outgoing) links.push({ entity: related, type: relation.type, description: relation.description, direction: 'outgoing' });
    } else if (entity.relatesTo.includes(related.id)) {
      links.push({ entity: related, type: 'related_to', description: { zh: '', en: '' }, direction: 'outgoing' });
    }
    const incoming = (related.relations ?? []).filter((relation) => relation.targetId === entity.id);
    if (incoming.length) {
      for (const relation of incoming) links.push({ entity: related, type: relation.type, description: relation.description, direction: 'incoming' });
    } else if (related.relatesTo.includes(entity.id) && !outgoing.length) {
      links.push({ entity: related, type: 'related_to', description: { zh: '', en: '' }, direction: 'incoming' });
    }
  }
  return links;
}

