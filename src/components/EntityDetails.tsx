import { Bookmark, BookmarkCheck, ExternalLink, X } from 'lucide-react';
import type { Entity, Language } from '../types';

interface Props {
  entity?: Entity;
  entities: Entity[];
  language: Language;
  favorite: boolean;
  onFavorite: () => void;
  onSelectRelated: (id: string) => void;
  onClose?: () => void;
  compact?: boolean;
}

export default function EntityDetails({ entity, entities, language, favorite, onFavorite, onSelectRelated, onClose, compact }: Props) {
  const related = entity?.relatesTo.map((id) => entities.find((item) => item.id === id)).filter((item): item is Entity => Boolean(item)) ?? [];
  const relationshipByTarget = new Map((entity?.relations ?? []).map((relation) => [relation.targetId, relation]));
  const sources = entity?.sources?.length ? entity.sources : entity?.sourceUrl ? [{
    id: 'legacy-source', title: { zh: entity.sourceTitle || entity.sourceUrl, en: entity.sourceTitle || entity.sourceUrl },
    url: entity.sourceUrl, type: entity.sourceType || 'Legacy source', accessedAt: entity.retrievedAt,
  }] : [];
  const statusLabel = (status: string) => {
    const labels: Record<string, string> = { Draft: '草稿', 'Pending Review': '待审核', Approved: '审核通过', Rejected: '已拒绝' };
    return language === 'zh' ? labels[status] ?? status : status;
  };
  const verificationLabel = (status: string) => {
    const labels: Record<string, string> = { Unverified: '未核实', 'Pending Verification': '待核实', Verified: '已核实' };
    return language === 'zh' ? labels[status] ?? status : status;
  };
  const relationLabel = (type: string) => {
    const labels: Record<string, [string, string]> = {
      related_to: ['关联（语义未标注）', 'related (semantics unspecified)'], contains: ['包含', 'contains'],
      part_of: ['属于', 'part of'], controls: ['控制', 'controls'], monitors: ['监测', 'monitors'],
      communicates_with: ['通信', 'communicates with'], connected_to: ['连接', 'connected to'],
      powered_by: ['由其供电', 'powered by'], distributes_power_to: ['向其供电', 'distributes power to'],
      depends_on: ['依赖', 'depends on'], implements: ['实现', 'implements'], uses: ['使用', 'uses'], integrates: ['集成', 'integrates'],
    };
    return labels[type]?.[language === 'zh' ? 0 : 1] ?? type;
  };
  const confidenceLabel = (confidence: string) => {
    const labels: Record<string, string> = { High: '高', Medium: '中', Low: '低', Unverified: '未核实' };
    return language === 'zh' ? labels[confidence] ?? confidence : confidence;
  };
  return (
    <aside className={`detail-panel${compact ? ' compact' : ''}`}>
      <div className="panel-title"><span>{language === 'zh' ? '实体详情' : 'Entity details'}</span>{onClose && <button className="icon-btn" onClick={onClose} aria-label="Close"><X size={16} /></button>}</div>
      {!entity ? <div className="detail-empty"><div className="empty-glyph">⌖</div><p>{language === 'zh' ? '选择节点查看技术说明、关联及数据来源。' : 'Select a node to inspect its description, relationships, and sources.'}</p></div> : (
        <div className="detail-content">
          <div className={`entity-icon large node-${entity.category}`}>{entity.category.slice(0, 1).toUpperCase()}</div>
          <div className="detail-entity-name">{entity.name[language] || entity.name.en}</div>
          <div className="entity-id">{entity.id}</div>
          <div className="tag-row"><span className={`tag tag-${entity.category}`}>{entity.category}</span><span className="tag">{statusLabel(entity.reviewStatus)}</span></div>
          <button className={`favorite-btn${favorite ? ' active' : ''}`} onClick={onFavorite}>
            {favorite ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
            {favorite ? (language === 'zh' ? '已加入学习收藏' : 'Saved to learning') : (language === 'zh' ? '加入学习收藏' : 'Save to learning')}
          </button>
          <section className="detail-section">
            <h4>{language === 'zh' ? '功能说明' : 'Description'}</h4>
            <p>{entity.description[language] || entity.description.en || (language === 'zh' ? '暂无资料' : 'No information available.')}</p>
          </section>
          <section className="detail-section">
            <h4>{language === 'zh' ? '数据质量' : 'Data quality'}</h4>
            <dl className="detail-meta">
              <div><dt>{language === 'zh' ? '内容审核' : 'Content review'}</dt><dd>{statusLabel(entity.reviewStatus)}</dd></div>
              <div><dt>{language === 'zh' ? '可信度' : 'Confidence'}</dt><dd>{confidenceLabel(entity.confidence)}</dd></div>
              <div><dt>{language === 'zh' ? '来源核实' : 'Source verification'}</dt><dd>{verificationLabel(entity.verificationStatus ?? 'Unverified')}</dd></div>
              <div><dt>{language === 'zh' ? '创建者' : 'Created by'}</dt><dd>{entity.createdBy}</dd></div>
              {entity.appliesTo?.length ? <div><dt>{language === 'zh' ? '适用动力' : 'Applies to'}</dt><dd>{entity.appliesTo.join(', ')}</dd></div> : null}
              {entity.updatedAt ? <div><dt>{language === 'zh' ? '更新时间' : 'Updated'}</dt><dd>{new Date(entity.updatedAt).toLocaleDateString(language)}</dd></div> : null}
            </dl>
          </section>
          <section className="detail-section">
            <h4>{language === 'zh' ? '关联实体' : 'Related entities'} <span className="count-badge">{related.length}</span></h4>
            {related.length ? <div className="related-list">{related.map((item) => (
              <button key={item.id} className="related-item" onClick={() => onSelectRelated(item.id)}>
                <span className={`mini-dot node-${item.category}`} /><span className="related-item-name">{item.name[language] || item.name.en}
                  <small>{relationLabel(relationshipByTarget.get(item.id)?.type ?? 'related_to')}{relationshipByTarget.get(item.id)?.description[language] ? ` · ${relationshipByTarget.get(item.id)?.description[language]}` : ''}</small>
                </span><span>↗</span>
              </button>
            ))}</div> : <p className="muted">{language === 'zh' ? '暂无关联' : 'No linked entities'}</p>}
          </section>
          <section className="detail-section">
            <h4>{language === 'zh' ? '证据来源' : 'Evidence sources'} <span className="count-badge">{sources.length}</span></h4>
            {sources.length ? <div className="related-list">{sources.map((source) => <div className="evidence-item" key={source.id}>
              {source.url ? <a className="source-link" href={source.url} target="_blank" rel="noreferrer">{source.title[language] || source.title.en || source.url}<ExternalLink size={12} /></a> : <strong>{source.title[language] || source.title.en}</strong>}
              <small>{source.type}{source.publisher ? ` · ${source.publisher}` : ''}{source.accessedAt ? ` · ${new Date(source.accessedAt).toLocaleDateString(language)}` : ''}</small>
              {source.note?.[language] && <small>{source.note[language]}</small>}
            </div>)}</div> : <p className="muted">{language === 'zh' ? '暂无来源记录；参考数据仅作示意。审核通过不等同于来源已核实。' : 'No source recorded; reference data is illustrative. Review approval does not mean sources are verified.'}</p>}
          </section>
          <div className="illustrative-note">{language === 'zh' ? '通用参考架构，不代表任何量产车型的实际配置。' : 'General reference architecture; not a production vehicle configuration.'}</div>
        </div>
      )}
    </aside>
  );
}
