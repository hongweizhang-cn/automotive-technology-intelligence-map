import { useEffect, useMemo, useState } from 'react';
import { ArrowLeft, ArrowUpRight, Search } from 'lucide-react';
import type { Entity, EntityCategory, Language, TechnologyDomain } from '../types';
import { filterTechnologyEntities, getTechnologyRelationLinks, technologyDomains } from '../services/technologyCatalog';

interface Props {
  entities: Entity[];
  language: Language;
  favorites: string[];
  onFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onLearn: (id: string) => void;
  onOpenMap: (id: string) => void;
  focusEntityId?: string | null;
}

const categoryLabels: Record<EntityCategory, { zh: string; en: string }> = {
  technology: { zh: '核心技术', en: 'Core technologies' },
  standard: { zh: '标准与法规', en: 'Standards' },
  ecu: { zh: 'ECU 与功能单元', en: 'ECUs & Functional Units' },
  hardware: { zh: '芯片与硬件', en: 'Semiconductors & Hardware' },
  system: { zh: '车辆系统', en: 'Vehicle Systems' },
  network: { zh: '通信网络', en: 'Communication Networks' },
  sensor: { zh: '传感器', en: 'Sensors' },
  actuator: { zh: '执行器', en: 'Actuators' },
  company: { zh: '企业', en: 'Companies' },
};
const entityCategories = Object.keys(categoryLabels) as EntityCategory[];
const relationLabels: Record<string, { zh: string; en: string }> = {
  related_to: { zh: '相关（分类关联）', en: 'Related (taxonomy link)' },
  contains: { zh: '包含', en: 'Contains' }, part_of: { zh: '属于', en: 'Part of' },
  controls: { zh: '控制', en: 'Controls' }, monitors: { zh: '监测', en: 'Monitors' },
  communicates_with: { zh: '通信', en: 'Communicates with' }, connected_to: { zh: '连接', en: 'Connected to' },
  powered_by: { zh: '供能', en: 'Powered by' }, distributes_power_to: { zh: '配电至', en: 'Distributes power to' },
  depends_on: { zh: '依赖', en: 'Depends on' }, implements: { zh: '实现', en: 'Implements' },
  uses: { zh: '使用', en: 'Uses' }, integrates: { zh: '集成', en: 'Integrates' },
  transports: { zh: '承载 / 传输', en: 'Transports' }, defines: { zh: '定义', en: 'Defines' },
};
const statusLabels: Record<string, { zh: string; en: string }> = {
  Draft: { zh: '草稿', en: 'Draft' }, 'Pending Review': { zh: '待审核', en: 'Pending Review' },
  Approved: { zh: '已通过', en: 'Approved' }, Rejected: { zh: '已拒绝', en: 'Rejected' },
  Unverified: { zh: '未核实', en: 'Unverified' }, 'Pending Verification': { zh: '待核实', en: 'Pending Verification' },
  Verified: { zh: '已核实', en: 'Verified' }, High: { zh: '高', en: 'High' },
  Medium: { zh: '中', en: 'Medium' }, Low: { zh: '低', en: 'Low' },
};
type DetailField = 'definition' | 'purpose' | 'mechanism' | 'keyFeatures' | 'useCases' | 'advantages' | 'limitations';

export default function TechnologyExplorer({ entities, language, favorites, onFavorite, onSelect, onLearn, onOpenMap, focusEntityId }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<EntityCategory>('technology');
  const [domain, setDomain] = useState<TechnologyDomain | 'all'>('all');
  const [selectedId, setSelectedId] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  useEffect(() => {
    const focused = entities.find((entity) => entity.id === focusEntityId);
    if (focused) { setCategory(focused.category); setSelectedId(focused.id); setHistory([]); }
  }, [entities, focusEntityId]);

  const filtered = useMemo(() => category === 'technology'
    ? filterTechnologyEntities(entities, query, domain, language)
    : entities.filter((entity) => entity.category === category && entity.reviewStatus !== 'Rejected'
      && `${entity.id} ${entity.name.en} ${entity.name.zh} ${entity.description.en} ${entity.description.zh}`.toLocaleLowerCase().includes(query.trim().toLocaleLowerCase())),
  [entities, query, category, domain, language]);
  const active = filtered.find((entity) => entity.id === selectedId) ?? filtered[0];
  const approvedCount = entities.filter((entity) => entity.category === 'technology' && entity.reviewStatus === 'Approved').length;
  const linksFor = (id: string) => {
    const entity = entities.find((item) => item.id === id);
    return entity ? getTechnologyRelationLinks(entity, entities) : [];
  };
  useEffect(() => { setExpandedIds(active ? [active.id] : []); }, [active?.id]);

  const choose = (entity: Entity, pushHistory = true) => {
    if (pushHistory && active && active.id !== entity.id) setHistory((items) => [...items, active.id]);
    setCategory(entity.category);
    setSelectedId(entity.id);
  };
  const goBack = () => {
    const id = history.at(-1);
    const entity = entities.find((item) => item.id === id);
    if (!entity) { setHistory([]); return; }
    setHistory((items) => items.slice(0, -1));
    setCategory(entity.category);
    setSelectedId(entity.id);
  };
  const visibleIds = new Set([...(active ? [active.id] : []), ...expandedIds.flatMap((id) => linksFor(id).map((link) => link.entity.id))]);
  const detailFields: Array<[DetailField, string, string]> = [
    ['definition', '定义', 'Definition'], ['purpose', '主要用途', 'Purpose'], ['mechanism', '工作原理', 'How it works'],
    ['keyFeatures', '关键技术特性', 'Key characteristics'], ['useCases', '典型应用场景', 'Typical use cases'],
    ['advantages', '优势', 'Advantages'], ['limitations', '局限', 'Limitations'],
  ];

  return (
    <div className="page-content explorer-page">
      <div className="page-heading">
        <div><div className="eyebrow">KNOWLEDGE GRAPH / 02</div><h1>{t('技术探索', 'Technology Explorer')}</h1>
          <p>{t('按技术体系浏览知识，沿明确记录的关系逐层探索。缺少可靠资料时保留为空。', 'Browse engineering domains and explore recorded links one layer at a time. Unsupported details remain blank.')}</p></div>
        <div className="stat-tile"><strong>{approvedCount}</strong><span>{t('已审核技术', 'approved technologies')}</span></div>
      </div>
      <div className="explorer-workspace">
        <section className="explorer-list panel-card">
          <div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('搜索中英文技术名称、ID 或说明…', 'Search bilingual names, IDs, or descriptions…')} /></div>
          <div className="category-pills">
            {entityCategories.map((item) => <button key={item} onClick={() => { setCategory(item); setSelectedId(''); setHistory([]); setDomain('all'); }}
              className={category === item ? 'selected' : ''}>{categoryLabels[item][language]}</button>)}
          </div>
          {category === 'technology' && <div className="category-pills technology-domain-filters" aria-label={t('技术分类', 'Technology domains')}>
            <button className={domain === 'all' ? 'selected' : ''} onClick={() => setDomain('all')}>{t('全部技术体系', 'All domains')}</button>
            {technologyDomains.map((item) => <button key={item.id} className={domain === item.id ? 'selected' : ''} onClick={() => setDomain(item.id)}>{item.label[language]}</button>)}
          </div>}
          <div className="explorer-results">
            {filtered.map((entity) => <button key={entity.id} className={`explorer-result${active?.id === entity.id ? ' active' : ''}`} onClick={() => choose(entity)}>
              <span className={`mini-dot node-${entity.category}`} />
              <span className="result-label">{entity.name[language] || entity.name.en}<small>{entity.id} · {statusLabels[entity.reviewStatus]?.[language] ?? entity.reviewStatus}</small></span><ArrowUpRight size={14} />
            </button>)}
            {!filtered.length && <div className="empty-state">{t('没有匹配的实体。', 'No matching entities.')}</div>}
          </div>
        </section>
        {active ? <section className="explorer-detail panel-card">
          <div className="explorer-detail-nav">
            <button className="button-quiet" onClick={goBack} disabled={!history.length}><ArrowLeft size={14} />{t('返回上一层', 'Back')}</button>
            <span>{categoryLabels[active.category][language]}</span>
          </div>
          <div className="detail-topline">
            <span className={`tag tag-${active.category}`}>{categoryLabels[active.category][language]}</span>
            <button className={`favorite-btn small${favorites.includes(active.id) ? ' active' : ''}`} onClick={() => onFavorite(active.id)}>{favorites.includes(active.id) ? '★' : '☆'} {t('收藏', 'Save')}</button>
          </div>
          <h2>{active.name[language] || active.name.en}</h2><code>{active.id}</code>
          <p className="explorer-description">{active.description[language] || active.description.en || t('未录入。', 'Not recorded.')}</p>
          <div className="entity-status-summary">
            <span>{t('内容审核', 'Content review')}: {statusLabels[active.reviewStatus]?.[language] ?? active.reviewStatus}</span>
            <span>{t('来源核实', 'Source verification')}: {statusLabels[active.verificationStatus ?? 'Unverified'][language]}</span>
            <span>{t('可信度', 'Confidence')}: {statusLabels[active.confidence]?.[language] ?? active.confidence}</span>
          </div>
          {active.technologyDetails && <>
            <section className="explorer-meta-section">
              <h3>{t('技术体系与层级', 'Technology hierarchy')}</h3>
              <dl className="technology-field-list">
                <div><dt>{t('分类', 'Domain')}</dt><dd>{technologyDomains.find((item) => item.id === active.technologyDetails?.domain)?.label[language] ?? t('未录入', 'Not recorded')}</dd></div>
                <div><dt>{t('子分类', 'Subdomain')}</dt><dd>{active.technologyDetails.subdomain?.[language] || t('未录入', 'Not recorded')}</dd></div>
                <div><dt>{t('协议层级 / 所属体系', 'Layer / system')}</dt><dd>{active.technologyDetails.layer?.[language] || t('未录入', 'Not recorded')}</dd></div>
                <div><dt>{t('适用架构', 'Applicable architectures')}</dt><dd>{active.technologyDetails.applicableArchitectures?.join(', ') || active.appliesTo?.join(', ') || t('未录入', 'Not recorded')}</dd></div>
              </dl>
            </section>
            <section className="technology-description-grid">
              {detailFields.map(([key, zh, en]) => {
                const value = active.technologyDetails?.[key]?.[language];
                return <div key={key}><h3>{t(zh, en)}</h3><p>{value || t('未录入。', 'Not recorded.')}</p></div>;
              })}
            </section>
          </>}
          <section className="explorer-meta-section">
            <h3>{t('关联实体', 'Related entities')}</h3>
            <div className="relationship-grid">
              {linksFor(active.id).filter((link) => link.entity.reviewStatus !== 'Rejected').map((link) => <button className="relationship-card" key={`${link.entity.id}-${link.direction}-${link.type}`} onClick={() => {
                if (['system', 'ecu', 'network'].includes(link.entity.category)) onSelect(link.entity.id);
                else choose(link.entity);
              }}>
                <span className={`mini-dot node-${link.entity.category}`} /><span><b>{link.entity.name[language] || link.entity.name.en}</b>
                  <small>{categoryLabels[link.entity.category][language]}</small>
                  <small>{link.direction === 'incoming' ? '← ' : '→ '}{relationLabels[link.type]?.[language] ?? link.type}{link.description[language] ? ` · ${link.description[language]}` : ''}</small>
                </span><ArrowUpRight size={13} />
              </button>)}
              {!linksFor(active.id).length && <div className="muted">{t('暂无关联数据。', 'No relationships recorded.')}</div>}
            </div>
          </section>
          <section className="explorer-meta-section technology-graph-explorer">
            <div className="relationship-heading">{t('逐层关系探索', 'Layered relationship explorer')} <span>{visibleIds.size}</span></div>
            <p className="muted">{t('默认展示一层；仅在你主动展开后继续加载关联节点。', 'One layer is shown by default. Expand a node to reveal its next layer.')}</p>
            {expandedIds.filter((id) => visibleIds.has(id)).map((rootId) => {
              const root = entities.find((item) => item.id === rootId);
              if (!root) return null;
              const children = linksFor(rootId).filter((link) => visibleIds.has(link.entity.id) && link.entity.reviewStatus !== 'Rejected');
              const expanded = expandedIds.includes(rootId);
              return <div className="technology-graph-branch" key={rootId}>
                <div className={`technology-graph-node${active.id === rootId ? ' active' : ''}`}>
                  <button onClick={() => choose(root)}>{root.name[language] || root.name.en}</button>
                  <button className="text-button" onClick={() => setExpandedIds((current) => expanded ? current.filter((id) => id !== rootId) : [...current, rootId])}>
                    {expanded ? t('收起一层', 'Collapse layer') : t('展开一层', 'Expand layer')}
                  </button>
                </div>
                {expanded && <div className="technology-graph-children">{children.map((link) => <button key={`${link.entity.id}-${link.direction}-${link.type}`} className={active.id === link.entity.id ? 'active' : ''} onClick={() => choose(link.entity)}>
                  <span>{link.direction === 'incoming' ? '←' : '→'} {relationLabels[link.type]?.[language] ?? link.type}</span><b>{link.entity.name[language] || link.entity.name.en}</b>
                </button>)}</div>}
              </div>;
            })}
            {Array.from(visibleIds).filter((id) => !expandedIds.includes(id)).map((id) => {
              const entity = entities.find((item) => item.id === id);
              return entity && linksFor(id).length > 0 ? <button className="button-quiet" key={`expand-${id}`} onClick={() => setExpandedIds((items) => [...items, id])}>{t('展开', 'Expand')}: {entity.name[language] || entity.name.en}</button> : null;
            })}
          </section>
          <section className="explorer-meta-section explorer-sources">
            <h3>{t('来源与核实', 'Sources and verification')}</h3>
            {active.sources?.length ? active.sources.map((source) => <div className="explorer-source" key={source.id}>
              <b>{source.title[language] || source.title.en || source.title.zh || t('来源标题未录入', 'Untitled source')}</b>
              <small>{source.publisher ? `${source.publisher} · ` : ''}{source.type}{source.publicationDate ? ` · ${source.publicationDate}` : ''}{source.accessedAt ? ` · ${t('访问', 'accessed')} ${new Date(source.accessedAt).toLocaleDateString(language)}` : ''}</small>
              {source.url && <a href={source.url} target="_blank" rel="noreferrer">{source.url}</a>}
              {source.note?.[language] && <small>{source.note[language]}</small>}
            </div>) : <p className="muted">{t('未录入来源；来源核实状态仍为未核实。', 'No source recorded; verification remains unverified.')}</p>}
          </section>
          <div className="explorer-actions">
            <button className="button-primary" onClick={() => onLearn(active.id)}>{t('添加学习笔记', 'Add learning note')}</button>
            <button className="button-quiet" onClick={() => onSelect(active.id)}>{t('查看实体详情', 'Inspect entity')}</button>
            <button className="button-quiet" onClick={() => onOpenMap(active.id)}>{t('在整车架构图中查看', 'Open in vehicle map')}</button>
          </div>
        </section> : <section className="panel-card empty-state">{t('请选择一个实体。', 'Select an entity to explore.')}</section>}
      </div>
    </div>
  );
}
