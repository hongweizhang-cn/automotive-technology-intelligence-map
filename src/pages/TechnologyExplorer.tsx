import { useEffect, useMemo, useState } from 'react';
import { ArrowUpRight, Search } from 'lucide-react';
import type { Entity, Language } from '../types';

interface Props {
  entities: Entity[];
  language: Language;
  favorites: string[];
  onFavorite: (id: string) => void;
  onSelect: (id: string) => void;
  onLearn: (id: string) => void;
  focusEntityId?: string | null;
}

const categoryLabels: Record<string, { zh: string; en: string }> = {
  technology: { zh: '软件与技术', en: 'Software & Technology' },
  standard: { zh: '标准与法规', en: 'Standards' },
  ecu: { zh: 'ECU 与功能单元', en: 'ECUs & Functional Units' },
  hardware: { zh: '芯片与硬件', en: 'Semiconductors & Hardware' },
  system: { zh: '车辆系统', en: 'Vehicle Systems' },
  network: { zh: '通信网络', en: 'Communication Networks' },
  sensor: { zh: '传感器', en: 'Sensors' },
  actuator: { zh: '执行器', en: 'Actuators' },
  company: { zh: '企业', en: 'Companies' },
};

export default function TechnologyExplorer({ entities, language, favorites, onFavorite, onSelect, onLearn, focusEntityId }: Props) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('technology');
  const [selectedId, setSelectedId] = useState('');
  useEffect(() => {
    const focused = entities.find((entity) => entity.id === focusEntityId);
    if (focused) { setCategory(focused.category); setSelectedId(focused.id); }
  }, [entities, focusEntityId]);
  const filtered = useMemo(() => entities.filter((entity) => entity.category === category
    && entity.reviewStatus === 'Approved'
    && `${entity.name.en} ${entity.name.zh} ${entity.description.en} ${entity.description.zh}`.toLocaleLowerCase().includes(query.toLocaleLowerCase())), [entities, category, query]);
  const active = entities.find((entity) => entity.id === selectedId) ?? filtered[0];
  const related = active?.relatesTo.map((id) => entities.find((entity) => entity.id === id)).filter((item): item is Entity => Boolean(item)) ?? [];
  return (
    <div className="page-content explorer-page">
      <div className="page-heading">
        <div><div className="eyebrow">KNOWLEDGE GRAPH / 02</div><h1>{language === 'zh' ? '技术探索' : 'Technology Explorer'}</h1>
          <p>{language === 'zh' ? '从核心技术出发，追踪系统、控制器、硬件与标准的关联。' : 'Trace connections from core technologies to systems, controllers, hardware, and standards.'}</p></div>
        <div className="stat-tile"><strong>{entities.filter((entity) => entity.reviewStatus === 'Approved').length}</strong><span>{language === 'zh' ? '已审核实体' : 'approved entities'}</span></div>
      </div>
      <div className="explorer-workspace">
        <section className="explorer-list panel-card">
          <div className="search-field"><Search size={16} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={language === 'zh' ? '搜索技术、协议或系统…' : 'Search technology, protocol, or system…'} /></div>
          <div className="category-pills">
            {Object.entries(categoryLabels).map(([id, names]) => <button key={id} onClick={() => { setCategory(id); setSelectedId(''); }} className={category === id ? 'selected' : ''}>{names[language]}</button>)}
          </div>
          <div className="explorer-results">
            {filtered.map((entity) => <button key={entity.id} className={`explorer-result${active?.id === entity.id ? ' active' : ''}`} onClick={() => setSelectedId(entity.id)}>
              <span className={`mini-dot node-${entity.category}`} />
              <span className="result-label">{entity.name[language] || entity.name.en}<small>{entity.id}</small></span><ArrowUpRight size={14} />
            </button>)}
            {!filtered.length && <div className="empty-state">{language === 'zh' ? '没有匹配的实体。' : 'No matching entities.'}</div>}
          </div>
        </section>
        {active ? <section className="explorer-detail panel-card">
          <div className="detail-topline"><span className={`tag tag-${active.category}`}>{categoryLabels[active.category]?.[language] ?? active.category}</span><button className={`favorite-btn small${favorites.includes(active.id) ? ' active' : ''}`} onClick={() => onFavorite(active.id)}>{favorites.includes(active.id) ? '★' : '☆'} {language === 'zh' ? '收藏' : 'Save'}</button></div>
          <h2>{active.name[language] || active.name.en}</h2><code>{active.id}</code>
          <p className="explorer-description">{active.description[language] || active.description.en}</p>
          <div className="relationship-grid">
            <div className="relationship-heading">{language === 'zh' ? '知识图谱关联' : 'Knowledge graph links'} <span>{related.length}</span></div>
            {related.map((item) => <button className="relationship-card" key={item.id} onClick={() => { setCategory(item.category); setSelectedId(item.id); onSelect(item.id); }}>
              <span className={`mini-dot node-${item.category}`} /><span><b>{item.name[language] || item.name.en}</b><small>{categoryLabels[item.category]?.[language] ?? item.category}</small></span><ArrowUpRight size={13} />
            </button>)}
            {!related.length && <div className="muted">{language === 'zh' ? '暂无关联数据。' : 'No related data.'}</div>}
          </div>
          <div className="explorer-actions"><button className="button-primary" onClick={() => onLearn(active.id)}>{language === 'zh' ? '添加学习笔记' : 'Add learning note'}</button><button className="button-quiet" onClick={() => onSelect(active.id)}>{language === 'zh' ? '查看实体详情' : 'Inspect entity'}</button></div>
        </section> : <section className="panel-card empty-state">{language === 'zh' ? '请选择一个实体。' : 'Select an entity to explore.'}</section>}
      </div>
    </div>
  );
}
