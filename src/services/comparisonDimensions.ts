import type { ArchitectureComparisonDimension } from '../types';

export interface ComparisonDimensionDefinition {
  id: ArchitectureComparisonDimension;
  group: 'propulsion' | 'ee';
  label: { zh: string; en: string };
}

export const comparisonDimensions: ComparisonDimensionDefinition[] = [
  { id: 'primaryEnergySource', group: 'propulsion', label: { zh: '主要能源来源', en: 'Primary Energy Source' } },
  { id: 'energyStorage', group: 'propulsion', label: { zh: '储能系统', en: 'Energy Storage' } },
  { id: 'energyConversion', group: 'propulsion', label: { zh: '能量转换', en: 'Energy Conversion' } },
  { id: 'powerGeneration', group: 'propulsion', label: { zh: '动力产生方式', en: 'Power Generation' } },
  { id: 'powerTransmission', group: 'propulsion', label: { zh: '动力传递路径', en: 'Power Transmission' } },
  { id: 'tractionSystem', group: 'propulsion', label: { zh: '牵引系统', en: 'Traction System' } },
  { id: 'mainControlUnits', group: 'propulsion', label: { zh: '主要控制单元', en: 'Main Control Units' } },
  { id: 'supportingSystems', group: 'propulsion', label: { zh: '辅助系统', en: 'Supporting Systems' } },
  { id: 'communicationNetworks', group: 'propulsion', label: { zh: '通信网络', en: 'Communication Networks' } },
  { id: 'architectureCharacteristics', group: 'propulsion', label: { zh: '架构特点', en: 'Architecture Characteristics' } },
  { id: 'technicalAdvantages', group: 'propulsion', label: { zh: '技术优势', en: 'Technical Advantages' } },
  { id: 'technicalLimitations', group: 'propulsion', label: { zh: '技术局限', en: 'Technical Limitations' } },
  { id: 'controllerOrganization', group: 'ee', label: { zh: '控制器组织方式', en: 'Controller Organization' } },
  { id: 'functionalAllocation', group: 'ee', label: { zh: '功能分配', en: 'Functional Allocation' } },
  { id: 'computingDistribution', group: 'ee', label: { zh: '计算资源分布', en: 'Computing Distribution' } },
  { id: 'networkTopology', group: 'ee', label: { zh: '网络拓扑', en: 'Network Topology' } },
  { id: 'communicationBackbone', group: 'ee', label: { zh: '通信骨干', en: 'Communication Backbone' } },
  { id: 'wiringArchitecture', group: 'ee', label: { zh: '线束架构', en: 'Wiring Architecture' } },
  { id: 'softwareDeployment', group: 'ee', label: { zh: '软件部署', en: 'Software Deployment' } },
  { id: 'systemIntegration', group: 'ee', label: { zh: '系统集成', en: 'System Integration' } },
  { id: 'scalability', group: 'ee', label: { zh: '可扩展性', en: 'Scalability' } },
  { id: 'typicalApplicationScenarios', group: 'ee', label: { zh: '典型应用场景', en: 'Typical Application Scenarios' } },
];
