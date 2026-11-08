import { useMemo, useRef, useState } from 'react';
import { Check, Download, FileUp, History, Plus, Search, Trash2, X } from 'lucide-react';
import type { AppData, Architecture, ChangeRecord, Entity, EntityCategory, EntityRelation, EvidenceSource, Propulsion, RelationType, ReviewStatus, VerificationStatus } from '../types';
import { validateImport } from '../services/dataService';

interface Props {
  data: AppData;
  history: ChangeRecord[];
  language: 'zh' | 'en';
  onSave: (before: Entity | null, after: Entity) => boolean;
  onDelete: (entity: Entity) => boolean;
  onImport: (data: AppData) => boolean;
  onSaveArchitecture: (before: Architecture | null, after: Architecture) => boolean;
  onDeleteArchitecture: (architecture: Architecture) => boolean;
}

const categories: EntityCategory[] = ['system', 'ecu', 'sensor', 'actuator', 'hardware', 'network', 'technology', 'standard', 'company'];
const statuses: ReviewStatus[] = ['Draft', 'Pending Review', 'Approved', 'Rejected'];
const relationTypes: RelationType[] = ['related_to', 'contains', 'part_of', 'controls', 'monitors', 'communicates_with', 'connected_to', 'powered_by', 'distributes_power_to', 'depends_on', 'implements', 'uses', 'integrates'];
const verificationStatuses: VerificationStatus[] = ['Unverified', 'Pending Verification', 'Verified'];
const toLocalDateTime = (value?: string) => {
  const date = value ? new Date(value) : undefined;
  return date && Number.isFinite(date.getTime()) ? date.toISOString().slice(0, 16) : '';
};
const blankEntity = (): Entity => ({
  id: '', category: 'technology', name: { zh: '', en: '' }, description: { zh: '', en: '' }, relatesTo: [],
  relations: [], sources: [], verificationStatus: 'Unverified',
  confidence: 'Unverified', reviewStatus: 'Draft', createdBy: 'Human', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
});

export default function DataManagement({ data, history, language, onSave, onDelete, onImport, onSaveArchitecture, onDeleteArchitecture }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('all');
  const [editing, setEditing] = useState<Entity | null>(null);
  const [isNew, setIsNew] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [mode, setMode] = useState<'entities' | 'architectures'>('entities');
  const [error, setError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const filtered = useMemo(() => data.entities.filter((entity) => {
    const matchesText = `${entity.id} ${entity.name.zh} ${entity.name.en}`.toLocaleLowerCase().includes(query.toLocaleLowerCase());
    return matchesText && (filter === 'all' || entity.category === filter || entity.reviewStatus === filter);
  }), [data.entities, filter, query]);

  const startNew = () => { setEditing(blankEntity()); setIsNew(true); setError(''); };
  const startEdit = (entity: Entity) => { setEditing({ ...entity, name: { ...entity.name }, description: { ...entity.description }, relatesTo: [...entity.relatesTo] }); setIsNew(false); setError(''); };
  const updateText = (key: 'name' | 'description', locale: 'zh' | 'en', value: string) => {
    setEditing((current) => current ? { ...current, [key]: { ...current[key], [locale]: value } } : current);
  };
  const updateRelation = (index: number, patch: Partial<EntityRelation>) => {
    setEditing((current) => {
      if (!current) return current;
      const relations = [...(current.relations ?? [])];
      relations[index] = { ...relations[index], ...patch };
      return { ...current, relations, relatesTo: Array.from(new Set(relations.map((relation) => relation.targetId))) };
    });
  };
  const updateSource = (index: number, patch: Partial<EvidenceSource>) => {
    setEditing((current) => {
      if (!current) return current;
      const sources = [...(current.sources ?? [])];
      sources[index] = { ...sources[index], ...patch };
      return { ...current, sources };
    });
  };
  const addRelation = () => setEditing((current) => {
    if (!current) return current;
    const target = data.entities.find((item) => item.id !== current.id
      && !current.relatesTo.includes(item.id)
      && !(current.relations ?? []).some((link) => link.targetId === item.id));
    if (!target) return current;
    const relation: EntityRelation = { targetId: target.id, type: 'related_to', description: { zh: '', en: '' } };
    const relations = [...(current.relations ?? []), relation];
    return { ...current, relations, relatesTo: Array.from(new Set([...current.relatesTo, target.id])) };
  });
  const addSource = () => setEditing((current) => current ? {
    ...current,
    sources: [...(current.sources ?? []), {
      id: `${current.id || 'source'}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      title: { zh: '', en: '' }, type: 'Official documentation',
    }],
  } : current);
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const firstSource = editing.sources?.[0];
    const entity = {
      ...editing, id: editing.id.trim(), updatedAt: new Date().toISOString(),
      sourceUrl: firstSource?.url || undefined,
      sourceTitle: firstSource ? firstSource.title.en || firstSource.title.zh : undefined,
      sourceType: firstSource?.type,
      retrievedAt: firstSource?.accessedAt,
    };
    if (!/^[a-z0-9][a-z0-9-]*$/.test(entity.id)) { setError(t('ID 仅允许小写字母、数字和连字符。', 'ID must use lowercase letters, numbers, and hyphens.')); return; }
    if (!entity.name.zh.trim() || !entity.name.en.trim()) { setError(t('请填写中英文名称。', 'Provide both Chinese and English names.')); return; }
    if (entity.sourceUrl && !/^https?:\/\//i.test(entity.sourceUrl)) { setError(t('来源 URL 必须以 http:// 或 https:// 开头。', 'Source URL must start with http:// or https://.')); return; }
    if (entity.relations?.some((relation) => relation.targetId === entity.id)) { setError(t('实体不能关联自身。', 'An entity cannot be related to itself.')); return; }
    if (entity.sources?.some((source) => source.url && !/^https?:\/\//i.test(source.url))) { setError(t('来源 URL 必须以 http:// 或 https:// 开头。', 'Source URLs must start with http:// or https://.')); return; }
    if (entity.sources?.some((source) => !source.title.zh.trim() && !source.title.en.trim() || !source.type.trim())) { setError(t('每条来源必须填写至少一种语言的标题和来源类型。', 'Each source needs a title in at least one language and a source type.')); return; }
    if (entity.createdBy === 'Agent' && entity.reviewStatus === 'Approved') { setError(t('Agent 创建的记录不能直接标记为审核通过。', 'Agent-created records cannot be approved directly.')); return; }
    if (isNew && data.entities.some((item) => item.id === entity.id)) { setError(t('ID 已存在。', 'ID already exists.')); return; }
    const validIds = new Set(data.entities.map((item) => item.id));
    const missing = (entity.relations ?? []).map((relation) => relation.targetId).filter((id) => id !== entity.id && !validIds.has(id));
    if (missing.length) { setError(`${t('找不到关联实体：', 'Unknown related entity IDs: ')}${missing.join(', ')}`); return; }
    if (entity.appliesTo?.some((id) => !propulsionOptions.includes(id))) { setError(t('适用动力类型必须为有效类型代码。', 'Provide valid propulsion type codes.')); return; }
    if (onSave(isNew ? null : data.entities.find((item) => item.id === entity.id) ?? null, entity)) {
      setEditing(null); setError('');
    }
  };

  const exportJson = () => {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = 'automotive-technology-map.json'; anchor.click();
      URL.revokeObjectURL(url);
    } catch (reason) { setError(`${t('导出失败：', 'Export failed: ')}${String(reason)}`); }
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      const parsed: unknown = JSON.parse(await file.text());
      const validated = validateImport(parsed);
      if (!onImport(validated)) throw new Error(t('无法保存导入数据，请检查浏览器存储空间。', 'Could not save imported data. Check browser storage availability.'));
      setError('');
    } catch (reason) {
      setError(`${t('导入失败：', 'Import failed: ')}${reason instanceof Error ? reason.message : String(reason)}`);
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <div className="page-content data-page">
      <div className="page-heading">
        <div><div className="eyebrow">KNOWLEDGE OPERATIONS / 06</div><h1>{t('数据管理', 'Data Management')}</h1>
          <p>{t('维护本地知识库、审核状态与实体关联。导入前会校验数据并整体替换。', 'Maintain the local knowledge base, review status, and entity links. Imports are validated before replacing data.')}</p></div>
        <div className="data-toolbar"><button className="button-secondary" onClick={() => setShowHistory((value) => !value)}><History size={15} />{t('修改历史', 'Change history')}</button>
          <button className="button-secondary" onClick={exportJson}><Download size={15} />{t('导出 JSON', 'Export JSON')}</button>
          <button className="button-secondary" onClick={() => fileRef.current?.click()}><FileUp size={15} />{t('导入 JSON', 'Import JSON')}</button>
          <input ref={fileRef} type="file" accept=".json,application/json" hidden onChange={(event) => void importJson(event.target.files?.[0])} />
        </div>
      </div>
      <div className="management-tabs">
        <button className={mode === 'entities' ? 'active' : ''} onClick={() => { setMode('entities'); setShowHistory(false); }}>{language === 'zh' ? '实体' : 'Entities'} <span>{data.entities.length}</span></button>
        <button className={mode === 'architectures' ? 'active' : ''} onClick={() => { setMode('architectures'); setShowHistory(false); }}>{language === 'zh' ? '车辆架构' : 'Vehicle architectures'} <span>{data.architectures.length}</span></button>
      </div>
      {error && <div className="notice error-notice"><span>{error}</span><button className="icon-btn" onClick={() => setError('')}><X size={15} /></button></div>}
      {mode === 'architectures' ? <ArchitectureManagement data={data} language={language} onSave={onSaveArchitecture} onDelete={onDeleteArchitecture} /> : <>
      {showHistory ? <section className="panel-card history-panel"><div className="section-title"><h2>{t('修改历史', 'Change history')}</h2><span>{history.length} {t('条记录', 'records')}</span></div>
        {history.length ? <div className="table-scroll"><table><thead><tr><th>{t('时间', 'Timestamp')}</th><th>{t('实体', 'Entity')}</th><th>{t('操作', 'Action')}</th><th>{t('修改者', 'Changed by')}</th></tr></thead>
          <tbody>{history.map((record) => <tr key={record.id}><td>{new Date(record.changedAt).toLocaleString(language)}</td><td>{record.entityName}<small>{record.entityId}</small></td>
            <td><span className={`status-pill status-${record.after ? record.before ? 'edited' : 'created' : 'deleted'}`}>{record.after ? record.before ? t('已更新', 'Updated') : t('已创建', 'Created') : t('已删除', 'Deleted')}</span></td><td>{record.changedBy}</td></tr>)}</tbody></table></div>
          : <div className="empty-state">{t('暂无修改记录。', 'No changes recorded yet.')}</div>}</section>
        : <div className="data-workspace">
          <section className="panel-card entity-table-panel">
            <div className="entity-list-header"><div className="search-field"><Search size={15} /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={t('搜索名称或 ID…', 'Search name or ID…')} /></div>
              <button className="button-primary" onClick={startNew}><Plus size={15} />{t('新增实体', 'Add entity')}</button></div>
            <div className="filter-row"><span>{t('筛选', 'Filter')}</span><select value={filter} onChange={(event) => setFilter(event.target.value)}><option value="all">{t('全部类型与状态', 'All types & statuses')}</option>
              {categories.map((category) => <option value={category} key={category}>{category}</option>)}{statuses.map((status) => <option value={status} key={status}>{status}</option>)}</select>
              <span className="result-count">{filtered.length} / {data.entities.length}</span></div>
            <div className="table-scroll entity-table-wrap"><table className="entity-table"><thead><tr><th>{t('实体', 'Entity')}</th><th>{t('类型', 'Type')}</th><th>{t('审核状态', 'Review status')}</th><th>{t('编辑', 'Edit')}</th></tr></thead>
              <tbody>{filtered.map((entity) => <tr key={entity.id} className={editing?.id === entity.id ? 'row-selected' : ''}>
                <td><strong>{entity.name[language] || entity.name.en}</strong><small>{entity.id}</small></td><td><span className={`tag tag-${entity.category}`}>{entity.category}</span></td>
                <td><span className={`status-pill status-${entity.reviewStatus.toLowerCase().replace(' ', '-')}`}>{entity.reviewStatus}</span></td>
                <td><button className="text-button" onClick={() => startEdit(entity)}>{t('编辑', 'Edit')}</button></td></tr>)}
              {!filtered.length && <tr><td colSpan={4} className="empty-state">{t('没有找到实体。', 'No entities found.')}</td></tr>}</tbody></table></div>
          </section>
          {editing ? <section className="panel-card entity-editor">
            <div className="section-title"><h2>{isNew ? t('新增实体', 'New entity') : t('编辑实体', 'Edit entity')}</h2><button className="icon-btn" onClick={() => setEditing(null)}><X size={16} /></button></div>
            <form onSubmit={submit}>
              <label>{t('ID', 'ID')}<input value={editing.id} disabled={!isNew} onChange={(event) => setEditing({ ...editing, id: event.target.value })} placeholder="ecu-example" /></label>
              <label>{t('实体类型', 'Entity type')}<select value={editing.category} onChange={(event) => setEditing({ ...editing, category: event.target.value as EntityCategory })}>{categories.map((item) => <option value={item} key={item}>{item}</option>)}</select></label>
              <div className="form-grid"><label>{t('中文名称', 'Name (Chinese)')}<input value={editing.name.zh} onChange={(event) => updateText('name', 'zh', event.target.value)} /></label>
                <label>{t('英文名称', 'Name (English)')}<input value={editing.name.en} onChange={(event) => updateText('name', 'en', event.target.value)} /></label></div>
              <div className="form-grid"><label>{t('中文说明', 'Description (Chinese)')}<textarea rows={3} value={editing.description.zh} onChange={(event) => updateText('description', 'zh', event.target.value)} /></label>
                <label>{t('英文说明', 'Description (English)')}<textarea rows={3} value={editing.description.en} onChange={(event) => updateText('description', 'en', event.target.value)} /></label></div>
              <div className="section-title"><h3>{t('具类型关系', 'Typed relationships')}</h3><button type="button" className="button-secondary" onClick={addRelation}><Plus size={14} />{t('添加关系', 'Add relationship')}</button></div>
              {(editing.relations ?? []).map((relation, index) => <div className="panel-card relation-editor" key={`${relation.targetId}-${index}`}>
                <div className="form-grid">
                  <label>{t('目标实体', 'Target entity')}<select value={relation.targetId} onChange={(event) => updateRelation(index, { targetId: event.target.value })}>
                    {data.entities.filter((item) => item.id !== editing.id).map((item) => <option key={item.id} value={item.id}>{item.name[language]} ({item.id})</option>)}
                  </select></label>
                  <label>{t('关系类型（由当前实体指向目标）', 'Relationship (from this entity to target)')}<select value={relation.type} onChange={(event) => updateRelation(index, { type: event.target.value as RelationType })}>
                    {relationTypes.map((type) => <option key={type}>{type}</option>)}
                  </select></label>
                </div>
                <div className="form-grid"><label>{t('关系说明（中文）', 'Relationship note (Chinese)')}<input value={relation.description.zh} onChange={(event) => updateRelation(index, { description: { ...relation.description, zh: event.target.value } })} /></label>
                  <label>{t('关系说明（英文）', 'Relationship note (English)')}<input value={relation.description.en} onChange={(event) => updateRelation(index, { description: { ...relation.description, en: event.target.value } })} /></label></div>
                <button type="button" className="button-quiet" onClick={() => setEditing({ ...editing, relations: (editing.relations ?? []).filter((_, itemIndex) => itemIndex !== index), relatesTo: (editing.relations ?? []).filter((_, itemIndex) => itemIndex !== index).map((item) => item.targetId) })}>{t('移除此关系', 'Remove relationship')}</button>
              </div>)}
              <label>{language === 'zh' ? '适用动力类型（逗号分隔，留空表示通用）' : 'Applicable propulsion types (comma separated; blank means shared)'}<input value={editing.appliesTo?.join(', ') ?? ''} onChange={(event) => setEditing({ ...editing, appliesTo: event.target.value.trim() ? event.target.value.split(',').map((item) => item.trim().toUpperCase() as Propulsion) : undefined })} placeholder="BEV, PHEV" /></label>
              <div className="section-title"><h3>{t('证据来源', 'Evidence sources')}</h3><button type="button" className="button-secondary" onClick={addSource}><Plus size={14} />{t('添加来源', 'Add source')}</button></div>
              {(editing.sources ?? []).map((source, index) => <div className="panel-card source-editor" key={source.id}>
                <div className="form-grid"><label>{t('来源标题（中文）', 'Source title (Chinese)')}<input value={source.title.zh} onChange={(event) => updateSource(index, { title: { ...source.title, zh: event.target.value } })} /></label>
                  <label>{t('来源标题（英文）', 'Source title (English)')}<input value={source.title.en} onChange={(event) => updateSource(index, { title: { ...source.title, en: event.target.value } })} /></label></div>
                <label>{t('来源 URL', 'Source URL')}<input type="url" value={source.url ?? ''} onChange={(event) => updateSource(index, { url: event.target.value || undefined })} placeholder="https://" /></label>
                <div className="form-grid"><label>{t('来源类型', 'Source type')}<input value={source.type} onChange={(event) => updateSource(index, { type: event.target.value })} placeholder="Standard / Official documentation" /></label>
                  <label>{t('发布机构', 'Publisher')}<input value={source.publisher ?? ''} onChange={(event) => updateSource(index, { publisher: event.target.value || undefined })} /></label></div>
                <label>{t('获取时间', 'Accessed at')}<input type="datetime-local" value={toLocalDateTime(source.accessedAt)} onChange={(event) => updateSource(index, { accessedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined })} /></label>
                <label>{t('证据说明（中文）', 'Evidence note (Chinese)')}<input value={source.note?.zh ?? ''} onChange={(event) => updateSource(index, { note: { zh: event.target.value, en: source.note?.en ?? '' } })} /></label>
                <label>{t('证据说明（英文）', 'Evidence note (English)')}<input value={source.note?.en ?? ''} onChange={(event) => updateSource(index, { note: { zh: source.note?.zh ?? '', en: event.target.value } })} /></label>
                <button type="button" className="button-quiet" onClick={() => setEditing({ ...editing, sources: (editing.sources ?? []).filter((_, itemIndex) => itemIndex !== index) })}>{t('移除此来源', 'Remove source')}</button>
              </div>)}
              {!(editing.sources ?? []).length && <p className="muted">{t('尚无证据来源。审核通过不等同于来源已核实。', 'No evidence sources recorded. Review approval does not mean sources are verified.')}</p>}
              {editing.category === 'company' && <label>{language === 'zh' ? '企业类别' : 'Company type'}<input value={editing.companyType ?? ''} onChange={(event) => setEditing({ ...editing, companyType: event.target.value })} placeholder="OEM / Tier 1 Supplier" /></label>}
              <label>{t('创建者', 'Created by')}<select value={editing.createdBy} onChange={(event) => setEditing({ ...editing, createdBy: event.target.value as Entity['createdBy'] })}><option>Human</option><option>Agent</option></select></label>
              <div className="form-grid"><label>{t('可信度', 'Confidence')}<select value={editing.confidence} onChange={(event) => setEditing({ ...editing, confidence: event.target.value as Entity['confidence'] })}>{['High', 'Medium', 'Low', 'Unverified'].map((value) => <option key={value}>{value}</option>)}</select></label>
                <label>{t('内容审核状态', 'Content review status')}<select value={editing.reviewStatus} onChange={(event) => setEditing({ ...editing, reviewStatus: event.target.value as ReviewStatus })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></div>
              <label>{t('来源核实状态（独立于内容审核）', 'Source verification (independent of content review)')}<select value={editing.verificationStatus ?? 'Unverified'} onChange={(event) => setEditing({ ...editing, verificationStatus: event.target.value as VerificationStatus })}>{verificationStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
              {error && <div className="inline-error">{error}</div>}
              <div className="editor-actions"><button type="submit" className="button-primary"><Check size={15} />{t('保存修改', 'Save changes')}</button>
                {!isNew && <button type="button" className="button-danger" onClick={() => {
                  const referrers = data.entities.filter((item) => item.id !== editing.id && item.relatesTo.includes(editing.id));
                  if (referrers.length) { setError(`${t('无法删除：该实体被以下记录引用：', 'Cannot delete: this entity is referenced by ')}${referrers.slice(0, 5).map((item) => item.id).join(', ')}`); return; }
                  const architectureRefs = data.architectures.filter((item) => item.systemIds.includes(editing.id) || item.ecuIds.includes(editing.id));
                  if (architectureRefs.length) { setError(`${t('无法删除：该实体被车辆架构引用：', 'Cannot delete: this entity is referenced by architectures: ')}${architectureRefs.map((item) => item.id).join(', ')}`); return; }
                  if (window.confirm(t('确定删除此实体？', 'Delete this entity?')) && onDelete(editing)) setEditing(null);
                }}><Trash2 size={14} />{t('删除', 'Delete')}</button>}
                <button type="button" className="button-quiet" onClick={() => setEditing(null)}>{t('取消', 'Cancel')}</button></div>
            </form>
          </section> : <section className="panel-card editor-placeholder"><div className="empty-glyph">✳</div><h3>{t('维护可信赖的知识图谱', 'Maintain a trusted knowledge graph')}</h3><p>{t('选择一个实体进行编辑，或新增技术条目。数据变更会同步至架构地图。', 'Select an entity to edit or add a new record. Changes sync to the architecture map.')}</p></section>}
        </div>}
      </>}
    </div>
  );
}

const propulsionOptions: Propulsion[] = ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'];
const blankArchitecture = (): Architecture => ({
  id: '', propulsion: 'BEV', name: { zh: '', en: '' }, topology: { zh: '', en: '' },
  eeArchitecture: 'Domain', systemIds: [], ecuIds: [], confidence: 'Unverified',
  reviewStatus: 'Draft', createdBy: 'Human', createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  sources: [], verificationStatus: 'Unverified',
});

function ArchitectureManagement({ data, language, onSave, onDelete }: {
  data: AppData;
  language: 'zh' | 'en';
  onSave: (before: Architecture | null, after: Architecture) => boolean;
  onDelete: (architecture: Architecture) => boolean;
}) {
  const [editing, setEditing] = useState<Architecture | null>(null);
  const [original, setOriginal] = useState<Architecture | null>(null);
  const [error, setError] = useState('');
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const systems = data.entities.filter((entity) => entity.category === 'system');
  const ecus = data.entities.filter((entity) => entity.category === 'ecu' && (!entity.appliesTo || entity.appliesTo.includes(editing?.propulsion ?? 'BEV')));
  const startEdit = (architecture: Architecture) => { setEditing({ ...architecture, name: { ...architecture.name }, topology: { ...architecture.topology }, systemIds: [...architecture.systemIds], ecuIds: [...architecture.ecuIds], sources: architecture.sources?.map((source) => ({ ...source, title: { ...source.title }, note: source.note ? { ...source.note } : undefined })) ?? [] }); setOriginal(architecture); setError(''); };
  const startNew = () => { setEditing(blankArchitecture()); setOriginal(null); setError(''); };
  const setLocalized = (field: 'name' | 'topology', locale: 'zh' | 'en', value: string) => {
    setEditing((current) => current ? { ...current, [field]: { ...current[field], [locale]: value } } : current);
  };
  const toggleId = (key: 'systemIds' | 'ecuIds', id: string) => {
    setEditing((current) => current ? { ...current, [key]: current[key].includes(id) ? current[key].filter((value) => value !== id) : [...current[key], id] } : current);
  };
  const save = (event: React.FormEvent) => {
    event.preventDefault();
    if (!editing) return;
    const firstSource = editing.sources?.[0];
    const architecture = {
      ...editing, id: editing.id.trim(), updatedAt: new Date().toISOString(),
      sourceUrl: firstSource?.url || undefined,
      sourceTitle: firstSource ? firstSource.title.en || firstSource.title.zh : undefined,
    };
    if (!/^[a-z0-9][a-z0-9-]*$/.test(architecture.id)) { setError(t('ID 仅允许小写字母、数字和连字符。', 'ID must use lowercase letters, numbers, and hyphens.')); return; }
    if (!architecture.name.zh.trim() || !architecture.name.en.trim() || !architecture.topology.zh.trim() || !architecture.topology.en.trim()) {
      setError(t('请填写中英文架构名称与动力拓扑说明。', 'Provide Chinese and English architecture names and topology descriptions.')); return;
    }
    if (architecture.sourceUrl && !/^https?:\/\//i.test(architecture.sourceUrl)) { setError(t('来源 URL 必须以 http:// 或 https:// 开头。', 'Source URL must start with http:// or https://.')); return; }
    if (architecture.sources?.some((source) => source.url && !/^https?:\/\//i.test(source.url))) { setError(t('来源 URL 必须以 http:// 或 https:// 开头。', 'Source URLs must start with http:// or https://.')); return; }
    if (architecture.sources?.some((source) => !source.title.zh.trim() && !source.title.en.trim() || !source.type.trim())) { setError(t('每条来源必须填写至少一种语言的标题和来源类型。', 'Each source needs a title in at least one language and a source type.')); return; }
    if (architecture.createdBy === 'Agent' && architecture.reviewStatus === 'Approved') { setError(t('Agent 创建的架构不能直接标记为审核通过。', 'Agent-created architectures cannot be approved directly.')); return; }
    if (!architecture.systemIds.length) { setError(t('至少选择一个车辆系统。', 'Select at least one vehicle system.')); return; }
    if (data.architectures.some((item) => item.id === architecture.id && item.id !== original?.id)) { setError(t('架构 ID 已存在。', 'Architecture ID already exists.')); return; }
    if (original?.reviewStatus === 'Approved' && (architecture.reviewStatus !== 'Approved' || architecture.propulsion !== original.propulsion)
      && !data.architectures.some((item) => item.id !== original.id && item.propulsion === original.propulsion && item.reviewStatus === 'Approved')) {
      setError(t('每种动力类型必须保留一个已审核架构。', 'Keep at least one approved architecture for each propulsion type.')); return;
    }
    const invalidSystems = architecture.systemIds.filter((id) => {
      const entity = data.entities.find((item) => item.id === id);
      return !entity || entity.category !== 'system' || entity.appliesTo && !entity.appliesTo.includes(architecture.propulsion);
    });
    const invalidEcus = architecture.ecuIds.filter((id) => {
      const entity = data.entities.find((item) => item.id === id);
      return !entity || entity.category !== 'ecu' || entity.appliesTo && !entity.appliesTo.includes(architecture.propulsion);
    });
    if (invalidSystems.length || invalidEcus.length) { setError(t('所选系统或 ECU 与动力类型不兼容。', 'Selected systems or ECUs are incompatible with this propulsion type.')); return; }
    if (!onSave(original, architecture)) return;
    setEditing(architecture); setOriginal(architecture); setError('');
  };
  const remove = () => {
    if (!editing || !original) return;
    if (data.architectures.filter((item) => item.propulsion === editing.propulsion).length <= 1) {
      setError(t('每种动力类型至少保留一个参考架构。', 'Keep at least one architecture for each propulsion type.')); return;
    }
    if (editing.reviewStatus === 'Approved' && !data.architectures.some((item) => item.id !== editing.id && item.propulsion === editing.propulsion && item.reviewStatus === 'Approved')) {
      setError(t('每种动力类型必须保留一个已审核架构。', 'Keep at least one approved architecture for each propulsion type.')); return;
    }
    if (window.confirm(t('确定删除此架构？', 'Delete this architecture?')) && onDelete(original)) { setEditing(null); setOriginal(null); }
  };
  return <div className="architecture-management">
    <section className="panel-card architecture-records">
      <div className="entity-list-header"><div><strong>{t('参考架构记录', 'Reference architecture records')}</strong><small>{t('每种动力类型至少保留一个已审核架构。', 'Keep one approved architecture per propulsion type.')}</small></div><button className="button-primary" onClick={startNew}><Plus size={15} />{t('新增架构', 'Add architecture')}</button></div>
      <div className="architecture-record-list">{data.architectures.map((architecture) => <button key={architecture.id} className={`architecture-record${editing?.id === architecture.id ? ' active' : ''}`} onClick={() => startEdit(architecture)}>
        <span className="powertrain-badge">{architecture.propulsion}</span><span className="architecture-record-copy"><b>{architecture.name[language] || architecture.name.en}</b><small>{architecture.id} · {architecture.eeArchitecture} · {architecture.systemIds.length} {t('系统', 'systems')}</small></span><span className={`status-pill status-${architecture.reviewStatus.toLowerCase().replace(' ', '-')}`}>{architecture.reviewStatus}</span>
      </button>)}</div>
    </section>
    <section className="panel-card architecture-editor">
      {editing ? <><div className="section-title"><h2>{original ? t('编辑车辆架构', 'Edit vehicle architecture') : t('新增车辆架构', 'Add vehicle architecture')}</h2><button className="icon-btn" onClick={() => { setEditing(null); setOriginal(null); }}><X size={16} /></button></div>
        <form onSubmit={save}>
          <label>{t('ID', 'ID')}<input value={editing.id} disabled={Boolean(original)} onChange={(event) => setEditing({ ...editing, id: event.target.value })} placeholder="architecture-bev-study" /></label>
          <div className="form-grid"><label>{t('动力类型', 'Propulsion')}<select value={editing.propulsion} onChange={(event) => {
            const propulsion = event.target.value as Propulsion;
            const validEcus = new Set(data.entities.filter((entity) => entity.category === 'ecu' && (!entity.appliesTo || entity.appliesTo.includes(propulsion))).map((entity) => entity.id));
            setEditing({ ...editing, propulsion, ecuIds: editing.ecuIds.filter((id) => validEcus.has(id)) });
          }}>{propulsionOptions.map((item) => <option key={item}>{item}</option>)}</select></label>
            <label>{t('电子电气架构', 'E/E architecture')}<select value={editing.eeArchitecture} onChange={(event) => setEditing({ ...editing, eeArchitecture: event.target.value as Architecture['eeArchitecture'] })}><option value="Distributed">Distributed</option><option value="Domain">Domain</option><option value="Zonal">Zonal</option><option value="Centralized">Centralized computing</option></select></label></div>
          <div className="form-grid"><label>{t('中文名称', 'Name (Chinese)')}<input value={editing.name.zh} onChange={(event) => setLocalized('name', 'zh', event.target.value)} /></label><label>{t('英文名称', 'Name (English)')}<input value={editing.name.en} onChange={(event) => setLocalized('name', 'en', event.target.value)} /></label></div>
          <div className="form-grid"><label>{t('中文拓扑说明', 'Topology (Chinese)')}<textarea rows={2} value={editing.topology.zh} onChange={(event) => setLocalized('topology', 'zh', event.target.value)} /></label><label>{t('英文拓扑说明', 'Topology (English)')}<textarea rows={2} value={editing.topology.en} onChange={(event) => setLocalized('topology', 'en', event.target.value)} /></label></div>
          <fieldset className="checklist-field"><legend>{t('车辆系统', 'Vehicle systems')} · {editing.systemIds.length}</legend><div className="entity-checklist">{systems.map((entity) => <label key={entity.id}><input type="checkbox" checked={editing.systemIds.includes(entity.id)} onChange={() => toggleId('systemIds', entity.id)} /><span>{entity.name[language] || entity.name.en}</span></label>)}</div></fieldset>
          <fieldset className="checklist-field"><legend>{t('ECU / 功能单元', 'ECUs / Functional units')} · {editing.ecuIds.length}</legend><div className="entity-checklist">{ecus.map((entity) => <label key={entity.id}><input type="checkbox" checked={editing.ecuIds.includes(entity.id)} onChange={() => toggleId('ecuIds', entity.id)} /><span>{entity.name[language] || entity.name.en}</span></label>)}</div></fieldset>
          <div className="section-title"><h3>{t('架构证据来源', 'Architecture evidence sources')}</h3><button type="button" className="button-secondary" onClick={() => setEditing({ ...editing, sources: [...(editing.sources ?? []), { id: `${editing.id || 'source'}-${Date.now()}`, title: { zh: '', en: '' }, type: 'Official documentation' }] })}><Plus size={14} />{t('添加来源', 'Add source')}</button></div>
          {(editing.sources ?? []).map((source, index) => <div className="panel-card source-editor" key={source.id}>
            <div className="form-grid"><label>{t('来源标题（中文）', 'Source title (Chinese)')}<input value={source.title.zh} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, title: { ...source.title, zh: event.target.value } }; setEditing({ ...editing, sources }); }} /></label>
              <label>{t('来源标题（英文）', 'Source title (English)')}<input value={source.title.en} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, title: { ...source.title, en: event.target.value } }; setEditing({ ...editing, sources }); }} /></label></div>
            <label>{t('来源 URL', 'Source URL')}<input type="url" value={source.url ?? ''} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, url: event.target.value || undefined }; setEditing({ ...editing, sources }); }} placeholder="https://" /></label>
            <div className="form-grid"><label>{t('来源类型', 'Source type')}<input value={source.type} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, type: event.target.value }; setEditing({ ...editing, sources }); }} /></label>
              <label>{t('发布机构', 'Publisher')}<input value={source.publisher ?? ''} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, publisher: event.target.value || undefined }; setEditing({ ...editing, sources }); }} /></label></div>
            <label>{t('获取时间', 'Accessed at')}<input type="datetime-local" value={toLocalDateTime(source.accessedAt)} onChange={(event) => { const sources = [...(editing.sources ?? [])]; sources[index] = { ...source, accessedAt: event.target.value ? new Date(event.target.value).toISOString() : undefined }; setEditing({ ...editing, sources }); }} /></label>
            <button type="button" className="button-quiet" onClick={() => setEditing({ ...editing, sources: (editing.sources ?? []).filter((_, itemIndex) => itemIndex !== index) })}>{t('移除此来源', 'Remove source')}</button>
          </div>)}
          <div className="form-grid"><label>{t('可信度', 'Confidence')}<select value={editing.confidence} onChange={(event) => setEditing({ ...editing, confidence: event.target.value as Architecture['confidence'] })}>{['High', 'Medium', 'Low', 'Unverified'].map((value) => <option key={value}>{value}</option>)}</select></label><label>{t('内容审核状态', 'Content review status')}<select value={editing.reviewStatus} onChange={(event) => setEditing({ ...editing, reviewStatus: event.target.value as ReviewStatus })}>{statuses.map((value) => <option key={value}>{value}</option>)}</select></label></div>
          <label>{t('来源核实状态（独立于内容审核）', 'Source verification (independent of content review)')}<select value={editing.verificationStatus ?? 'Unverified'} onChange={(event) => setEditing({ ...editing, verificationStatus: event.target.value as VerificationStatus })}>{verificationStatuses.map((value) => <option key={value}>{value}</option>)}</select></label>
          {error && <div className="inline-error">{error}</div>}
          <div className="editor-actions"><button type="submit" className="button-primary"><Check size={15} />{t('保存修改', 'Save changes')}</button>{original && <button type="button" className="button-danger" onClick={remove}><Trash2 size={14} />{t('删除', 'Delete')}</button>}</div>
        </form></>
        : <div className="editor-placeholder"><div className="empty-glyph">⌘</div><h3>{t('管理车辆参考架构', 'Manage vehicle reference architectures')}</h3><p>{t('选择架构记录进行编辑，或新增动力类型与电子电气架构的组合。', 'Edit an architecture or add a new combination of propulsion type and E/E architecture.')}</p></div>}
    </section>
  </div>;
}
