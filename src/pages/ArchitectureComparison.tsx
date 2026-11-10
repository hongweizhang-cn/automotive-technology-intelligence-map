import { useMemo, useState } from 'react';
import type { AppData, Language } from '../types';
import {
  availableArchitectureIds,
  buildComparisonRows,
  comparisonArchitecture,
  comparisonLabel,
  type ComparisonMode,
} from '../services/architectureComparison';
import { comparisonDimensions } from '../services/comparisonDimensions';

interface Props {
  data: AppData;
  language: Language;
  onSelectEntity: (id: string) => void;
  onOpenArchitecture: (propulsion: AppData['architectures'][number]['propulsion'], ee?: AppData['architectures'][number]['eeArchitecture']) => void;
}

const maxSelections = 4;

export default function ArchitectureComparison({ data, language, onSelectEntity, onOpenArchitecture }: Props) {
  const [mode, setMode] = useState<ComparisonMode>('propulsion');
  const [selected, setSelected] = useState<string[]>(['ICE', 'BEV']);
  const [presentation, setPresentation] = useState<'table' | 'cards'>('table');
  const ids = availableArchitectureIds(data, mode);
  const activeIds = selected.filter((id) => ids.includes(id));
  const rows = useMemo(() => buildComparisonRows(data, mode, activeIds, language), [data, mode, activeIds.join('|'), language]);
  const label = (id: string) => comparisonLabel(id, mode, language);
  const t = (zh: string, en: string) => language === 'zh' ? zh : en;
  const toggle = (id: string) => setSelected((current) => current.includes(id)
    ? current.filter((value) => value !== id)
    : current.length < maxSelections ? [...current, id] : current);
  const groupTitle = (group: string) => {
    if (group === 'propulsion') return t('动力与能量系统', 'Propulsion and energy');
    return t('控制、网络与软件架构', 'Control, network, and software architecture');
  };
  const localizedStatus = (status: string) => ({
    Available: t('有数据', 'Available'),
    'Not Applicable': t('不适用', 'Not Applicable'),
    'Not Available': t('暂无数据', 'Not Available'),
  }[status] ?? status);
  const localizedReview = (status: string) => ({
    Draft: t('草稿', 'Draft'),
    'Pending Review': t('待审核', 'Pending Review'),
    Approved: t('已审核', 'Approved'),
    Rejected: t('已拒绝', 'Rejected'),
  }[status] ?? status);
  const localizedVerification = (status: string) => ({
    Unverified: t('未核实', 'Unverified'),
    'Pending Verification': t('待核实', 'Pending Verification'),
    Verified: t('已核实', 'Verified'),
  }[status] ?? status);
  const displayValue = (cell: (typeof rows)[number]['values'][string]) => cell.status === 'Available'
    ? cell.value || t('暂无数据', 'Not Available')
    : localizedStatus(cell.status);
  const isDifferent = (rowKey: string) => {
    const row = rows.find((item) => item.key === rowKey);
    if (!row) return false;
    return new Set(activeIds.map((id) => `${row.values[id]?.status}:${row.values[id]?.value ?? ''}`)).size > 1;
  };
  const renderCell = (id: string, row: (typeof rows)[number]) => {
    const value = row.values[id];
    if (!value) return <span className="unavailable">{t('暂无数据', 'Not Available')}</span>;
    const different = isDifferent(row.key);
    return <div className={`comparison-cell${different ? ' comparison-cell-different' : ' comparison-cell-same'}`}>
      <span className={`comparison-value status-value-${value.status.toLowerCase().replaceAll(' ', '-')}`}>{displayValue(value)}</span>
      <div className="comparison-provenance">
        <span>{t('内容审核', 'Review')}: {localizedReview(value.reviewStatus)}</span>
        <span>{t('来源', 'Source')}: {localizedVerification(value.verificationStatus)}</span>
      </div>
      {value.sources.map((source) => source.url
        ? <a className="comparison-source" key={source.id} href={source.url} target="_blank" rel="noreferrer">
          {source.title[language] || source.title.en || source.title.zh}{source.publisher ? ` · ${source.publisher}` : ''}
        </a>
        : <span className="comparison-source" key={source.id}>{source.title[language] || source.title.en || source.title.zh}{source.publisher ? ` · ${source.publisher}` : ''}</span>)}
      {value.entityIds.map((entityId) => {
        const entity = data.entities.find((item) => item.id === entityId);
        return entity ? <button className="comparison-link" key={entityId} onClick={() => onSelectEntity(entityId)}>{entity.name[language] || entity.name.en}</button> : null;
      })}
    </div>;
  };

  const groupedRows = new Map<string, typeof rows>();
  for (const row of rows) groupedRows.set(row.group, [...(groupedRows.get(row.group) ?? []), row]);

  return (
    <div className="page-content comparison-page">
      <div className="page-heading">
        <div>
          <div className="eyebrow">ARCHITECTURE ANALYSIS / 07</div>
          <h1>{t('架构比较', 'Architecture Comparison')}</h1>
          <p>{t('比较维度来自架构记录与显式关联；没有记录的事实不作推断。', 'Dimensions come from architecture records and explicit links; unrecorded facts are not inferred.')}</p>
        </div>
        <div className="comparison-view-toggle" role="group" aria-label={t('展示方式', 'Display mode')}>
          <button className={presentation === 'table' ? 'active' : ''} onClick={() => setPresentation('table')}>{t('表格', 'Table')}</button>
          <button className={presentation === 'cards' ? 'active' : ''} onClick={() => setPresentation('cards')}>{t('卡片', 'Cards')}</button>
        </div>
      </div>

      <section className="comparison-controls panel-card">
        <div className="management-tabs">
          <button className={mode === 'propulsion' ? 'active' : ''} onClick={() => { setMode('propulsion'); setSelected(['ICE', 'BEV']); }}>
            {t('动力架构', 'Propulsion')}
          </button>
          <button className={mode === 'ee' ? 'active' : ''} onClick={() => { setMode('ee'); setSelected(['Domain', 'Zonal']); }}>
            {t('E/E 架构', 'E/E architecture')}
          </button>
        </div>
        <div className="comparison-options">
          {ids.map((id) => (
            <label key={id} className={activeIds.includes(id) ? 'selected' : ''}>
              <input type="checkbox" checked={activeIds.includes(id)} disabled={!activeIds.includes(id) && activeIds.length >= maxSelections} onChange={() => toggle(id)} />
              <span>{label(id)}</span>
            </label>
          ))}
        </div>
        <div className="comparison-hint">{t('选择 2–4 项。维度分组可展开或收起。通用参考架构不代表量产车型配置。', 'Select 2–4 items. Dimension groups can be expanded or collapsed. Reference architectures do not represent production vehicle configurations.')}</div>
      </section>

      {activeIds.length < 2 ? (
        <section className="panel-card empty-state comparison-empty">{t('至少选择两项进行比较。', 'Select at least two items to compare.')}</section>
      ) : [...groupedRows].map(([group, groupRows]) => (
        <details className="comparison-group panel-card" key={group} open>
          <summary>{groupTitle(group)} <span>{groupRows.length} {t('项维度', 'dimensions')}</span></summary>
          {presentation === 'table' ? (
            <div className="table-scroll">
              <table className="comparison-table">
                <thead><tr><th>{t('比较维度', 'Dimension')}</th>{activeIds.map((id) => {
                  const record = comparisonArchitecture(data, mode, id);
                  return <th key={id}>
                    <span>{label(id)}</span>
                    <button className="comparison-map-link" onClick={() => record && onOpenArchitecture(record.propulsion, record.eeArchitecture)}>{t('打开架构地图', 'Open architecture map')}</button>
                  </th>;
                })}</tr></thead>
                <tbody>{groupRows.map((row) => <tr key={row.key} className={isDifferent(row.key) ? 'comparison-row-different' : ''}>
                  <th scope="row">{comparisonDimensions.find((item) => item.id === row.key)?.label[language] ?? row.label[language]}</th>
                  {activeIds.map((id) => <td key={id}>{renderCell(id, row)}</td>)}
                </tr>)}</tbody>
              </table>
            </div>
          ) : (
            <div className="comparison-cards">
              {activeIds.map((id) => {
                const record = comparisonArchitecture(data, mode, id);
                return <section className="panel-card comparison-card" key={id}>
                  <h2>{label(id)}</h2>
                  <button className="comparison-map-link" onClick={() => record && onOpenArchitecture(record.propulsion, record.eeArchitecture)}>{t('打开架构地图', 'Open architecture map')}</button>
                  {groupRows.map((row) => <div className={`comparison-card-row${isDifferent(row.key) ? ' comparison-row-different' : ''}`} key={row.key}>
                    <b>{comparisonDimensions.find((item) => item.id === row.key)?.label[language] ?? row.label[language]}</b>
                    {renderCell(id, row)}
                  </div>)}
                </section>;
              })}
            </div>
          )}
        </details>
      ))}
      <div className="comparison-disclaimer">
        {t('暂无数据表示适用性已知或未判定但缺少可靠记录；不适用仅在编辑者明确标注时显示。每项审核与来源核实状态独立展示。', 'Not Available means reliable information has not been recorded; Not Applicable appears only when explicitly set by an editor. Review and source-verification states are shown independently.')}
      </div>
    </div>
  );
}
