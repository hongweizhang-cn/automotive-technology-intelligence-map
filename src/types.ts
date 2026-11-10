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
  | 'integrates'
  | 'transports'
  | 'defines';
export type ComparisonEntryStatus = 'Available' | 'Not Applicable' | 'Not Available';
export type TechnologyDomain =
  | 'vehicle-communication'
  | 'automotive-ethernet'
  | 'automotive-diagnostics'
  | 'automotive-software-architecture'
  | 'software-defined-vehicle';
export type ArchitectureComparisonDimension =
  | 'primaryEnergySource'
  | 'energyStorage'
  | 'energyConversion'
  | 'powerGeneration'
  | 'powerTransmission'
  | 'tractionSystem'
  | 'mainControlUnits'
  | 'supportingSystems'
  | 'communicationNetworks'
  | 'architectureCharacteristics'
  | 'technicalAdvantages'
  | 'technicalLimitations'
  | 'controllerOrganization'
  | 'functionalAllocation'
  | 'computingDistribution'
  | 'networkTopology'
  | 'communicationBackbone'
  | 'wiringArchitecture'
  | 'softwareDeployment'
  | 'systemIntegration'
  | 'scalability'
  | 'typicalApplicationScenarios';

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
  publicationDate?: string;
  accessedAt?: string;
  note?: LocalizedText;
}

export interface TechnologyDetails {
  domain: TechnologyDomain;
  subdomain?: LocalizedText;
  layer?: LocalizedText;
  definition?: LocalizedText;
  purpose?: LocalizedText;
  mechanism?: LocalizedText;
  keyFeatures?: LocalizedText;
  useCases?: LocalizedText;
  advantages?: LocalizedText;
  limitations?: LocalizedText;
  applicableArchitectures?: string[];
}

export interface EntityRelation {
  targetId: string;
  type: RelationType;
  description: LocalizedText;
}

export interface ArchitectureComparisonEntry {
  status: ComparisonEntryStatus;
  value: LocalizedText;
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
  technologyDetails?: TechnologyDetails;
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
  comparisonProfile?: Partial<Record<ArchitectureComparisonDimension, ArchitectureComparisonEntry>>;
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
