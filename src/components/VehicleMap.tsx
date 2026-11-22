import { useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Background, Controls, ReactFlow, ReactFlowProvider,
  type Edge, type Node, type NodeProps, Handle, MarkerType, Position,
  useReactFlow,
} from '@xyflow/react';
import { BatteryCharging, Cpu, Info, Network, Radio, Settings2, ShieldCheck, Thermometer, Zap } from 'lucide-react';
import type { Architecture, Entity, Language, RelationType } from '../types';
import {
  appendExplorationStep, collapseExplorationStep, getDirectRelatedEntityIds,
  getDirectRelationshipNeighbors, getExpandableEntityIds, getNodeHighlight,
  getRelationshipCategory, getSystemCompositionStatus, isInternalToSystem, isRelationVisible,
} from '../services/graphInteractions';

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
      {/* Distributed Target handles */}
      <Handle id="target-top" type="target" position={Position.Top} style={{ left: '50%' }} />
      <Handle id="target-top-left" type="target" position={Position.Top} style={{ left: '25%' }} />
      <Handle id="target-top-right" type="target" position={Position.Top} style={{ left: '75%' }} />
      <Handle id="target-bottom" type="target" position={Position.Bottom} style={{ left: '50%' }} />
      <Handle id="target-bottom-left" type="target" position={Position.Bottom} style={{ left: '25%' }} />
      <Handle id="target-bottom-right" type="target" position={Position.Bottom} style={{ left: '75%' }} />
      <Handle id="target-left" type="target" position={Position.Left} style={{ top: '50%' }} />
      <Handle id="target-left-top" type="target" position={Position.Left} style={{ top: '25%' }} />
      <Handle id="target-left-bottom" type="target" position={Position.Left} style={{ top: '75%' }} />
      <Handle id="target-right" type="target" position={Position.Right} style={{ top: '50%' }} />
      <Handle id="target-right-top" type="target" position={Position.Right} style={{ top: '25%' }} />
      <Handle id="target-right-bottom" type="target" position={Position.Right} style={{ top: '75%' }} />

      <Icon size={16} />
      <span>{entity.name[language] || entity.name.en}</span>
      <small>{entity.category.toUpperCase()}</small>

      {/* Distributed Source handles */}
      <Handle id="source-bottom" type="source" position={Position.Bottom} style={{ left: '50%' }} />
      <Handle id="source-bottom-left" type="source" position={Position.Bottom} style={{ left: '25%' }} />
      <Handle id="source-bottom-right" type="source" position={Position.Bottom} style={{ left: '75%' }} />
      <Handle id="source-top" type="source" position={Position.Top} style={{ left: '50%' }} />
      <Handle id="source-top-left" type="source" position={Position.Top} style={{ left: '25%' }} />
      <Handle id="source-top-right" type="source" position={Position.Top} style={{ left: '75%' }} />
      <Handle id="source-right" type="source" position={Position.Right} style={{ top: '50%' }} />
      <Handle id="source-right-top" type="source" position={Position.Right} style={{ top: '25%' }} />
      <Handle id="source-right-bottom" type="source" position={Position.Right} style={{ top: '75%' }} />
      <Handle id="source-left" type="source" position={Position.Left} style={{ top: '50%' }} />
      <Handle id="source-left-top" type="source" position={Position.Left} style={{ top: '25%' }} />
      <Handle id="source-left-bottom" type="source" position={Position.Left} style={{ top: '75%' }} />
    </div>
  );
}

function MapGroup({ data }: NodeProps<Node<{ label: string; count?: number; language: Language; isPartial?: boolean }>>) {
  return (
    <div className="map-group">
      <div className="map-group-header">
        <span className="map-group-badge">{data.language === 'zh' ? '系统边界' : 'SYSTEM BOUNDARY'}</span>
        <span className="map-group-title">{data.label}</span>
        {data.count !== undefined && data.count > 0 && (
          <span className="map-group-count">{data.count} {data.language === 'zh' ? '个内部组件' : 'components'}</span>
        )}
        {data.isPartial && (
          <span className="map-group-partial-badge">{data.language === 'zh' ? '部分组成' : 'Partial'}</span>
        )}
      </div>
    </div>
  );
}

export function buildSystemRelationshipLayout(
  system: Entity,
  relatedEntities: Entity[],
): Map<string, LayoutPosition> {
  const positions = new Map<string, LayoutPosition>();
  const centerX = 420;
  const centerY = 190;

  positions.set(system.id, { x: centerX, y: centerY });

  const leftNodes: Entity[] = [];
  const topNodes: Entity[] = [];
  const rightNodes: Entity[] = [];
  const bottomNodes: Entity[] = [];

  for (const ent of relatedEntities) {
    if (ent.id === system.id) continue;
    if (ent.category === 'sensor') {
      leftNodes.push(ent);
    } else if (ent.category === 'ecu' || ent.category === 'system') {
      topNodes.push(ent);
    } else if (ent.category === 'actuator' || ent.category === 'hardware') {
      rightNodes.push(ent);
    } else if (['network', 'technology', 'standard'].includes(ent.category)) {
      bottomNodes.push(ent);
    } else {
      leftNodes.push(ent);
    }
  }

  // Balance topNodes if it has more than 3 nodes and left or right is empty
  if (topNodes.length > 3 && leftNodes.length === 0) {
    const moved = topNodes.splice(0, Math.ceil(topNodes.length / 3));
    leftNodes.push(...moved);
  }
  if (topNodes.length > 3 && rightNodes.length === 0) {
    const moved = topNodes.splice(Math.floor(topNodes.length / 2));
    rightNodes.push(...moved);
  }

  // Position Left Nodes (column x: 100)
  const leftCount = leftNodes.length;
  if (leftCount > 0) {
    const leftStartY = Math.max(50, centerY - ((leftCount - 1) * 115) / 2);
    leftNodes.forEach((node, idx) => {
      positions.set(node.id, { x: 100, y: leftStartY + idx * 115 });
    });
  }

  // Position Right Nodes (column x: 740)
  const rightCount = rightNodes.length;
  if (rightCount > 0) {
    const rightStartY = Math.max(50, centerY - ((rightCount - 1) * 115) / 2);
    rightNodes.forEach((node, idx) => {
      positions.set(node.id, { x: 740, y: rightStartY + idx * 115 });
    });
  }

  // Position Top Nodes (row / grid above system)
  const topCount = topNodes.length;
  if (topCount > 0) {
    const cols = topCount <= 3 ? topCount : Math.min(topCount, 3);
    const colSpacing = 220;
    const topStartX = centerX - ((cols - 1) * colSpacing) / 2;
    topNodes.forEach((node, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(node.id, {
        x: topStartX + col * colSpacing,
        y: row === 0 ? 55 : -55,
      });
    });
  }

  // Position Bottom Nodes (row / grid below system)
  const bottomCount = bottomNodes.length;
  if (bottomCount > 0) {
    const cols = bottomCount <= 3 ? bottomCount : Math.min(bottomCount, 4);
    const colSpacing = 210;
    const bottomStartX = centerX - ((cols - 1) * colSpacing) / 2;
    bottomNodes.forEach((node, idx) => {
      const col = idx % cols;
      const row = Math.floor(idx / cols);
      positions.set(node.id, {
        x: bottomStartX + col * colSpacing,
        y: centerY + 145 + row * 105,
      });
    });
  }

  return positions;
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

export function allocateDistributedHandles(
  source: LayoutPosition,
  target: LayoutPosition,
  pairIndex: number,
): { sourceHandle: string; targetHandle: string } {
  const dx = target.x - source.x;
  const dy = target.y - source.y;

  if (Math.abs(dx) >= Math.abs(dy)) {
    if (dx >= 0) {
      const sourceHandle = dy > 30 ? 'source-right-bottom' : dy < -30 ? 'source-right-top' : pairIndex % 2 === 1 ? 'source-right-bottom' : 'source-right';
      const targetHandle = dy > 30 ? 'target-left-top' : dy < -30 ? 'target-left-bottom' : pairIndex % 2 === 1 ? 'target-left-top' : 'target-left';
      return { sourceHandle, targetHandle };
    } else {
      const sourceHandle = dy > 30 ? 'source-left-bottom' : dy < -30 ? 'source-left-top' : pairIndex % 2 === 1 ? 'source-left-bottom' : 'source-left';
      const targetHandle = dy > 30 ? 'target-right-top' : dy < -30 ? 'target-right-bottom' : pairIndex % 2 === 1 ? 'target-right-top' : 'target-right';
      return { sourceHandle, targetHandle };
    }
  } else {
    if (dy >= 0) {
      const sourceHandle = dx > 30 ? 'source-bottom-right' : dx < -30 ? 'source-bottom-left' : pairIndex % 2 === 1 ? 'source-bottom-right' : 'source-bottom';
      const targetHandle = dx > 30 ? 'target-top-left' : dx < -30 ? 'target-top-right' : pairIndex % 2 === 1 ? 'target-top-left' : 'target-top';
      return { sourceHandle, targetHandle };
    } else {
      const sourceHandle = dx > 30 ? 'source-top-right' : dx < -30 ? 'source-top-left' : pairIndex % 2 === 1 ? 'source-top-right' : 'source-top';
      const targetHandle = dx > 30 ? 'target-bottom-left' : dx < -30 ? 'target-bottom-right' : pairIndex % 2 === 1 ? 'target-bottom-left' : 'target-bottom';
      return { sourceHandle, targetHandle };
    }
  }
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
  const { t } = useTranslation();
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
    const positions = new Map<string, LayoutPosition>();
    const nodes: Node<any>[] = [];
    const expandedEntities = new Map<string, Entity>();

    // 1. Gather Candidate Entities
    let displayEntities: Entity[] = [];
    let internalEntities: Entity[] = [];
    let externalEntities: Entity[] = [];
    let shouldRenderContainer = false;

    if (system) {
      // SYSTEM CONTAINER FOCUSED VIEW:
      // If internal components exist, the system is rendered as a container.
      // If no internal components exist, the system is rendered as a focal entity card.
      const allRelatedIds = new Set([
        ...system.relatesTo,
        ...(system.relations ?? []).map((r) => r.targetId),
        ...entities.filter((e) => e.relatesTo.includes(system.id) || e.relations?.some((r) => r.targetId === system.id)).map((e) => e.id),
      ]);

      const relevantEntities = [...allRelatedIds]
        .map((id) => entityById.get(id))
        .filter((item): item is Entity => Boolean(item))
        .filter((item) => item.category !== 'system' || architecture.systemIds.includes(item.id))
        .filter((item) => item.category !== 'ecu' || architecture.ecuIds.includes(item.id));

      for (const ent of relevantEntities) {
        if (ent.id === system.id) continue;
        if (isInternalToSystem(ent, system.id, entities)) {
          internalEntities.push(ent);
        } else {
          externalEntities.push(ent);
        }
      }

      // Ensure any entity with parentId matching this system is captured as internal
      for (const ent of entities) {
        if (ent.id === system.id) continue;
        if (ent.parentId === system.id && !internalEntities.some((e) => e.id === ent.id)) {
          if (ent.category !== 'ecu' || architecture.ecuIds.includes(ent.id)) {
            internalEntities.push(ent);
          }
        }
      }

      // Expand exploration: prioritize internal children/components of expanded nodes
      for (const expId of expandedIds) {
        for (const id of getExpandableEntityIds(expId, entities)) {
          const linked = entityById.get(id);
          if (linked && linked.id !== system.id) {
            if (isInternalToSystem(linked, system.id, entities)) {
              if (!internalEntities.some((e) => e.id === linked.id)) {
                internalEntities.push(linked);
                expandedEntities.set(linked.id, linked);
              }
            } else if (!externalEntities.some((e) => e.id === linked.id)) {
              externalEntities.push(linked);
              expandedEntities.set(linked.id, linked);
            }
          }
        }
      }

      // Filter by visibleCategories
      internalEntities = internalEntities.filter((e) => visibleCategories.includes(e.category));
      externalEntities = externalEntities.filter((e) => visibleCategories.includes(e.category));

      const intCount = internalEntities.length;
      shouldRenderContainer = intCount > 0;
      const compositionStatus = getSystemCompositionStatus(system.id, internalEntities, externalEntities);

      if (shouldRenderContainer) {
        // Category sort for internal components: controllers first, then hardware, sensors, actuators
        const catOrder: Record<string, number> = { ecu: 0, hardware: 1, sensor: 2, actuator: 3, system: 4, network: 5, technology: 6, standard: 7, company: 8 };
        internalEntities.sort((a, b) => (catOrder[a.category] ?? 9) - (catOrder[b.category] ?? 9) || a.id.localeCompare(b.id));

        // 2. Compute Container & Internal Node Positions
        const cols = intCount <= 2 ? Math.max(intCount, 1) : intCount <= 6 ? 2 : 3;
        const rows = Math.ceil(Math.max(intCount, 1) / cols);
        const nodeW = 182;
        const nodeH = 62;
        const colGap = 32;
        const rowGap = 22;
        const padLeft = 28;
        const padRight = 28;
        const padTop = 58;
        const padBottom = 26;

        const containerW = padLeft + cols * nodeW + (cols - 1) * colGap + padRight;
        const containerH = padTop + rows * nodeH + (rows - 1) * rowGap + padBottom;

        // Classify external entities into left (inputs/upstream), right (loads/downstream), bottom (networks)
        const leftExternals: Entity[] = [];
        const rightExternals: Entity[] = [];
        const bottomExternals: Entity[] = [];

        for (const ext of externalEntities) {
          if (ext.category === 'network') {
            bottomExternals.push(ext);
          } else if (ext.category === 'hardware' || ext.category === 'actuator' || ext.id === 'hw-pdu') {
            rightExternals.push(ext);
          } else {
            leftExternals.push(ext);
          }
        }

        const containerX = leftExternals.length > 0 ? 330 : 100;
        const containerY = 60;

        // Position container node (group)
        nodes.push({
          id: `group:${system.id}`,
          type: 'group',
          position: { x: containerX, y: containerY },
          style: { width: containerW, height: containerH },
          zIndex: -1,
          data: {
            label: system.name[language] || system.name.en,
            count: intCount,
            language,
            isPartial: compositionStatus === 'partial',
          },
        });

        // Position internal nodes inside container
        internalEntities.forEach((entity, idx) => {
          const c = idx % cols;
          const r = Math.floor(idx / cols);
          const x = containerX + padLeft + c * (nodeW + colGap);
          const y = containerY + padTop + r * (nodeH + rowGap);
          positions.set(entity.id, { x, y });
        });

        // Position external left nodes (upstream / inputs)
        leftExternals.forEach((entity, idx) => {
          positions.set(entity.id, { x: 70, y: containerY + 20 + idx * 105 });
        });

        // Position external right nodes (downstream / outputs)
        rightExternals.forEach((entity, idx) => {
          positions.set(entity.id, { x: containerX + containerW + 90, y: containerY + 20 + idx * 105 });
        });

        // Position external bottom nodes (networks)
        bottomExternals.forEach((entity, idx) => {
          const netStartX = containerX + Math.max(0, (containerW - bottomExternals.length * 210) / 2);
          positions.set(entity.id, { x: netStartX + idx * 210, y: containerY + containerH + 50 });
        });

        displayEntities = [...internalEntities, ...externalEntities];
      } else {
        // NO INTERNAL CONTAINER: Degrade to clean relationship graph with system as focal node!
        // Under NO circumstances should an empty container appear.
        displayEntities = [system, ...externalEntities];
        const fallbackPositions = buildSystemRelationshipLayout(system, externalEntities);
        fallbackPositions.forEach((pos, id) => {
          positions.set(id, pos);
        });
      }
    } else {
      // TOP-LEVEL OVERVIEW VIEW:
      // Show system overview cards in a balanced layout.
      displayEntities = getOverviewSystemIds(architecture, entities)
        .map((id) => entityById.get(id))
        .filter((item): item is Entity => Boolean(item));

      // Expand exploration in overview
      for (const expId of expandedIds) {
        for (const id of getDirectRelatedEntityIds(expId, entities)) {
          const linked = entityById.get(id);
          if (linked && !displayEntities.some((e) => e.id === linked.id)) {
            displayEntities.push(linked);
            expandedEntities.set(linked.id, linked);
          }
        }
      }

      displayEntities = displayEntities.filter((e) => visibleCategories.includes(e.category));

      displayEntities.forEach((entity, index) => {
        const columns = 4;
        const x = 95 + (index % columns) * 220;
        const y = 90 + Math.floor(index / columns) * 145;
        positions.set(entity.id, elkPositions[entity.id] ?? { x, y });
      });
    }

    // Apply Search Filter
    const query = search.trim().toLocaleLowerCase();
    const filteredResults = query
      ? displayEntities.filter((entity) => `${entity.name.en} ${entity.name.zh} ${entity.description.en}`.toLocaleLowerCase().includes(query))
      : displayEntities;

    const resultIds = new Set(filteredResults.map((e) => e.id));
    const selectedNeighbors = new Set(selectedId ? getDirectRelationshipNeighbors(selectedId, entities, visibleRelationTypes) : []);

    // Create React Flow Entity Nodes
    for (const entity of filteredResults) {
      const pos = positions.get(entity.id) ?? { x: 100, y: 100 };
      nodes.push({
        id: entity.id,
        type: 'entity',
        position: pos,
        data: {
          entity,
          language,
          ...getNodeHighlight(entity.id, selectedId, selectedNeighbors, expandedIds),
        },
      });
    }

    // 3. Edge Generation & Filtering
    const edges: Edge[] = [];
    const pairEdgeCount = new Map<string, number>();
    const seenEdges = new Set<string>();

    const relationLabels: Record<string, [string, string]> = {
      contains: ['包含', 'contains'], part_of: ['属于', 'part of'], controls: ['控制', 'controls'], monitors: ['监测', 'monitors'],
      communicates_with: ['通信', 'communicates'], connected_to: ['总线连接', 'connected'], powered_by: ['由其供电', 'powered by'],
      distributes_power_to: ['配电', 'power flow'], depends_on: ['依赖', 'depends on'], implements: ['实现', 'implements'],
      uses: ['使用', 'uses'], integrates: ['集成', 'integrates'], transports: ['承载', 'transports'], defines: ['定义', 'defines'],
    };

    for (const source of filteredResults) {
      const explicitTargets = new Set((source.relations ?? []).map((relation) => relation.targetId));
      const links = [
        ...(source.relations ?? []).filter((r) => resultIds.has(r.targetId)).map((r) => ({ targetId: r.targetId, type: r.type, description: r.description })),
        ...source.relatesTo.filter((targetId) => resultIds.has(targetId) && !explicitTargets.has(targetId)).map((targetId) => ({
          targetId, type: 'related_to' as const,
          description: { zh: '关联链接', en: 'Related link' },
        })),
      ];

      for (const link of links) {
        const edgeId = `link:${source.id}:${link.targetId}:${link.type}`;
        if (seenEdges.has(edgeId)) continue;
        seenEdges.add(edgeId);

        if (!isRelationVisible(link.type, visibleRelationTypes)) continue;

        // View Mode Filtering:
        // Structure view: hide internal contains/part_of (expressed by container)
        if (viewMode === 'structure') {
          if (['contains', 'part_of'].includes(link.type)) continue;
          // In structure view with container, suppress low-level non-structural chatter
          if (shouldRenderContainer && !['integrates', 'controls', 'distributes_power_to', 'connected_to'].includes(link.type)) continue;
        }

        // Relationship view: hide structural containment, focus on communication, control, power, dependency
        if (viewMode === 'relationship') {
          const allowedRelTypes = ['communicates_with', 'controls', 'monitors', 'depends_on', 'powered_by', 'distributes_power_to', 'connected_to', 'uses', 'transports'];
          if (!allowedRelTypes.includes(link.type)) {
            if (!shouldRenderContainer && link.type === 'related_to' && (source.id === system?.id || link.targetId === system?.id)) {
              // keep related_to directly connecting to focal system when no container is available
            } else {
              continue;
            }
          }
        }

        // In overview without selection, skip generic related_to
        if (!selectedSystem && !selectedEcu && link.type === 'related_to') continue;

        const sourcePos = positions.get(source.id);
        const targetPos = positions.get(link.targetId);
        if (!sourcePos || !targetPos) continue;

        const pairKey = [source.id, link.targetId].sort().join(':');
        const pairIndex = pairEdgeCount.get(pairKey) ?? 0;
        pairEdgeCount.set(pairKey, pairIndex + 1);

        const { sourceHandle, targetHandle } = allocateDistributedHandles(sourcePos, targetPos, pairIndex);

        const highlighted = selectedId === source.id || selectedId === link.targetId;
        const selectedEdge = selectedRelationKey === edgeId;
        const pathEdge = expandedIds.includes(source.id) && expandedIds.includes(link.targetId);
        const relationshipCategory = getRelationshipCategory(link.type);

        const label = relationLabels[link.type]?.[language === 'zh' ? 0 : 1] ?? (link.type === 'related_to' ? undefined : link.type);

        edges.push({
          id: edgeId,
          source: source.id,
          target: link.targetId,
          type: 'smoothstep',
          sourceHandle,
          targetHandle,
          data: { sourceId: source.id, targetId: link.targetId, relationType: link.type, description: link.description },
          label: (hoveredEdgeId === edgeId || selectedEdge || (viewMode === 'relationship' && highlighted)) ? label : undefined,
          markerEnd: {
            type: MarkerType.ArrowClosed,
            color: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7' : relationshipCategory === 'power_flow' ? '#d8b45e' : relationshipCategory === 'control' ? '#77a5df' : relationshipCategory === 'communication' ? '#62b8d6' : '#547083',
          },
          style: {
            stroke: selectedEdge ? '#ffe08a' : highlighted ? '#77e5d7'
              : relationshipCategory === 'communication' ? '#62b8d6'
                : relationshipCategory === 'control' ? '#77a5df'
                  : relationshipCategory === 'dependency' ? '#a98bd7'
                    : relationshipCategory === 'power_flow' ? '#d8b45e'
                      : relationshipCategory === 'network' ? '#55c3ad'
                        : pathEdge ? '#52c8ba' : '#365b70',
            strokeWidth: selectedEdge ? 3 : highlighted ? 2.5 : 1.5,
            opacity: selectedId && !highlighted && !pathEdge ? 0.08 : 0.85,
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
  }, [
    architecture, entityById, entities, language, viewMode, selectedId, selectedSystem, selectedEcu,
    system, ecu, visibleCategories, visibleRelationTypes, search, expandedIds, selectedRelationKey,
    hoveredEdgeId, elkPositions,
  ]);

  // ELK Layout for Overview Mode only (when not in a focused system)
  useEffect(() => {
    if (selectedSystem) return; // Dedicated container engine handles system layout deterministically
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
      children: structuralNodes.map((node) => ({ id: node.id, width: 182, height: 62 })),
      edges: graph.edges
        .filter((edge) => structuralNodeIds.has(edge.source) && structuralNodeIds.has(edge.target))
        .map((edge) => ({ id: edge.id, sources: [edge.source], targets: [edge.target] })),
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
  }, [architecture.id, architecture.eeArchitecture, viewMode, selectedSystem, resetSignal]);

  const expandSelected = () => {
    if (!selectedId || expandedIds.includes(selectedId)) return;
    setExpandedIds((current) => appendExplorationStep(current, selectedId));
  };
  const selectedDirectCount = selectedId ? getExpandableEntityIds(selectedId, entities).length : 0;

  const onNodeClick = (_: React.MouseEvent, node: Node) => {
    const entity = entityById.get(node.id);
    if (!entity) return;

    onSelect(entity.id);

    // If clicking a system node in top-level overview, enter that system
    if (entity.category === 'system') {
      if (entity.id !== selectedSystem) {
        onSystem(entity.id);
        onEcu(null);
      }
    }
    // Note: When inside a system, clicking an ECU, sensor, or actuator selects/focuses it without destroying the container.
  };

  const systemNotice = useMemo(() => {
    if (!system) return null;
    const internal = entities.filter((e) => isInternalToSystem(e, system.id, entities));
    const allRelatedIds = new Set([
      ...system.relatesTo,
      ...(system.relations ?? []).map((r) => r.targetId),
      ...entities.filter((e) => e.relatesTo.includes(system.id) || e.relations?.some((r) => r.targetId === system.id)).map((e) => e.id),
    ]);
    const external = [...allRelatedIds]
      .filter((id) => id !== system.id && !internal.some((e) => e.id === id))
      .map((id) => entityById.get(id))
      .filter((item): item is Entity => Boolean(item));

    const status = getSystemCompositionStatus(system.id, internal, external);
    if (status === 'empty') return t('noArchitectureData');
    if (status === 'none') return t('compositionUndefined');
    if (status === 'partial') return t('compositionPartial');
    return null;
  }, [system, entities, entityById, t]);

  return (
    <div className="map-canvas" data-edge-count={graph.edges.length} data-node-count={graph.nodes.length}>
      {systemNotice && (
        <div className="map-system-notice" role="status">
          <Info size={13} />
          <span>{systemNotice}</span>
        </div>
      )}
      <svg className="car-outline" viewBox="0 0 760 410" aria-hidden="true">
        <path d="M259 24 Q380 -2 501 24 L556 68 Q586 100 596 149 L624 188 L624 318 Q620 350 590 360 L170 360 Q140 350 136 318 L136 188 L164 149 Q174 100 204 68 Z" />
        <path d="M246 48 Q380 28 514 48 L545 83 L565 145 L195 145 L215 83 Z" />
        <path d="M193 158 L567 158 L582 214 L178 214 Z M174 225 L586 225 L586 312 Q582 332 562 337 L198 337 Q178 332 174 312 Z" />
        <path d="M202 69 L172 86 L154 127 L179 140 M558 69 L588 86 L606 127 L581 140 M158 244 L178 244 M582 244 L602 244 M160 306 L181 306 M579 306 L600 306" />
        <circle cx="185" cy="170" r="13" /><circle cx="575" cy="170" r="13" />
        <circle cx="185" cy="322" r="13" /><circle cx="575" cy="322" r="13" />
      </svg>
      <ReactFlow
        key={`${architecture.id}:${architecture.eeArchitecture}:${selectedSystem ?? 'overview'}:${resetSignal}`}
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
          {language === 'zh' ? `展开一层组成/关联 (${selectedDirectCount})` : `Expand one level (${selectedDirectCount})`}
        </button>
        <button className="button-secondary" disabled={!expandedIds.length} onClick={() => setExpandedIds(collapseExplorationStep)}>
          {language === 'zh' ? '收起一层' : 'Collapse one level'}
        </button>
        <span>{expandedIds.length ? language === 'zh' ? `探索路径: ${expandedIds.map((id) => entityById.get(id)?.name[language] ?? id).join(' → ')}` : `Exploration path: ${expandedIds.join(' → ')}` : language === 'zh' ? '逐层展开，内部组成优先' : 'Expand manually, composition first'}</span>
      </div>}
    </div>
  );
}

export default function VehicleMap(props: Props) {
  return <ReactFlowProvider><VehicleMapCanvas {...props} /></ReactFlowProvider>;
}
