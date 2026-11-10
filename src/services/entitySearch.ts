import type { AppData, Entity, EntityCategory, Propulsion } from '../types';

export interface EntitySearchFilters {
  category?: EntityCategory | 'all';
  propulsion?: Propulsion | '';
  eeArchitecture?: AppData['architectures'][number]['eeArchitecture'] | '';
}

export function searchEntities(data: AppData, query: string, filters: EntitySearchFilters = {}): Entity[] {
  const normalizedQuery = query.trim().toLocaleLowerCase();
  return data.entities.filter((entity) => {
    const text = `${entity.name.en} ${entity.name.zh} ${entity.id} ${entity.description.en} ${entity.description.zh}`;
    if (normalizedQuery && !text.toLocaleLowerCase().includes(normalizedQuery)) return false;
    if (filters.category && filters.category !== 'all' && entity.category !== filters.category) return false;
    if (filters.propulsion && !data.architectures.some((architecture) => architecture.propulsion === filters.propulsion
      && (architecture.systemIds.includes(entity.id) || architecture.ecuIds.includes(entity.id)))) return false;
    if (filters.eeArchitecture && !data.architectures.some((architecture) => architecture.eeArchitecture === filters.eeArchitecture
      && (architecture.systemIds.includes(entity.id) || architecture.ecuIds.includes(entity.id)))) return false;
    return true;
  }).slice(0, 7);
}
