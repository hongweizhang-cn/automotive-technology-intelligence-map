import { useEffect, useMemo, useState } from 'react';
import {
  Background, Controls, ReactFlow, ReactFlowProvider,
  type Edge, type Node, type NodeProps, Handle, MarkerType, Position, useReactFlow,
} from '@xyflow/react';
import { BatteryCharging, Cpu, Network, Radio, Settings2, ShieldCheck, Thermometer, Zap } from 'lucide-react';
import type { Architecture, Entity, Language, RelationType } from '../types';
import { appendExplorationStep, collapseExplorationStep, getDirectRelatedEntityIds, getNodeHighlight, isRelationVisible } from '../services/graphInteractions';

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
      <Icon size={16} />
      <span>{entity.name[language] || entity.name.en}</span>
      <small>{entity.category.toUpperCase()}</small>
      <Handle id="source-bottom" type="source" position={Position.Bottom} />
      <Handle id="source-right" type="source" position={Position.Right} />
    </div>
  );
}

const nodeTypes = { entity: MapNode };

interface Props {
  architecture: Architecture;
  entities: Entity[];
  language: Language;
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
  architecture, entities, language, selectedSystem, selectedEcu, selectedId,
  visibleCategories, visibleRelationTypes, onSelect, onSystem, onEcu, onEdge,
  selectedRelationKey, search, resetSignal,
}: Props) {
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const { fitView } = useReactFlow();
  useEffect(() => setExpandedIds([]), [architecture.id, architecture.eeArchitecture, selectedSystem, selectedEcu, resetSignal]);
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
      candidates = architecture.systemIds.map((id) => entityById.get(id)).filter((item): item is Entity => Boolean(item));
      candidates.push(...architecture.ecuIds.map((id) => entityById.get(id)).filter((item): item is Entity => Boolean(item)));
      candidates.push(...['net-canfd', 'net-lin', 'net-ethernet'].map((id) => entityById.get(id)).filter((item): item is Entity => Boolean(item)));
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
    const selectedNeighbors = new Set(selectedId ? getDirectRelatedEntityIds(selectedId, entities) : []);
    const baseNodes = results.filter((entity) => baseIds.has(entity.id));
    const expansionStartY = Math.max(620, ...baseNodes.map((entity) => {
      const index = baseNodes.indexOf(entity);
      return 55 + Math.floor(index / 4) * 112;
    })) + 120;
    const nodes: Node<{ entity: Entity; language: Language; selected: boolean; adjacent: boolean; dimmed: boolean; path: boolean }>[] = results.map((entity, index) => {
      let x = 70 + (index % 4) * 205;
      let y = 55 + Math.floor(index / 4) * 112;
      if (!baseIds.has(entity.id)) {
        const expandedIndex = [...expandedEntities.keys()].indexOf(entity.id);
        x = 70 + (expandedIndex % 4) * 205;
        y = expansionStartY + Math.floor(expandedIndex / 4) * 112;
      } else if (relationshipRoot) {
        const isRoot = entity.id === relationshipRoot;
        x = isRoot ? 66 : 300 + ((index - 1) % 3) * 205;
        y = isRoot ? 160 : 62 + Math.floor((index - 1) / 3) * 112;
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
        id: entity.id, type: 'entity', position: { x, y },
        data: { entity, language, ...getNodeHighlight(entity.id, selectedId, selectedNeighbors, expandedIds) },
      };
    });
    const resultIds = new Set(results.map((entity) => entity.id));
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
        const label = relationLabels[link.type]?.[language === 'zh' ? 0 : 1]
          ?? (link.type === 'related_to' ? undefined : link.type);
        const highlighted = selectedId === source.id || selectedId === link.targetId;
        const selectedEdge = selectedRelationKey === edgeId;
        const pathEdge = expandedIds.includes(source.id) && expandedIds.includes(link.targetId);
        edges.push({
          id: edgeId, source: source.id, target: link.targetId, type: 'smoothstep',
          sourceHandle: (edges.length % 2) ? 'source-right' : 'source-bottom',
          targetHandle: (edges.length % 2) ? 'target-left' : 'target-top',
          data: { sourceId: source.id, targetId: link.targetId, relationType: link.type, description: link.description },
          label, markerEnd: { type: MarkerType.ArrowClosed, color: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7' : '#547083' },
          style: {
            stroke: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7' : pathEdge ? '#52c8ba' : '#365b70',
            strokeWidth: selectedEdge ? 3 : highlighted ? 2.5 : 1.5,
            opacity: selectedId && !highlighted && !pathEdge ? 0.13 : 0.82,
            ...(source.category === 'network' ? { strokeDasharray: '4 3' } : {}),
          },
          labelStyle: { fill: selectedId && !highlighted ? '#607382' : '#a9becb', fontSize: 9 },
          labelBgStyle: { fill: '#111923', fillOpacity: 0.9 },
        });
      }
    }
    return { nodes, edges, expandedEntities };
  }, [architecture, entityById, entities, language, selectedId, selectedSystem, selectedEcu, system, ecu, visibleCategories, visibleRelationTypes, search, expandedIds, selectedRelationKey]);
  useEffect(() => {
    if (expandedIds.length) void fitView({ padding: 0.18, maxZoom: 1, duration: 250 });
  }, [expandedIds, fitView]);

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
    <div className="map-canvas">
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
