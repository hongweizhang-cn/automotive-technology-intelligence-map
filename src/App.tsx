import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Activity, ArrowLeft, ArrowRight, Atom, BatteryCharging, BookOpen, Boxes, CarFront,
  Check, ChevronDown, CircleHelp, Database, GitCompare, Globe2, Menu, Network, Search,
  Settings2, ShieldCheck, Sparkles, X, Zap,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import VehicleMap from './components/VehicleMap';
import EntityDetails from './components/EntityDetails';
import TechnologyExplorer from './pages/TechnologyExplorer';
import DataManagement from './pages/DataManagement';
import ArchitectureComparison from './pages/ArchitectureComparison';
import { initialData } from './data/initialData';
import { readData, readHistory, readLearning, recordChange, saveData, saveLearning } from './services/dataService';
import { searchEntities } from './services/entitySearch';
import { getTechnologyRelationLinks } from './services/technologyCatalog';
import type { AppData, ChangeRecord, Entity, EntityRelation, Language, LearningData, Propulsion, RelationType } from './types';
import './i18n';

type View = 'architecture' | 'explorer' | 'comparison' | 'industry' | 'radar' | 'learning' | 'data';
const navItems: Array<{ id: View; icon: typeof CarFront }> = [
  { id: 'architecture', icon: CarFront }, { id: 'explorer', icon: Atom }, { id: 'comparison', icon: GitCompare }, { id: 'industry', icon: Boxes },
  { id: 'radar', icon: Activity }, { id: 'learning', icon: BookOpen }, { id: 'data', icon: Database },
];
const propulsionTypes: Propulsion[] = ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'];
const categories = ['system', 'ecu', 'sensor', 'actuator', 'hardware', 'network', 'technology', 'standard', 'company'] as const;
const relationTypes: RelationType[] = ['related_to', 'contains', 'part_of', 'controls', 'monitors', 'communicates_with', 'connected_to', 'powered_by', 'distributes_power_to', 'depends_on', 'implements', 'uses', 'integrates', 'transports', 'defines'];
const relationTypeLabels: Record<RelationType, { zh: string; en: string }> = {
  related_to: { zh: '关联（语义未标注）', en: 'Related (unspecified)' },
  contains: { zh: '包含', en: 'Contains' },
  part_of: { zh: '属于', en: 'Part of' },
  controls: { zh: '控制', en: 'Controls' },
  monitors: { zh: '监测', en: 'Monitors' },
  communicates_with: { zh: '通信', en: 'Communicates with' },
  connected_to: { zh: '连接', en: 'Connected to' },
  powered_by: { zh: '由其供电', en: 'Powered by' },
  distributes_power_to: { zh: '向其供电', en: 'Distributes power to' },
  depends_on: { zh: '依赖', en: 'Depends on' },
  implements: { zh: '实现', en: 'Implements' },
  uses: { zh: '使用', en: 'Uses' },
  integrates: { zh: '集成', en: 'Integrates' },
  transports: { zh: '承载 / 传输', en: 'Transports' },
  defines: { zh: '定义', en: 'Defines' },
};
const categoryColors: Record<string, string> = { system: '#18b6a8', ecu: '#6395e9', sensor: '#aa84e9', actuator: '#ee9c54', hardware: '#d7b747', network: '#45b9d1', technology: '#6ec47b', standard: '#ce76ad', company: '#8393a8' };

function safeHistory(): ChangeRecord[] { try { return readHistory(); } catch { return []; } }
function safeLearning(): LearningData { try { return readLearning(); } catch { return { favorites: [], notes: {} }; } }

export default function App() {
  const { t, i18n } = useTranslation();
  const [stored] = useState(() => readData());
  const [data, setData] = useState<AppData>(stored.data);
  const [history, setHistory] = useState(safeHistory);
  const [learning, setLearning] = useState(safeLearning);
  const [language, setLanguage] = useState<Language>('zh');
  const [view, setView] = useState<View>('architecture');
  const [propulsion, setPropulsion] = useState<Propulsion>('BEV');
  const [selectedArchitectureId, setSelectedArchitectureId] = useState<string | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSystem, setSelectedSystem] = useState<string | null>(null);
  const [selectedEcu, setSelectedEcu] = useState<string | null>(null);
  const [visibleCategories, setVisibleCategories] = useState<string[]>(['system', 'ecu', 'sensor', 'actuator', 'hardware', 'network', 'technology', 'standard']);
  const [visibleRelationTypes, setVisibleRelationTypes] = useState<RelationType[]>(relationTypes);
  const [selectedRelationship, setSelectedRelationship] = useState<{ source: Entity; target: Entity; relation: EntityRelation } | null>(null);
  const [mapSearch, setMapSearch] = useState('');
  const [headerSearch, setHeaderSearch] = useState('');
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchPropulsion, setSearchPropulsion] = useState('');
  const [searchEeArchitecture, setSearchEeArchitecture] = useState('');
  const [showSearchResults, setShowSearchResults] = useState(false);
  const [resetSignal, setResetSignal] = useState(0);
  const [toast, setToast] = useState(stored.warning ?? '');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [aboutOpen, setAboutOpen] = useState(false);
  const globalSearchRef = useRef<HTMLInputElement>(null);

  useEffect(() => { void i18n.changeLanguage(language); document.documentElement.lang = language; }, [i18n, language]);
  useEffect(() => {
    try { setHistory(readHistory()); } catch (error) { setToast(error instanceof Error ? error.message : String(error)); }
    try { setLearning(readLearning()); } catch (error) { setToast(error instanceof Error ? error.message : String(error)); }
  }, []);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(''), 5500);
    return () => window.clearTimeout(timer);
  }, [toast]);
  useEffect(() => {
    const handleShortcut = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault();
        globalSearchRef.current?.focus();
        setShowSearchResults(true);
      }
      if (event.key === 'Escape') setShowSearchResults(false);
    };
    document.addEventListener('keydown', handleShortcut);
    return () => document.removeEventListener('keydown', handleShortcut);
  }, []);

  const entityById = useMemo(() => new Map(data.entities.map((entity) => [entity.id, entity])), [data.entities]);
  const architecture = data.architectures.find((item) => item.id === selectedArchitectureId && item.propulsion === propulsion && item.reviewStatus === 'Approved')
    ?? data.architectures.find((item) => item.propulsion === propulsion && item.reviewStatus === 'Approved')
    ?? data.architectures.find((item) => item.propulsion === propulsion)
    ?? data.architectures[0] ?? initialData.architectures[0];
  const architectureVariants = data.architectures.filter((item) => item.propulsion === propulsion && item.reviewStatus === 'Approved');
  const selected = selectedId ? entityById.get(selectedId) : undefined;
  const searchResults = searchEntities(data, headerSearch, {
    category: searchCategory as typeof categories[number] | 'all',
    propulsion: searchPropulsion as Propulsion | '',
    eeArchitecture: searchEeArchitecture as AppData['architectures'][number]['eeArchitecture'] | '',
  });

  const persistData = (next: AppData) => {
    try { saveData(next); setData(next); }
    catch (error) { setToast(`Could not save local data: ${error instanceof Error ? error.message : String(error)}`); return false; }
    return true;
  };
  const toggleFavorite = (id: string) => {
    const next = { ...learning, favorites: learning.favorites.includes(id) ? learning.favorites.filter((item) => item !== id) : [...learning.favorites, id] };
    try { saveLearning(next); setLearning(next); }
    catch (error) { setToast(`Could not save learning data: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const saveNote = (id: string, value: string) => {
    const notes = { ...learning.notes };
    if (value.trim()) notes[id] = value;
    else delete notes[id];
    const next = { ...learning, notes };
    try { saveLearning(next); setLearning(next); }
    catch (error) { setToast(`Could not save learning data: ${error instanceof Error ? error.message : String(error)}`); }
  };
  const changeEntity = (before: Entity | null, after: Entity) => {
    if (after.createdBy === 'Agent' && after.reviewStatus === 'Approved') {
      setToast(language === 'zh' ? 'Agent 创建的记录不能直接标记为审核通过。' : 'Agent-created records cannot be approved directly.');
      return false;
    }
    const nextEntities = before ? data.entities.map((item) => item.id === before.id ? after : item) : [...data.entities, after];
    const next = { ...data, entities: nextEntities };
    if (!persistData(next)) return false;
    const record: ChangeRecord = {
      id: `${Date.now()}-${after.id}`, entityId: after.id,
      entityName: after.name[language] || after.name.en, changedAt: new Date().toISOString(),
      changedBy: 'Human', before, after,
    };
    try { recordChange(record); setHistory((current) => [record, ...current].slice(0, 500)); }
    catch (error) { setToast(`Data saved, but change history could not be recorded: ${error instanceof Error ? error.message : String(error)}`); }
    setToast(language === 'zh' ? '已保存，相关页面已同步更新。' : 'Saved. Related views have been updated.');
    return true;
  };
  const changeArchitecture = (before: AppData['architectures'][number] | null, after: AppData['architectures'][number]) => {
    if (after.createdBy === 'Agent' && after.reviewStatus === 'Approved') {
      setToast(language === 'zh' ? 'Agent 创建的架构不能直接标记为审核通过。' : 'Agent-created architectures cannot be approved directly.');
      return false;
    }
    const architectures = before
      ? data.architectures.map((item) => item.id === before.id ? after : item)
      : [...data.architectures, after];
    if (!persistData({ ...data, architectures })) return false;
    const record: ChangeRecord = {
      id: `${Date.now()}-${after.id}`, entityId: after.id,
      entityName: after.name[language] || after.name.en, changedAt: new Date().toISOString(),
      changedBy: 'Human', before, after,
    };
    try { recordChange(record); setHistory((current) => [record, ...current].slice(0, 500)); }
    catch (error) { setToast(`Data saved, but change history could not be recorded: ${error instanceof Error ? error.message : String(error)}`); }
    setToast(language === 'zh' ? '架构已保存。' : 'Architecture saved.');
    return true;
  };
  const changeEeArchitecture = (before: AppData['architectures'][number], mode: AppData['architectures'][number]['eeArchitecture']) => {
    const topologyControllerIds = ['ecu-central-compute', 'ecu-zonal', 'ecu-zonal-front', 'ecu-zonal-rear', 'ecu-powertrain-domain', 'ecu-body-domain', 'ecu-adas-domain', 'ecu-cockpit-domain'];
    const controllersByMode: Record<AppData['architectures'][number]['eeArchitecture'], string[]> = {
      Distributed: [],
      Domain: ['ecu-powertrain-domain', 'ecu-body-domain', 'ecu-adas-domain', 'ecu-cockpit-domain'],
      Zonal: ['ecu-zonal', 'ecu-zonal-front', 'ecu-zonal-rear'],
      Centralized: ['ecu-central-compute'],
    };
    const functionalEcus = before.ecuIds.filter((id) => !topologyControllerIds.includes(id));
    const modeEcus = controllersByMode[mode].filter((id) => entityById.has(id));
    changeArchitecture(before, {
      ...before,
      eeArchitecture: mode,
      ecuIds: Array.from(new Set([...functionalEcus, ...modeEcus])),
      updatedAt: new Date().toISOString(),
    });
  };
  const removeArchitecture = (architectureToRemove: AppData['architectures'][number]) => {
    if (data.architectures.filter((item) => item.propulsion === architectureToRemove.propulsion).length <= 1) {
      setToast(language === 'zh' ? '每种动力类型至少需要保留一个参考架构。' : 'Keep at least one reference architecture for each propulsion type.');
      return false;
    }
    const architectures = data.architectures.filter((item) => item.id !== architectureToRemove.id);
    if (!persistData({ ...data, architectures })) return false;
    const record: ChangeRecord = {
      id: `${Date.now()}-${architectureToRemove.id}`, entityId: architectureToRemove.id,
      entityName: architectureToRemove.name[language] || architectureToRemove.name.en,
      changedAt: new Date().toISOString(), changedBy: 'Human', before: architectureToRemove, after: null,
    };
    try { recordChange(record); setHistory((current) => [record, ...current].slice(0, 500)); }
    catch (error) { setToast(`Deleted, but change history could not be recorded: ${error instanceof Error ? error.message : String(error)}`); }
    if (architecture.id === architectureToRemove.id) {
      setSelectedArchitectureId(null); setSelectedId(null); setSelectedSystem(null); setSelectedEcu(null);
    }
    return true;
  };
  const deleteEntity = (entity: Entity) => {
    const archReferences = data.architectures.some((item) => item.systemIds.includes(entity.id) || item.ecuIds.includes(entity.id));
    if (archReferences) { setToast(language === 'zh' ? '无法删除：实体仍被车辆架构引用。' : 'Cannot delete: this entity is referenced by a vehicle architecture.'); return false; }
    const next = { ...data, entities: data.entities.filter((item) => item.id !== entity.id) };
    if (!persistData(next)) return false;
    const record: ChangeRecord = { id: `${Date.now()}-${entity.id}`, entityId: entity.id, entityName: entity.name[language] || entity.name.en, changedAt: new Date().toISOString(), changedBy: 'Human', before: entity, after: null };
    try { recordChange(record); setHistory((current) => [record, ...current].slice(0, 500)); }
    catch (error) { setToast(`Deleted, but change history could not be recorded: ${error instanceof Error ? error.message : String(error)}`); }
    setSelectedId(null);
    return true;
  };
  const importData = (next: AppData) => {
    if (!persistData(next)) return false;
    setSelectedId(null); setSelectedSystem(null); setSelectedEcu(null);
    setToast(t('imported'));
    return true;
  };
  const changePropulsion = (id: Propulsion) => {
    setPropulsion(id); setSelectedArchitectureId(null); setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); setSelectedRelationship(null); setMapSearch('');
  };
  const navigateToEntity = (id: string) => {
    const entity = entityById.get(id);
    if (!entity) return;
    setSelectedRelationship(null);
    setSelectedId(id);
    if (entity.category === 'system' || entity.category === 'ecu' || entity.category === 'network') {
      setView('architecture');
      if (entity.category === 'system') { setSelectedSystem(id); setSelectedEcu(null); }
      if (entity.category === 'ecu') {
        const parent = entity.relatesTo.find((item) => architecture.systemIds.includes(item));
        if (parent) setSelectedSystem(parent);
        setSelectedEcu(id);
      }
    } else {
      setView('explorer');
    }
    setHeaderSearch(''); setShowSearchResults(false);
  };
  const openTechnologyOnMap = (id: string) => {
    const technology = entityById.get(id);
    if (!technology) return;
    const mapped = getTechnologyRelationLinks(technology, data.entities)
      .map((link) => link.entity)
      .find((entity) => ['system', 'ecu', 'network'].includes(entity.category));
    if (!mapped) {
      setToast(language === 'zh' ? '该技术尚无可定位到整车架构图的系统、ECU 或网络关联。' : 'This technology has no system, ECU, or network link to locate on the vehicle map.');
      return;
    }
    if (mapped.appliesTo?.includes(propulsion) === false && mapped.appliesTo?.length) setPropulsion(mapped.appliesTo[0]);
    setSelectedRelationship(null);
    setSelectedId(mapped.id);
    if (mapped.category === 'system') { setSelectedSystem(mapped.id); setSelectedEcu(null); }
    else if (mapped.category === 'ecu') {
      const parent = mapped.relatesTo.find((item) => architecture.systemIds.includes(item));
      setSelectedSystem(parent ?? null);
      setSelectedEcu(mapped.id);
    } else { setSelectedSystem(null); setSelectedEcu(null); }
    setView('architecture');
  };
  const selectMapEntity = (id: string) => {
    setSelectedRelationship(null);
    setSelectedId(id || null);
  };
  const selectRelationship = (sourceId: string, targetId: string, type: RelationType) => {
    const source = entityById.get(sourceId);
    const target = entityById.get(targetId);
    if (!source || !target) return;
    const relation = source.relations?.find((item) => item.targetId === targetId && item.type === type) ?? {
      targetId,
      type,
      description: { zh: '旧版关联未记录关系语义。', en: 'Legacy link; relationship semantics were not recorded.' },
    };
    setSelectedRelationship({ source, target, relation });
    setSelectedId(targetId);
  };
  const openComparedArchitecture = (nextPropulsion: Propulsion, ee?: AppData['architectures'][number]['eeArchitecture']) => {
    const target = data.architectures.find((item) => item.propulsion === nextPropulsion
      && item.reviewStatus === 'Approved' && (!ee || item.eeArchitecture === ee))
      ?? data.architectures.find((item) => item.propulsion === nextPropulsion && item.reviewStatus === 'Approved');
    if (!target) {
      setToast(language === 'zh' ? '找不到对应的已审核参考架构。' : 'No approved reference architecture is available.');
      return;
    }
    setPropulsion(target.propulsion);
    setSelectedArchitectureId(target.id);
    setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); setSelectedRelationship(null);
    setView('architecture');
  };

  const localizedPropulsion = (id: Propulsion) => data.architectures.find((item) => item.propulsion === id && item.reviewStatus === 'Approved')?.name[language] ?? id;
  const activeSystem = selectedSystem ? entityById.get(selectedSystem) : undefined;
  const activeEcu = selectedEcu ? entityById.get(selectedEcu) : undefined;
  const availableRelationTypes = Array.from(new Set(data.entities.flatMap((entity) => {
    const explicit = entity.relations?.map((relation) => relation.type) ?? [];
    return [...explicit, ...entity.relatesTo.filter((id) => !entity.relations?.some((relation) => relation.targetId === id)).map(() => 'related_to' as const)];
  })));
  const labelCategory = (category: string) => ({
    system: language === 'zh' ? '车辆系统' : 'Vehicle systems',
    ecu: language === 'zh' ? 'ECU / 功能单元' : 'ECUs / Functional units',
    sensor: language === 'zh' ? '传感器' : 'Sensors',
    actuator: language === 'zh' ? '执行器' : 'Actuators',
    hardware: language === 'zh' ? '芯片与硬件' : 'Hardware',
    network: language === 'zh' ? '通信网络' : 'Networks',
    technology: language === 'zh' ? '软件与技术' : 'Software & technology',
    standard: language === 'zh' ? '技术标准' : 'Standards',
    company: language === 'zh' ? '企业' : 'Companies',
  }[category] ?? category);

  return (
    <div className="app-shell">
      <header className="topbar">
        <button className="mobile-menu icon-btn" onClick={() => setSidebarOpen((open) => !open)} aria-label="Toggle menu"><Menu size={19} /></button>
        <div className="brand-mark"><span className="brand-symbol"><CarFront size={20} /></span><span className="brand-copy"><b>ATIM</b><small>{t('tagline')}</small></span></div>
        <div className="header-search-wrap">
          <div className="global-search"><Search size={16} /><input ref={globalSearchRef} value={headerSearch} onFocus={() => setShowSearchResults(true)} onChange={(event) => { setHeaderSearch(event.target.value); setShowSearchResults(true); }} placeholder={t('search')} /><kbd>Ctrl K</kbd></div>
          {showSearchResults && headerSearch && <div className="search-dropdown">
            <div className="global-search-filters">
              <label>{language === 'zh' ? '实体类型' : 'Entity type'}<select value={searchCategory} onChange={(event) => setSearchCategory(event.target.value)}><option value="all">{language === 'zh' ? '全部' : 'All'}</option>{categories.map((category) => <option value={category} key={category}>{labelCategory(category)}</option>)}</select></label>
              <label>{language === 'zh' ? '动力类型' : 'Powertrain'}<select value={searchPropulsion} onChange={(event) => setSearchPropulsion(event.target.value)}><option value="">{language === 'zh' ? '全部' : 'All'}</option>{propulsionTypes.map((id) => <option value={id} key={id}>{id}</option>)}</select></label>
              <label>E/E<select value={searchEeArchitecture} onChange={(event) => setSearchEeArchitecture(event.target.value)}><option value="">{language === 'zh' ? '全部' : 'All'}</option>{['Distributed', 'Domain', 'Zonal', 'Centralized'].map((id) => <option value={id} key={id}>{id === 'Centralized' ? 'Centralized Computing' : id}</option>)}</select></label>
            </div>
            {searchResults.map((entity) => <button key={entity.id} onClick={() => navigateToEntity(entity.id)}><span className="mini-dot" style={{ background: categoryColors[entity.category] }} /><span>{entity.name[language] || entity.name.en}<small>{labelCategory(entity.category)} · {entity.id}</small></span><ArrowRight size={14} /></button>)}
            {!searchResults.length && <div className="search-no-result">{t('noResults')}</div>}
            <button className="search-dismiss" onClick={() => setShowSearchResults(false)}>{t('clearSearch')}</button>
          </div>}
        </div>
        <div className="header-actions">
          <span className="build-tag"><span />{t('version')}</span>
          <button className="language-btn" onClick={() => setLanguage(language === 'zh' ? 'en' : 'zh')}><Globe2 size={15} />{t('language')}</button>
          <div className="user-avatar" title="Local workspace">H</div>
        </div>
      </header>
      {showSearchResults && <button className="click-away" aria-label="Close search results" onClick={() => setShowSearchResults(false)} />}
      <div className="app-layout">
        <aside className={`sidebar${sidebarOpen ? ' sidebar-open' : ''}`}>
          <div className="workspace-switch"><div className="workspace-icon">A</div><span><b>Workspace</b><small>{language === 'zh' ? '本地知识库' : 'Local knowledge base'}</small></span><ChevronDown size={14} /></div>
          <div className="nav-section-label">{language === 'zh' ? '工作区' : 'WORKSPACE'}</div>
          <nav>{navItems.map(({ id, icon: Icon }) => <button key={id} onClick={() => { setView(id); setSidebarOpen(false); setShowSearchResults(false); }} className={`nav-item${view === id ? ' active' : ''}`}><Icon size={17} /><span>{t(id)}</span>{id === 'data' && data.entities.some((item) => item.reviewStatus === 'Pending Review') && <i className="nav-count">{data.entities.filter((item) => item.reviewStatus === 'Pending Review').length}</i>}</button>)}</nav>
          <div className="sidebar-bottom">
            <div className="sidebar-divider" />
            <div className="coverage-card"><div className="coverage-icon"><Network size={15} /></div><div><b>{language === 'zh' ? '知识图谱覆盖' : 'Graph coverage'}</b><span>{data.entities.length} {language === 'zh' ? '个实体' : 'entities'} · {data.architectures.length} architectures</span></div></div>
            <button className="help-button" onClick={() => setAboutOpen(true)}><CircleHelp size={15} />{language === 'zh' ? '关于与帮助' : 'About & help'}<span>↗</span></button>
            <div className="sidebar-footer">{t('poweredBy')}<div>© 2026 ATIM <span>v0.1.0</span></div></div>
          </div>
        </aside>
        <main className="main-area" onClick={() => { if (sidebarOpen) setSidebarOpen(false); }}>
          {view === 'architecture' && <div className="architecture-view">
            <div className="arch-header">
              <div><div className="eyebrow">VEHICLE SYSTEMS / 01</div><h1>{t('architecture')}</h1><p>{language === 'zh' ? '探索系统、控制器与车载网络的参考关系。' : 'Explore reference relationships among vehicle systems, controllers, and in-vehicle networks.'}</p></div>
              <div className="architecture-metrics"><span><strong>{architecture.systemIds.length.toString().padStart(2, '0')}</strong>{t('systems')}</span><span><strong>{architecture.ecuIds.length.toString().padStart(2, '0')}</strong>{t('controllers')}</span><span><strong>{data.entities.filter((e) => e.category === 'technology').length.toString().padStart(2, '0')}</strong>{t('technologies')}</span></div>
            </div>
            <section className="vehicle-selector panel-card">
              <div className="selector-label"><span className="selector-icon"><Zap size={15} /></span><span><b>{language === 'zh' ? '动力类型' : 'Powertrain type'}</b><small>{language === 'zh' ? '选择参考动力拓扑' : 'Choose a reference topology'}</small></span></div>
              <div className="powertrain-options">{propulsionTypes.map((id) => <button key={id} className={id === propulsion ? 'active' : ''} onClick={() => changePropulsion(id)}><span>{id === 'BEV' || id === 'FCEV' ? <BatteryCharging size={14} /> : <Settings2 size={14} />}</span>{id}</button>)}</div>
              <div className="selector-separator" />
              {architectureVariants.length > 1 && <label className="ee-select variant-select"><span>{language === 'zh' ? '参考方案' : 'Reference variant'}</span><select value={architecture.id} onChange={(event) => { setSelectedArchitectureId(event.target.value); setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); }} aria-label={language === 'zh' ? '参考方案' : 'Reference variant'}>{architectureVariants.map((item) => <option value={item.id} key={item.id}>{item.name[language] || item.name.en}</option>)}</select><ChevronDown size={13} /></label>}
              <label className="ee-select"><span>{t('ee')}</span><select value={architecture.eeArchitecture} onChange={(event) => changeEeArchitecture(architecture, event.target.value as AppData['architectures'][number]['eeArchitecture'])}><option value="Distributed">Distributed</option><option value="Domain">Domain</option><option value="Zonal">Zonal</option><option value="Centralized">Centralized computing</option></select><ChevronDown size={13} /></label>
            </section>
            <div className="reference-note"><Sparkles size={14} /><span><b>{t('reference')}</b> · {architecture.topology[language] || architecture.topology.en}</span><small>{t('verified')}</small></div>
            <div className="map-toolbar panel-card">
              <div className="breadcrumbs">
                <button onClick={() => { setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); }}>{localizedPropulsion(propulsion)}</button>
                {activeSystem && <><span>/</span><button onClick={() => { setSelectedEcu(null); setSelectedId(activeSystem.id); }}>{activeSystem.name[language] || activeSystem.name.en}</button></>}
                {activeEcu && <><span>/</span><b>{activeEcu.name[language] || activeEcu.name.en}</b></>}
              </div>
              <div className="map-actions"><div className="map-search"><Search size={14} /><input value={mapSearch} onChange={(event) => setMapSearch(event.target.value)} placeholder={language === 'zh' ? '搜索节点…' : 'Search nodes…'} />{mapSearch && <button className="icon-btn" onClick={() => setMapSearch('')}><X size={13} /></button>}</div>
                {selectedSystem && <button className="button-quiet" onClick={() => { setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); }}><ArrowLeft size={14} />{t('back')}</button>}
                <button className="reset-btn" onClick={() => { setSelectedSystem(null); setSelectedEcu(null); setSelectedId(null); setResetSignal((value) => value + 1); }}><span>⤢</span>{t('reset')}</button>
              </div>
            </div>
            <div className="map-workspace">
              <section className="map-stage panel-card">
                <div className="map-legend"><span><i style={{ background: categoryColors.system }} />{labelCategory('system')}</span><span><i style={{ background: categoryColors.ecu }} />{labelCategory('ecu')}</span><span><i style={{ background: categoryColors.network }} />{labelCategory('network')}</span><span className="legend-hint">{language === 'zh' ? '参考拓扑分组，不表示具体车型安装位置 · 点击系统或 ECU 查看关系' : 'Reference topology grouping, not vehicle mounting locations · select a system or ECU to inspect links'}</span></div>
                <VehicleMap architecture={architecture} entities={data.entities.filter((entity) => entity.reviewStatus === 'Approved')} language={language} selectedSystem={selectedSystem} selectedEcu={selectedEcu} selectedId={selectedId} visibleCategories={visibleCategories} visibleRelationTypes={visibleRelationTypes} onSelect={selectMapEntity} onSystem={setSelectedSystem} onEcu={setSelectedEcu} onEdge={selectRelationship} selectedRelationKey={selectedRelationship ? `link:${selectedRelationship.source.id}:${selectedRelationship.target.id}:${selectedRelationship.relation.type}` : null} search={mapSearch} resetSignal={resetSignal} />
                <div className="map-scale"><span className="live-dot" />{language === 'zh' ? '参考拓扑 · 交互视图' : 'Reference topology · interactive view'}<span className="scale-divider" />{selectedSystem ? language === 'zh' ? '系统级探索' : 'System exploration' : language === 'zh' ? '整车总览' : 'Vehicle overview'}</div>
              </section>
              <aside className="layers-panel panel-card"><div className="panel-title"><span>{t('layers')}</span><button className="text-button" onClick={() => setVisibleCategories([...categories])}>{t('showAll')}</button></div>
                <div className="layer-list">{categories.map((category) => <label key={category} className="layer-toggle"><span className="layer-color" style={{ background: categoryColors[category] }} /><span>{labelCategory(category)}</span><input type="checkbox" checked={visibleCategories.includes(category)} onChange={(event) => setVisibleCategories((items) => event.target.checked ? [...items, category] : items.filter((item) => item !== category))} /><i /></label>)}</div>
                <details className="relationship-filter">
                  <summary>{language === 'zh' ? '关系类型' : 'Relationship types'}</summary>
                  <button className="text-button" onClick={() => setVisibleRelationTypes((current) => availableRelationTypes.every((type) => current.includes(type)) ? [] : availableRelationTypes)}>{language === 'zh' ? '全选 / 清空' : 'Select all / none'}</button>
                  {availableRelationTypes.map((type) => <label key={type}><input type="checkbox" checked={visibleRelationTypes.includes(type)} onChange={(event) => setVisibleRelationTypes((current) => event.target.checked ? [...current, type] : current.filter((item) => item !== type))} /><span>{relationTypeLabels[type][language]}</span></label>)}
                </details>
                <div className="layer-tip"><ShieldCheck size={14} /><span>{language === 'zh' ? '仅显示已审核的参考实体' : 'Only approved reference entities shown'}</span></div>
              </aside>
              <EntityDetails entity={selected} entities={data.entities} language={language} favorite={selected ? learning.favorites.includes(selected.id) : false} onFavorite={() => selected && toggleFavorite(selected.id)} onSelectRelated={navigateToEntity} relationship={selectedRelationship} />
            </div>
          </div>}

          {view === 'explorer' && <TechnologyExplorer entities={data.entities} language={language} favorites={learning.favorites} onFavorite={toggleFavorite} onSelect={navigateToEntity} onOpenMap={openTechnologyOnMap} focusEntityId={selectedId} onLearn={(id) => { toggleFavorite(id); setView('learning'); }} />}
          {view === 'comparison' && <ArchitectureComparison data={data} language={language} onSelectEntity={navigateToEntity} onOpenArchitecture={openComparedArchitecture} />}
          {view === 'industry' && <IndustryPage entities={data.entities} language={language} onSelect={navigateToEntity} />}
          {view === 'radar' && <RadarPage entities={data.entities} language={language} onSelect={navigateToEntity} />}
          {view === 'learning' && <LearningPage entities={data.entities} language={language} learning={learning} onFavorite={toggleFavorite} onSaveNote={saveNote} onSelect={navigateToEntity} />}
          {view === 'data' && <DataManagement data={data} history={history} language={language} onSave={changeEntity} onDelete={deleteEntity} onImport={importData} onSaveArchitecture={changeArchitecture} onDeleteArchitecture={removeArchitecture} />}
          {aboutOpen && <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) setAboutOpen(false); }}><section className="about-modal panel-card" role="dialog" aria-modal="true" aria-labelledby="about-title"><div className="section-title"><h2 id="about-title">ATIM · MVP</h2><button className="icon-btn" onClick={() => setAboutOpen(false)} aria-label="Close"><X size={16} /></button></div><p>{language === 'zh' ? '面向工程探索的本地汽车技术参考知识图谱。架构及企业数据为示意信息，不代表量产车型配置或已确认供应关系。' : 'A local automotive technology reference graph for engineering exploration. Architecture and company records are illustrative; they do not assert production-vehicle configurations or confirmed supplier relationships.'}</p><div className="about-meta"><span>{language === 'zh' ? '数据保存在此浏览器' : 'Data stored in this browser'}</span><span>{data.entities.length} {language === 'zh' ? '个实体' : 'entities'}</span></div><button className="button-primary" onClick={() => { setAboutOpen(false); setView('data'); }}>{language === 'zh' ? '打开数据管理' : 'Open Data Management'}<ArrowRight size={14} /></button></section></div>}
          {toast && <div className="toast"><Check size={15} /><span>{toast}</span><button className="icon-btn" onClick={() => setToast('')}><X size={14} /></button></div>}
        </main>
      </div>
    </div>
  );
}

function IndustryPage({ entities, language, onSelect }: { entities: Entity[]; language: Language; onSelect: (id: string) => void }) {
  const companies = entities.filter((entity) => entity.category === 'company');
  const [filter, setFilter] = useState('All');
  const filtered = filter === 'All' ? companies : companies.filter((entity) => entity.companyType === filter);
  const types = ['All', ...Array.from(new Set(companies.map((entity) => entity.companyType ?? 'Other')))];
  const labels: Record<string, string> = { OEM: language === 'zh' ? '整车厂' : 'OEM', 'Tier 1 Supplier': language === 'zh' ? '一级供应商' : 'Tier 1', 'Semiconductor Supplier': language === 'zh' ? '半导体' : 'Semiconductor', 'Software Supplier': language === 'zh' ? '软件供应商' : 'Software', 'Technology Provider': language === 'zh' ? '技术平台' : 'Technology provider', 'Standards Organization': language === 'zh' ? '标准组织' : 'Standards org' };
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">INDUSTRY LANDSCAPE / 03</div><h1>{language === 'zh' ? '行业与企业' : 'Industry & Company Map'}</h1><p>{language === 'zh' ? '浏览代表性产业参与者及其公开的一般技术领域。' : 'Browse representative industry participants and their general technology areas.'}</p></div><div className="stat-tile"><strong>{companies.length.toString().padStart(2, '0')}</strong><span>{language === 'zh' ? '代表性机构' : 'organizations'}</span></div></div>
    <div className="company-disclaimer"><ShieldCheck size={15} />{language === 'zh' ? '企业技术标签仅表示一般能力，不表示已确认的车型或供应链关系。企业描述暂未附来源，数据可信度标记为未核实。' : 'Technology tags indicate general capabilities only, not confirmed vehicle or supply-chain relationships. Company summaries have no source recorded and are marked unverified.'}</div>
    <div className="category-pills company-filters">{types.map((type) => <button key={type} onClick={() => setFilter(type)} className={filter === type ? 'selected' : ''}>{type === 'All' ? language === 'zh' ? '全部' : 'All' : labels[type] ?? type}</button>)}</div>
    <div className="company-grid">{filtered.map((company, index) => {
      const related = company.relatesTo.map((id) => entities.find((entity) => entity.id === id)).filter((item): item is Entity => Boolean(item));
      return <button key={company.id} className="company-card panel-card" onClick={() => onSelect(company.id)}><div className="company-top"><div className={`company-logo logo-${index % 5}`}>{company.name.en.slice(0, 1)}</div><span className="company-type">{labels[company.companyType ?? ''] ?? company.companyType}</span></div><h3>{company.name[language] || company.name.en}</h3><p>{company.description[language] || company.description.en}</p><div className="company-tags">{related.length ? related.slice(0, 3).map((item) => <span key={item.id}>{item.name[language] || item.name.en}</span>) : <span className="unverified-tag">{language === 'zh' ? '暂无已核实的技术关联' : 'No verified technology links'}</span>}</div><div className="company-footer"><span>{language === 'zh' ? '通用行业信息' : 'General industry information'}</span><ArrowRight size={14} /></div></button>;
    })}</div>
  </div>;
}

function RadarPage({ entities, language, onSelect }: { entities: Entity[]; language: Language; onSelect: (id: string) => void }) {
  const technologies = entities.filter((entity) => entity.category === 'technology' && entity.reviewStatus === 'Approved');
  const groups = [
    { title: language === 'zh' ? '已广泛应用' : 'Established', note: language === 'zh' ? '成熟的车载技术' : 'Mature in-vehicle technologies', ids: ['tech-canfd', 'tech-lin', 'tech-autosar-classic', 'tech-uds', 'tech-iso26262'] },
    { title: language === 'zh' ? '持续演进' : 'Evolving', note: language === 'zh' ? '扩展至新架构与服务' : 'Expanding across architectures and services', ids: ['tech-ethernet', 'tech-autosar-adaptive', 'tech-doip', 'tech-ota', 'tech-cybersecurity'] },
    { title: language === 'zh' ? '新兴方向' : 'Emerging', note: language === 'zh' ? '持续发展的行业主题' : 'Ongoing industry themes', ids: ['tech-sdv', 'tech-adas', 'tech-1000base', 'tech-someip'] },
  ];
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">TECHNOLOGY RADAR / 04</div><h1>{language === 'zh' ? '技术雷达' : 'Technology Radar'}</h1><p>{language === 'zh' ? '以方向性主题观察汽车软件与电子技术演进。' : 'A directional view of automotive software and electronic technology themes.'}</p></div><div className="radar-mark"><Activity size={21} /></div></div>
    <div className="company-disclaimer"><Activity size={15} />{language === 'zh' ? '分类为定性参考，不构成投资、产品选型或市场预测。' : 'Qualitative groupings only; not investment advice, product guidance, or a market forecast.'}</div>
    <div className="radar-columns">{groups.map((group, index) => <section key={group.title} className="radar-column panel-card"><div className={`radar-column-head radar-head-${index}`}><div><span>0{index + 1} / MATURITY THEME</span><h2>{group.title}</h2><p>{group.note}</p></div><span className="radar-ring">{group.ids.length}</span></div><div className="radar-items">{group.ids.map((id) => {
      const entity = technologies.find((item) => item.id === id);
      return entity ? <button className="radar-item" key={id} onClick={() => onSelect(id)}><span className="radar-item-dot" />{entity.name[language] || entity.name.en}<ArrowRight size={13} /></button> : null;
    })}</div></section>)}</div><div className="radar-footnote">{language === 'zh' ? `${technologies.length} 项已审核技术条目 · 数据管理中的分类可持续调整` : `${technologies.length} approved technology entries · Themes can be maintained in Data Management`}</div>
  </div>;
}

function LearningPage({ entities, language, learning, onFavorite, onSaveNote, onSelect }: { entities: Entity[]; language: Language; learning: LearningData; onFavorite: (id: string) => void; onSaveNote: (id: string, note: string) => void; onSelect: (id: string) => void }) {
  const favorites = learning.favorites.map((id) => entities.find((entity) => entity.id === id)).filter((item): item is Entity => Boolean(item));
  const [selectedId, setSelectedId] = useState(favorites[0]?.id ?? '');
  const [noteValue, setNoteValue] = useState('');
  useEffect(() => { if (selectedId) setNoteValue(learning.notes[selectedId] ?? ''); }, [selectedId, learning.notes]);
  const selected = favorites.find((entity) => entity.id === selectedId);
  const countNotes = Object.values(learning.notes).filter(Boolean).length;
  return <div className="page-content"><div className="page-heading"><div><div className="eyebrow">PERSONAL KNOWLEDGE / 05</div><h1>{language === 'zh' ? '个人学习中心' : 'My Learning Center'}</h1><p>{language === 'zh' ? '整理关注的技术与系统，为每个实体记录学习笔记。' : 'Organize technologies and systems you follow, with personal notes for each entity.'}</p></div><div className="learning-stats"><span><b>{favorites.length}</b>{language === 'zh' ? '已收藏' : 'saved'}</span><span><b>{countNotes}</b>{language === 'zh' ? '篇笔记' : 'notes'}</span></div></div>
    <div className="learning-workspace"><section className="panel-card learning-list"><div className="section-title"><h2>{language === 'zh' ? '我的收藏' : 'My favorites'}</h2><span>{favorites.length}</span></div>{favorites.map((entity) => <div key={entity.id} role="button" tabIndex={0} className={`learning-item${selectedId === entity.id ? ' active' : ''}`} onClick={() => setSelectedId(entity.id)} onKeyDown={(event) => { if (event.key === 'Enter' || event.key === ' ') setSelectedId(entity.id); }}><span className={`mini-dot node-${entity.category}`} /><span><b>{entity.name[language] || entity.name.en}</b><small>{entity.category} · {entity.id}</small></span><button className="remove-favorite" aria-label="Remove favorite" onClick={(event) => { event.stopPropagation(); onFavorite(entity.id); if (selectedId === entity.id) setSelectedId(''); }}>×</button></div>)}{!favorites.length && <div className="empty-state"><BookmarkOutline /><p>{language === 'zh' ? '暂无收藏，可在架构地图或技术探索中收藏实体。' : 'No favorites yet. Save entities from the map or technology explorer.'}</p></div>}</section>
      <section className="panel-card notes-editor">{selected ? <><div className="note-header"><div><span className="eyebrow">{selected.category.toUpperCase()} / PERSONAL NOTE</span><h2>{selected.name[language] || selected.name.en}</h2></div><button className="button-quiet" onClick={() => onSelect(selected.id)}>{language === 'zh' ? '查看实体' : 'View entity'}<ArrowRight size={14} /></button></div><div className="note-prompt">{language === 'zh' ? '记录学习要点、问题或后续行动。笔记仅保存在当前浏览器。' : 'Capture takeaways, questions, or follow-ups. Notes stay in this browser.'}</div><textarea className="learning-note" value={noteValue} onChange={(event) => setNoteValue(event.target.value)} placeholder={language === 'zh' ? '开始记录…' : 'Start writing…'} /><div className="note-footer"><span>{language === 'zh' ? '自动保存在本机浏览器存储' : 'Saved to local browser storage'}</span><button className="button-primary" onClick={() => onSaveNote(selected.id, noteValue)}><Check size={14} />{language === 'zh' ? '保存笔记' : 'Save note'}</button></div></> : <div className="empty-state"><div className="empty-glyph">✎</div><p>{language === 'zh' ? '选择收藏实体以编辑学习笔记。' : 'Select a favorite to write or edit your notes.'}</p></div>}</section></div>
  </div>;
}

function BookmarkOutline() { return <BookOpen size={24} />; }
