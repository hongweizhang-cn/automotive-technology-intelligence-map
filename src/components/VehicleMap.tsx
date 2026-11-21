import { useEffect, useMemo, useState } from 'react';
import {
  Background, Controls, ReactFlow, ReactFlowProvider,
  type Edge, type Node, type NodeProps, Handle, MarkerType, Position,
  useReactFlow,
} from '@xyflow/react';
import { BatteryCharging, Cpu, Network, Radio, Settings2, ShieldCheck, Thermometer, Zap } from 'lucide-react';
import type { Architecture, Entity, Language, RelationType } from '../types';
import { appendExplorationStep, collapseExplorationStep, getDirectRelatedEntityIds, getDirectRelationshipNeighbors, getNodeHighlight, getRelationshipCategory, isRelationVisible } from '../services/graphInteractions';

export type MapViewMode = 'structure' | 'relationship' | 'full';

const icons = {
  system: Settings2, ecu: Cpu, sensor: Radio, actuator: Zap, hardware: Cpu,
  network: Network, technology: ShieldCheck, standard: ShieldCheck, company: Cpu,
};

function MapNode({ data }: NodeProps<Node<{ entity: Entity; language: Language; selected: boolean; adjacent: boolean; dimmed: boolean; path: boolean }>>) {
  const { entity, language, selected, adjacent, dimmed, path } = data;
  const Icon = entity.id === 'sys-battery' ? BatteryCharging : entity.id === 'sys-thermal' ? Thermometer : icons[entity.category];
  return (
    <div className={`map-node node-${entity.category}${selected ? ' selected' : ''}${adjacent ? ' adjacent' : ''}${dimmed ? ' dimmed' : ''}${path ? ' explored-path' : ''}`}>
      <Handle id="target-top" type="target" position={Position.Top} />
      <Handle id="target-left" type="target" position={Position.Left} />
      <Handle id="target-right" type="target" position={Position.Right} />
      <Handle id="target-bottom" type="target" position={Position.Bottom} />
      <Icon size={16} />
      <span>{entity.name[language] || entity.name.en}</span>
      <small>{entity.category.toUpperCase()}</small>
      <Handle id="source-bottom" type="source" position={Position.Bottom} />
      <Handle id="source-right" type="source" position={Position.Right} />
      <Handle id="source-left" type="source" position={Position.Left} />
      <Handle id="source-top" type="source" position={Position.Top} />
    </div>
  );
}

function MapGroup({ data }: NodeProps<Node<{ label: string; language: Language }>>) {
  return <div className="map-group"><span>{data.label}</span></div>;
}

const nodeTypes = { entity: MapNode, group: MapGroup };

const overviewSystemIds: Record<Architecture['propulsion'], string[]> = {
  ICE: ['sys-engine', 'sys-fuel', 'sys-ignition', 'sys-transmission', 'sys-aftertreatment', 'sys-powertrain', 'sys-thermal', 'sys-chassis'],
  BEV: ['sys-battery', 'sys-electric-drive', 'sys-charging', 'sys-hv-distribution', 'sys-powertrain', 'sys-thermal', 'sys-chassis', 'sys-adas'],
  HEV: ['sys-engine', 'sys-electric-drive', 'sys-battery', 'sys-hybrid-control', 'sys-transmission', 'sys-powertrain', 'sys-thermal', 'sys-chassis'],
  PHEV: ['sys-engine', 'sys-electric-drive', 'sys-battery', 'sys-hybrid-control', 'sys-charging', 'sys-transmission', 'sys-powertrain', 'sys-thermal'],
  EREV: ['sys-range-extender', 'sys-electric-drive', 'sys-battery', 'sys-charging', 'sys-powertrain', 'sys-thermal', 'sys-chassis', 'sys-adas'],
  FCEV: ['sys-fuel-cell', 'sys-hydrogen', 'sys-air-supply', 'sys-electric-drive', 'sys-battery', 'sys-powertrain', 'sys-thermal', 'sys-chassis'],
};

export function getOverviewSystemIds(architecture: Architecture, entities: Entity[]): string[] {
  const byId = new Map(entities.map((entity) => [entity.id, entity]));
  return overviewSystemIds[architecture.propulsion]
    .filter((id) => architecture.systemIds.includes(id))
    .filter((id) => byId.get(id)?.category === 'system')
    .slice(0, 12);
}

export type LayoutPosition = { x: number; y: number };

export function buildDetailedLayoutPositions(
  results: Entity[],
  relationshipRoot: string | null,
  baseIds: Set<string>,
  expandedEntities: Map<string, Entity>,
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  if (!relationshipRoot) return positions;

  const root = results.find((entity) => entity.id === relationshipRoot);
  if (root) positions.set(root.id, { x: 60, y: 230 });

  const categoryColumns: Record<Entity['category'], number> = {
    system: 0,
    ecu: 1,
    hardware: 2,
    network: 5,
    sensor: 3,
    actuator: 4,
    technology: 5,
    standard: 5,
    company: 6,
  };
  const categoryOrders: Entity['category'][] = ['ecu', 'hardware', 'sensor', 'actuator', 'network', 'technology', 'standard', 'company', 'system'];
  const columnRows: Partial<Record<number, number>> = {};

  for (const category of categoryOrders) {
    const entitiesInColumn = results
      .filter((entity) => entity.category === category && entity.id !== relationshipRoot)
      .sort((a, b) => a.id.localeCompare(b.id));
    entitiesInColumn.forEach((entity) => {
      const columnIndex = categoryColumns[category];
      const rowIndex = columnRows[columnIndex] ?? 0;
      if (baseIds.has(entity.id)) {
        positions.set(entity.id, { x: 300 + columnIndex * 230, y: 70 + rowIndex * 118 });
      } else {
        const expandedIndex = [...expandedEntities.keys()].indexOf(entity.id);
        positions.set(entity.id, { x: 300 + columnIndex * 230, y: 70 + (expandedIndex + rowIndex) * 118 });
      }
      columnRows[columnIndex] = rowIndex + 1;
    });
  }
  return positions;
}

export function getEdgeRoutingDecision(source: LayoutPosition, target: LayoutPosition): {
  type: 'straight' | 'smoothstep';
  sourceHandle: string;
  targetHandle: string;
} {
  const dx = target.x - source.x;
  const dy = target.y - source.y;
  const type = Math.abs(dy) < 8 || Math.abs(dx) < 8 ? 'straight' : 'smoothstep';
  if (Math.abs(dy) >= Math.abs(dx)) {
    return {
      type,
      sourceHandle: dy >= 0 ? 'source-bottom' : 'source-top',
      targetHandle: dy >= 0 ? 'target-top' : 'target-bottom',
    };
  }
  return {
    type,
    sourceHandle: dx >= 0 ? 'source-right' : 'source-left',
    targetHandle: dx >= 0 ? 'target-left' : 'target-right',
  };
}

interface Props {
  architecture: Architecture;
  entities: Entity[];
  language: Language;
  viewMode: MapViewMode;
  selectedSystem: string | null;
  selectedEcu: string | null;
  selectedId: string | null;
  visibleCategories: string[];
  visibleRelationTypes: RelationType[];
  onSelect: (entityId: string) => void;
  onSystem: (entityId: string | null) => void;
  onEcu: (entityId: string | null) => void;
  onEdge: (sourceId: string, targetId: string, type: RelationType) => void;
  selectedRelationKey: string | null;
  search: string;
  resetSignal: number;
}

function VehicleMapCanvas({
  architecture, entities, language, viewMode, selectedSystem, selectedEcu, selectedId,
  visibleCategories, visibleRelationTypes, onSelect, onSystem, onEcu, onEdge,
  selectedRelationKey, search, resetSignal,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const [elkPositions, setElkPositions] = useState<Record<string, LayoutPosition>>({});
  const { fitView } = useReactFlow();
  useEffect(() => setExpandedIds([]), [architecture.id, architecture.eeArchitecture, selectedSystem, selectedEcu, resetSignal]);
  useEffect(() => {
    const timer = window.setTimeout(() => {
      void fitView({ padding: 0.16, maxZoom: 1, duration: 220 });
    }, 120);
    return () => window.clearTimeout(timer);
  }, [architecture.id, architecture.eeArchitecture, selectedSystem, selectedEcu, resetSignal, fitView]);
  const entityById = useMemo(() => new Map(entities.map((entity) => [entity.id, entity])), [entities]);
  const system = selectedSystem ? entityById.get(selectedSystem) : undefined;
  const ecu = selectedEcu ? entityById.get(selectedEcu) : undefined;
  const graph = useMemo(() => {
    let candidates: Entity[];
    let relationshipRoot: string | null = null;
    if (ecu) {
      const reverseRelatedIds = entities.filter((entity) => entity.relatesTo.includes(ecu.id) || entity.relations?.some((relation) => relation.targetId === ecu.id)).map((entity) => entity.id);
      candidates = [
        ecu,
        ...[...new Set([...ecu.relatesTo, ...reverseRelatedIds])].map((id) => entityById.get(id)).filter((item): item is Entity => Boolean(item))
          .filter((item) => item.category !== 'system' || architecture.systemIds.includes(item.id))
          .filter((item) => item.category !== 'ecu' || architecture.ecuIds.includes(item.id)),
      ];
      relationshipRoot = ecu.id;
    } else if (system) {
      const relatedIds = new Set([
        ...system.relatesTo,
        ...(system.relations ?? []).map((relation) => relation.targetId),
        ...entities.filter((entity) => entity.relatesTo.includes(system.id) || entity.relations?.some((relation) => relation.targetId === system.id)).map((entity) => entity.id),
      ]);
      candidates = [system, ...[...relatedIds].map((id) => entityById.get(id)).filter((item): item is Entity => Boolean(item))
        .filter((item) => item.category !== 'system' || architecture.systemIds.includes(item.id))
        .filter((item) => item.category !== 'ecu' || architecture.ecuIds.includes(item.id))];
      relationshipRoot = system.id;
    } else {
      candidates = getOverviewSystemIds(architecture, entities)
        .map((id) => entityById.get(id))
        .filter((item): item is Entity => Boolean(item));
    }

    const baseIds = new Set(candidates.map((entity) => entity.id));
    const expandedEntities = new Map<string, Entity>();
    for (const expandedId of expandedIds) {
      for (const id of getDirectRelatedEntityIds(expandedId, entities)) {
        const linked = entityById.get(id);
        if (linked && !baseIds.has(id)) expandedEntities.set(id, linked);
      }
    }
    candidates = [...candidates, ...expandedEntities.values()];
    const filtered = candidates.filter((entity) => visibleCategories.includes(entity.category));
    const query = search.trim().toLocaleLowerCase();
    const results = query ? filtered.filter((entity) => `${entity.name.en} ${entity.name.zh} ${entity.description.en}`.toLocaleLowerCase().includes(query)) : filtered;
    const systems = results.filter((entity) => entity.category === 'system');
    const ecus = results.filter((entity) => entity.category === 'ecu');
    const selectedNeighbors = new Set(selectedId ? getDirectRelationshipNeighbors(selectedId, entities, visibleRelationTypes) : []);
    const detailedPositions = relationshipRoot
      ? buildDetailedLayoutPositions(results, relationshipRoot, baseIds, expandedEntities)
      : null;
    const nodes: Node<any>[] = results.map((entity, index) => {
      let x = 70 + (index % 4) * 205;
      let y = 55 + Math.floor(index / 4) * 112;
      if (detailedPositions?.has(entity.id)) {
        const position = detailedPositions.get(entity.id)!;
        x = position.x;
        y = position.y;
      } else if (!selectedSystem && !selectedEcu) {
        const columns = 4;
        x = 95 + (index % columns) * 205;
        y = 95 + Math.floor(index / columns) * 145;
      } else if (architecture.eeArchitecture === 'Distributed' && entity.category === 'ecu') {
        const ecuIndex = ecus.findIndex((item) => item.id === entity.id);
        const parentIndex = systems.findIndex((item) => entity.relatesTo.includes(item.id) || item.relatesTo.includes(entity.id));
        x = parentIndex < 0 ? 80 + (ecuIndex % 4) * 205 : 80 + (parentIndex % 4) * 205;
        y = 400 + Math.floor(ecuIndex / 4) * 112;
      } else if (architecture.eeArchitecture === 'Domain' && entity.id.endsWith('-domain')) {
        const domainIndex = ['ecu-powertrain-domain', 'ecu-body-domain', 'ecu-adas-domain', 'ecu-cockpit-domain'].indexOf(entity.id);
        x = 70 + Math.max(domainIndex, 0) * 205;
        y = 390;
      } else if (architecture.eeArchitecture === 'Domain' && entity.category === 'ecu') {
        const linkedSystemIds = new Set([...entity.relatesTo, ...(entity.relations ?? []).map((relation) => relation.targetId)]);
        const domainGroups = [
          ['sys-powertrain', 'sys-engine', 'sys-battery', 'sys-hybrid-control', 'sys-electric-drive', 'sys-fuel-cell'],
          ['sys-body', 'sys-chassis'],
          ['sys-adas'],
          ['sys-ivi'],
        ];
        const domainIndex = domainGroups.findIndex((group) => group.some((systemId) => linkedSystemIds.has(systemId)));
        const groupIndex = domainIndex < 0 ? 4 : domainIndex;
        const groupMembers = ecus.filter((item) => {
          const itemLinks = new Set([...item.relatesTo, ...(item.relations ?? []).map((relation) => relation.targetId)]);
          return domainGroups[groupIndex]?.some((systemId) => itemLinks.has(systemId)) ?? !domainGroups.some((group) => group.some((systemId) => itemLinks.has(systemId)));
        });
        const memberIndex = groupMembers.findIndex((item) => item.id === entity.id);
        x = 70 + groupIndex * 205;
        y = 510 + Math.max(0, memberIndex) * 112;
      } else if (architecture.eeArchitecture === 'Zonal') {
        if (entity.id === 'ecu-zonal-front') { x = 35; y = 80; }
        else if (entity.id === 'ecu-zonal-rear') { x = 35; y = 270; }
        else if (entity.id === 'ecu-zonal') { x = 35; y = 175; }
        else if (entity.category === 'ecu') { const ecuIndex = ecus.findIndex((item) => item.id === entity.id); x = 300 + (ecuIndex % 4) * 205; y = 400 + Math.floor(ecuIndex / 4) * 112; }
      } else if (architecture.eeArchitecture === 'Centralized') {
        if (entity.id === 'ecu-central-compute') { x = 480; y = 25; }
        else if (entity.category === 'ecu') { const ecuIndex = ecus.findIndex((item) => item.id === entity.id); x = 70 + (ecuIndex % 4) * 205; y = 400 + Math.floor(ecuIndex / 4) * 112; }
        else if (entity.category === 'system') { const systemIndex = systems.findIndex((item) => item.id === entity.id); x = 70 + (systemIndex % 4) * 205; y = 190 + Math.floor(systemIndex / 4) * 112; }
      }
      return {
        id: entity.id, type: 'entity', position: elkPositions[entity.id] ?? { x, y },
        data: { entity, language, ...getNodeHighlight(entity.id, selectedId, selectedNeighbors, expandedIds) },
      };
    });
    if (viewMode === 'structure' && relationshipRoot && system) {
      nodes.unshift({
        id: `group:${system.id}`,
        type: 'group',
        position: { x: 260, y: 30 },
        zIndex: -1,
        style: { width: 1120, height: 760 },
        data: { label: system.name[language] || system.name.en, language },
      });
    }
    const resultIds = new Set(results.map((entity) => entity.id));
    const nodePositionById = new Map(nodes.map((node) => [node.id, node.position]));
    const pairEdgeCount = new Map<string, number>();
    const edges: Edge[] = [];
    const relationLabels: Record<string, [string, string]> = {
      contains: ['包含', 'contains'], part_of: ['属于', 'part of'], controls: ['控制', 'controls'], monitors: ['监测', 'monitors'],
      communicates_with: ['通信', 'communicates'], connected_to: ['连接', 'connected'], powered_by: ['由其供电', 'powered by'],
      distributes_power_to: ['配电', 'distributes power'], depends_on: ['依赖', 'depends on'], implements: ['实现', 'implements'],
      uses: ['使用', 'uses'], integrates: ['集成', 'integrates'], transports: ['承载', 'transports'], defines: ['定义', 'defines'],
    };
    const seenEdges = new Set<string>();
    for (const source of results) {
      const explicitTargets = new Set((source.relations ?? []).map((relation) => relation.targetId));
      const links = [
        ...(source.relations ?? []).filter((relation) => resultIds.has(relation.targetId)).map((relation) => ({ targetId: relation.targetId, type: relation.type, description: relation.description })),
        ...source.relatesTo.filter((targetId) => resultIds.has(targetId) && !explicitTargets.has(targetId)).map((targetId) => ({
          targetId, type: 'related_to' as const,
          description: { zh: '旧版关联未记录关系语义。', en: 'Legacy link; relationship semantics were not recorded.' },
        })),
      ];
      for (const link of links) {
        const edgeId = `link:${source.id}:${link.targetId}:${link.type}`;
        if (seenEdges.has(edgeId)) continue;
        seenEdges.add(edgeId);
        if (!isRelationVisible(link.type, visibleRelationTypes)) continue;
        if (viewMode === 'structure' && ['contains', 'part_of'].includes(link.type)) continue;
        if (viewMode === 'relationship' && ![
          'communicates_with', 'controls', 'monitors', 'depends_on',
          'powered_by', 'distributes_power_to', 'connected_to', 'uses',
        ].includes(link.type)) continue;
        if (!selectedSystem && !selectedEcu && link.type === 'related_to') continue;
        if (!selectedSystem && !selectedEcu && ![
          'contains', 'part_of', 'controls', 'monitors', 'communicates_with',
          'connected_to', 'powered_by', 'distributes_power_to', 'integrates', 'transports',
        ].includes(link.type)) continue;
        const label = relationLabels[link.type]?.[language === 'zh' ? 0 : 1]
          ?? (link.type === 'related_to' ? undefined : link.type);
        const highlighted = selectedId === source.id || selectedId === link.targetId;
        const selectedEdge = selectedRelationKey === edgeId;
        const pathEdge = expandedIds.includes(source.id) && expandedIds.includes(link.targetId);
        const relationshipCategory = getRelationshipCategory(link.type);
        const sourcePosition = nodePositionById.get(source.id);
        const targetPosition = nodePositionById.get(link.targetId);
        const pairKey = [source.id, link.targetId].sort().join(':');
        const pairIndex = pairEdgeCount.get(pairKey) ?? 0;
        pairEdgeCount.set(pairKey, pairIndex + 1);
        const routing = getEdgeRoutingDecision(
          sourcePosition ?? { x: 0, y: 0 },
          targetPosition ?? { x: 0, y: 0 },
        );
        let sourceHandle = routing.sourceHandle;
        let targetHandle = routing.targetHandle;
        const dy = (targetPosition?.y ?? 0) - (sourcePosition?.y ?? 0);
        if (pairIndex % 2 === 1) {
          sourceHandle = dy >= 0 ? 'source-right' : 'source-left';
          targetHandle = dy >= 0 ? 'target-left' : 'target-right';
        }
        edges.push({
          id: edgeId, source: source.id, target: link.targetId, type: routing.type,
          sourceHandle,
          targetHandle,
          data: { sourceId: source.id, targetId: link.targetId, relationType: link.type, description: link.description },
          label: hoveredEdgeId === edgeId ? label : undefined,
          markerEnd: { type: MarkerType.ArrowClosed, color: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7' : '#547083' },
          style: {
            stroke: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7'
              : relationshipCategory === 'communication' ? '#62b8d6'
                : relationshipCategory === 'control' ? '#77a5df'
                  : relationshipCategory === 'dependency' ? '#a98bd7'
                    : relationshipCategory === 'power_flow' ? '#d8b45e'
                      : relationshipCategory === 'network' ? '#55c3ad'
                        : pathEdge ? '#52c8ba' : '#365b70',
            strokeWidth: selectedEdge ? 3 : highlighted ? 2.5 : 1.5,
            opacity: selectedId && !highlighted && !pathEdge ? 0.13 : 0.82,
            ...(source.category === 'network' || link.type === 'communicates_with'
              ? { strokeDasharray: '5 4' }
              : link.type === 'depends_on'
                ? { strokeDasharray: '2 4' }
                : {}),
          },
          labelStyle: { fill: selectedId && !highlighted ? '#607382' : '#a9becb', fontSize: 9 },
          labelBgStyle: { fill: '#111923', fillOpacity: 0.9 },
        });
      }
    }
    return { nodes, edges, expandedEntities };
  }, [architecture, entityById, entities, language, viewMode, selectedId, selectedSystem, selectedEcu, system, ecu, visibleCategories, visibleRelationTypes, search, expandedIds, selectedRelationKey, hoveredEdgeId, elkPositions]);
  useEffect(() => {
    let cancelled = false;
    const structuralNodes = graph.nodes.filter((node) => node.type === 'entity');
    if (!structuralNodes.length) return;
    const structuralNodeIds = new Set(structuralNodes.map((node) => node.id));
    const layout = {
      id: 'root',
      layoutOptions: {
        'elk.algorithm': 'layered',
        'elk.direction': 'RIGHT',
        'elk.spacing.nodeNode': '80',
        'elk.layered.spacing.nodeNodeBetweenLayers': '100',
        'elk.edgeRouting': 'ORTHOGONAL',
        'elk.layered.crossingMinimization.strategy': 'LAYER_SWEEP',
        'elk.layered.nodePlacement.strategy': 'BRANDES_KOEPF',
      },
      children: structuralNodes.map((node) => ({
        id: node.id,
        width: 182,
        height: 62,
      })),
      edges: graph.edges
        .filter((edge) => structuralNodeIds.has(edge.source) && structuralNodeIds.has(edge.target))
        .map((edge) => ({
          id: edge.id,
          sources: [edge.source],
          targets: [edge.target],
        })),
    };
    void import('elkjs/lib/elk.bundled.js').then(({ default: ELK }) => {
      const elk = new ELK();
      return elk.layout(layout);
    }).then((result) => {
      if (cancelled) return;
      const next: Record<string, LayoutPosition> = {};
      for (const child of result?.children ?? []) next[child.id] = { x: child.x ?? 0, y: child.y ?? 0 };
      setElkPositions(next);
    }).catch(() => {
      if (!cancelled) setElkPositions({});
    });
    return () => { cancelled = true; };
  }, [architecture.id, architecture.eeArchitecture, viewMode, selectedSystem, selectedEcu, expandedIds.join('|'), resetSignal]);

  const expandSelected = () => {
    if (!selectedId || expandedIds.includes(selectedId)) return;
    setExpandedIds((current) => appendExplorationStep(current, selectedId));
  };
  const selectedDirectCount = selectedId ? getDirectRelatedEntityIds(selectedId, entities).length : 0;

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const entity = entityById.get(node.id);
    if (!entity) return;
    onSelect(entity.id);
    if (entity.category === 'system') {
      onSystem(entity.id);
      onEcu(null);
    } else if (entity.category === 'ecu' && selectedSystem) {
      onEcu(entity.id);
    } else if (entity.category === 'ecu') {
      const parent = entity.relatesTo.find((id) => architecture.systemIds.includes(id))
        ?? entity.relations?.map((relation) => relation.targetId).find((id) => architecture.systemIds.includes(id));
      if (parent) onSystem(parent);
      onEcu(entity.id);
    } else if (entity.category === 'network' && !selectedSystem) {
      onSelect(entity.id);
    }
  };

  return (
    <div className="map-canvas" data-edge-count={graph.edges.length} data-node-count={graph.nodes.length}>
      <svg className="car-outline" viewBox="0 0 760 410" aria-hidden="true">
        <path d="M259 24 Q380 -2 501 24 L556 68 Q586 100 596 149 L624 188 L624 318 Q620 350 590 360 L170 360 Q140 350 136 318 L136 188 L164 149 Q174 100 204 68 Z" />
        <path d="M246 48 Q380 28 514 48 L545 83 L565 145 L195 145 L215 83 Z" />
        <path d="M193 158 L567 158 L582 214 L178 214 Z M174 225 L586 225 L586 312 Q582 332 562 337 L198 337 Q178 332 174 312 Z" />
        <path d="M202 69 L172 86 L154 127 L179 140 M558 69 L588 86 L606 127 L581 140 M158 244 L178 244 M582 244 L602 244 M160 306 L181 306 M579 306 L600 306" />
        <circle cx="185" cy="170" r="13" /><circle cx="575" cy="170" r="13" />
        <circle cx="185" cy="322" r="13" /><circle cx="575" cy="322" r="13" />
      </svg>
      <ReactFlow
        key={`${architecture.id}:${architecture.eeArchitecture}:${selectedSystem ?? ''}:${selectedEcu ?? ''}:${resetSignal}`}
        nodes={graph.nodes}
        edges={graph.edges}
        nodeTypes={nodeTypes}
        onNodeClick={onNodeClick}
        onEdgeClick={(_, edge) => {
          const data = edge.data as { sourceId?: string; targetId?: string; relationType?: RelationType } | undefined;
          if (data?.sourceId && data.targetId && data.relationType) onEdge(data.sourceId, data.targetId, data.relationType);
        }}
        onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
        onEdgeMouseLeave={() => setHoveredEdgeId(null)}
        onPaneClick={() => { onSelect(''); }}
        fitView
        fitViewOptions={{ padding: 0.18, maxZoom: 1 }}
        minZoom={0.3}
        maxZoom={1.7}
        nodesDraggable
        nodesConnectable={false}
        onlyRenderVisibleElements
      >
        <Background color="#253344" gap={22} size={1} />
        <Controls showInteractive={false} />
      </ReactFlow>
      {selectedId && <div className="map-exploration-controls">
        <button className="button-secondary" onClick={() => onSelect('')}>
          {language === 'zh' ? '清除焦点' : 'Clear Focus'}
        </button>
        <button className="button-secondary" disabled={!selectedDirectCount || expandedIds.includes(selectedId)} onClick={expandSelected}>
          {language === 'zh' ? `展开一层关联 (${selectedDirectCount})` : `Expand one level (${selectedDirectCount})`}
        </button>
        <button className="button-secondary" disabled={!expandedIds.length} onClick={() => setExpandedIds(collapseExplorationStep)}>
          {language === 'zh' ? '收起一层' : 'Collapse one level'}
        </button>
        <span>{expandedIds.length ? language === 'zh' ? `探索路径 ${expandedIds.map((id) => entityById.get(id)?.name[language] ?? id).join(' → ')}` : `Exploration path: ${expandedIds.join(' → ')}` : language === 'zh' ? '逐层展开，不自动扩展' : 'Expand manually, one level at a time'}</span>
      </div>}
    </div>
  );
}

export default function VehicleMap(props: Props) {
  return <ReactFlowProvider><VehicleMapCanvas {...props} /></ReactFlowProvider>;
}
