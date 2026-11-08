export type Language = 'zh' | 'en';
export type Propulsion = 'ICE' | 'BEV' | 'HEV' | 'PHEV' | 'EREV' | 'FCEV';
export type EntityCategory =
  | 'system'
  | 'ecu'
  | 'sensor'
  | 'actuator'
  | 'hardware'
  | 'network'
  | 'technology'
  | 'standard'
  | 'company';
export type ReviewStatus = 'Draft' | 'Pending Review' | 'Approved' | 'Rejected';
export type Confidence = 'High' | 'Medium' | 'Low' | 'Unverified';
export type VerificationStatus = 'Unverified' | 'Pending Verification' | 'Verified';
export type RelationType =
  | 'related_to'
  | 'contains'
  | 'part_of'
  | 'controls'
  | 'monitors'
  | 'communicates_with'
  | 'connected_to'
  | 'powered_by'
  | 'distributes_power_to'
  | 'depends_on'
  | 'implements'
  | 'uses'
  | 'integrates';

export interface LocalizedText {
  zh: string;
  en: string;
}

export interface EvidenceSource {
  id: string;
  title: LocalizedText;
  url?: string;
  type: string;
  publisher?: string;
  accessedAt?: string;
  note?: LocalizedText;
}

export interface EntityRelation {
  targetId: string;
  type: RelationType;
  description: LocalizedText;
}

export interface Entity {
  id: string;
  category: EntityCategory;
  name: LocalizedText;
  description: LocalizedText;
  relatesTo: string[];
  relations?: EntityRelation[];
  appliesTo?: Propulsion[];
  inputs?: LocalizedText[];
  outputs?: LocalizedText[];
  controls?: string[];
  sources?: EvidenceSource[];
  companyType?: string;
  sourceUrl?: string;
  sourceTitle?: string;
  confidence: Confidence;
  reviewStatus: ReviewStatus;
  createdBy: 'Human' | 'Agent';
  createdAt: string;
  updatedAt: string;
  sourceType?: string;
  retrievedAt?: string;
  verifiedAt?: string;
  verificationStatus?: VerificationStatus;
}

export interface Architecture {
  id: string;
  propulsion: Propulsion;
  name: LocalizedText;
  topology: LocalizedText;
  eeArchitecture: 'Distributed' | 'Domain' | 'Zonal' | 'Centralized';
  systemIds: string[];
  ecuIds: string[];
  confidence: Confidence;
  reviewStatus: ReviewStatus;
  createdBy: 'Human' | 'Agent';
  createdAt: string;
  sources?: EvidenceSource[];
  verificationStatus?: VerificationStatus;
  sourceUrl?: string;
  sourceTitle?: string;
  updatedAt: string;
}

export interface AppData {
  version: 2;
  entities: Entity[];
  architectures: Architecture[];
}

export interface ChangeRecord {
  id: string;
  entityId: string;
  entityName: string;
  changedAt: string;
  changedBy: string;
  before: Entity | Architecture | null;
  after: Entity | Architecture | null;
}

export interface LearningData {
  favorites: string[];
  notes: Record<string, string>;
}
