import type { AppData, Architecture, Entity, EntityCategory, EntityRelation, EvidenceSource, Propulsion, RelationType, TechnologyDetails, TechnologyDomain } from '../types';

const now = new Date().toISOString();
const allPowertrains: Propulsion[] = ['ICE', 'BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'];
const powertrainIds: Record<Propulsion, string[]> = {
  ICE: ['sys-powertrain', 'sys-engine', 'sys-fuel', 'sys-ignition', 'sys-transmission', 'sys-aftertreatment', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-network'],
  BEV: ['sys-powertrain', 'sys-battery', 'sys-electric-drive', 'sys-hv-distribution', 'sys-charging', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-energy', 'sys-network'],
  HEV: ['sys-powertrain', 'sys-engine', 'sys-fuel', 'sys-ignition', 'sys-transmission', 'sys-electric-drive', 'sys-battery', 'sys-hv-distribution', 'sys-hybrid-control', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-energy', 'sys-network'],
  PHEV: ['sys-powertrain', 'sys-engine', 'sys-fuel', 'sys-ignition', 'sys-transmission', 'sys-electric-drive', 'sys-battery', 'sys-hybrid-control', 'sys-charging', 'sys-hv-distribution', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-energy', 'sys-network'],
  EREV: ['sys-powertrain', 'sys-engine', 'sys-fuel', 'sys-ignition', 'sys-range-extender', 'sys-electric-drive', 'sys-battery', 'sys-charging', 'sys-hv-distribution', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-energy', 'sys-network'],
  FCEV: ['sys-powertrain', 'sys-fuel-cell', 'sys-hydrogen', 'sys-air-supply', 'sys-electric-drive', 'sys-battery', 'sys-hv-distribution', 'sys-body', 'sys-chassis', 'sys-adas', 'sys-ivi', 'sys-thermal', 'sys-energy', 'sys-network'],
};

const entities: Entity[] = [];
function relation(targetId: string, type: RelationType, zh: string, en: string): EntityRelation {
  return { targetId, type, description: { zh, en } };
}
function setRelations(id: string, relations: EntityRelation[]) {
  const entity = entities.find((item) => item.id === id);
  if (!entity) throw new Error(`Cannot assign relations to missing entity ${id}.`);
  entity.relations = relations;
  entity.relatesTo = Array.from(new Set([...entity.relatesTo, ...relations.map((item) => item.targetId)]));
}

function add(
  id: string,
  category: EntityCategory,
  zh: string,
  en: string,
  descriptionZh: string,
  descriptionEn: string,
  relatesTo: string[] = [],
  appliesTo: Propulsion[] = allPowertrains,
  sourceUrl = '',
  confidence: Entity['confidence'] = 'Medium',
) {
  entities.push({
    id, category, name: { zh, en }, description: { zh: descriptionZh, en: descriptionEn },
    relatesTo, appliesTo, sourceUrl, confidence, reviewStatus: 'Approved', createdBy: 'Human', createdAt: now, updatedAt: now,
    verificationStatus: 'Unverified', sources: [],
    relations: relatesTo.map((targetId) => relation(targetId, 'related_to', '关联关系；具体语义尚未标注。', 'Related; specific relationship semantics are not yet documented.')),
  });
}

add('sys-powertrain', 'system', '动力系统', 'Powertrain System', '根据动力类型将能量转换为车轮驱动力；动力路径和部件集成因方案而异。', 'Converts onboard energy into wheel torque; energy paths and component integration vary by propulsion concept.', ['ecu-vcu', 'ecu-mcu', 'ecu-engine', 'ecu-fuel-cell', 'ecu-powertrain-domain']);
add('sys-battery', 'system', '动力电池系统', 'Traction Battery System', '管理动力电池储能、状态监测与高压安全；电池包、断路和配电边界因设计而异。', 'Manages traction energy storage, state monitoring, and high-voltage safety; pack, disconnect, and distribution boundaries vary by design.', ['ecu-bms', 'hw-battery-pack', 'hw-bdu', 'hw-pdu', 'sensor-cell-voltage', 'sensor-battery-current', 'sensor-battery-temperature', 'sensor-insulation', 'actuator-main-contactor', 'actuator-precharge', 'hw-hv-fuse']);
add('sys-engine', 'system', '发动机管理系统', 'Engine Management System', '控制内燃机的燃烧、喷油、点火和排放相关功能。', 'Controls combustion, fuel injection, ignition, and engine-related emissions functions.', ['ecu-engine', 'sensor-engine-speed', 'sensor-engine-temperature', 'actuator-fuel-injector', 'sys-fuel', 'sys-ignition', 'sys-aftertreatment'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sys-fuel', 'system', '燃油系统', 'Fuel System', '储存并输送燃油至发动机；具体部件布局因车型设计而异。', 'Stores and delivers fuel to the engine; component layout varies by vehicle design.', ['ecu-engine', 'actuator-fuel-injector'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sys-ignition', 'system', '点火系统', 'Ignition System', '在适用的点燃式发动机中控制点火过程。', 'Controls ignition in applicable spark-ignition engines.', ['ecu-engine'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sys-transmission', 'system', '变速器控制系统', 'Transmission Control System', '控制变速器或混合动力传动机构；拓扑随动力方案变化。', 'Controls the transmission or hybrid transaxle; topology varies by propulsion concept.', ['ecu-transmission', 'ecu-hcu'], ['ICE', 'HEV', 'PHEV']);
add('sys-aftertreatment', 'system', '排气后处理系统', 'Exhaust Aftertreatment System', '监测并控制适用内燃机的排气后处理。', 'Monitors and controls exhaust aftertreatment for applicable combustion engines.', ['ecu-engine', 'sensor-exhaust-oxygen'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sys-electric-drive', 'system', '电驱动系统', 'Electric Drive System', '将电能转换为牵引电机转矩；电机、逆变器及控制器可集成或分置。', 'Converts electrical energy into traction motor torque; motor, inverter, and control electronics may be integrated or separate.', ['ecu-mcu', 'ecu-vcu']);
add('sys-hv-distribution', 'system', '高压配电系统', 'High-Voltage Distribution System', '管理高压电源的隔离、保护和向负载分配。', 'Manages high-voltage isolation, protection, and distribution to loads.', ['hw-bdu', 'hw-pdu', 'actuator-main-contactor', 'actuator-precharge', 'hw-hv-fuse'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('sys-hybrid-control', 'system', '混合动力控制系统', 'Hybrid Control System', '协调发动机、电机、储能和传动系统的动力请求。', 'Coordinates engine, motor, energy storage, and transmission torque requests.', ['ecu-hcu', 'ecu-vcu', 'ecu-mcu', 'ecu-engine'], ['HEV', 'PHEV']);
add('sys-range-extender', 'system', '增程发电系统', 'Range Extender Generator System', '以发动机驱动发电机补充电能；车轮牵引由独立电驱路径提供。', 'Uses an engine-driven generator to provide electrical energy; wheel traction is provided by a separate electric drive path.', ['ecu-generator', 'ecu-engine', 'ecu-mcu'], ['EREV']);
add('sys-fuel-cell', 'system', '燃料电池系统', 'Fuel Cell System', '将氢气和氧化剂的化学能转换为电能；具体平衡部件随系统设计而定。', 'Converts hydrogen and oxidant chemical energy into electricity; balance-of-plant details vary by design.', ['ecu-fuel-cell', 'sys-hydrogen', 'sys-air-supply', 'sys-thermal'], ['FCEV']);
add('sys-hydrogen', 'system', '氢气储存与供给系统', 'Hydrogen Storage and Supply System', '存储并调节供给燃料电池的氢气；储罐与供气部件边界依系统设计而异。', 'Stores and regulates hydrogen supplied to the fuel-cell system; tank and supply component boundaries vary by design.', ['ecu-fuel-cell', 'hw-hydrogen-storage', 'sensor-hydrogen-pressure', 'actuator-hydrogen-isolation'], ['FCEV']);
add('sys-air-supply', 'system', '空气供给系统', 'Air Supply System', '为燃料电池反应提供并调节空气流量。', 'Provides and regulates airflow for the fuel-cell reaction.', ['ecu-fuel-cell', 'actuator-air-compressor'], ['FCEV']);
add('sys-charging', 'system', '充电系统', 'Charging System', '管理适用车辆的外部充电与车载能量转换。', 'Manages external charging and onboard power conversion where applicable.', ['ecu-obc', 'ecu-dcdc']);
add('sys-body', 'system', '车身控制系统', 'Body Control System', '协调车身舒适与便利功能。', 'Coordinates body comfort and convenience functions.', ['ecu-bcm', 'ecu-zonal', 'ecu-body-domain']);
add('sys-chassis', 'system', '底盘控制系统', 'Chassis Control System', '管理车辆制动、稳定和底盘动态。', 'Manages braking, stability, and chassis dynamics.', ['ecu-esc']);
add('sys-adas', 'system', '高级驾驶辅助系统', 'ADAS', '融合环境感知并支持驾驶辅助功能。', 'Combines environment sensing for driver-assistance functions.', ['ecu-adas', 'ecu-adas-domain', 'sensor-camera', 'sensor-radar']);
add('sys-ivi', 'system', '信息娱乐系统', 'Infotainment System', '提供座舱交互、媒体和连接体验。', 'Provides cockpit interaction, media, and connectivity.', ['ecu-ivi', 'ecu-cockpit-domain', 'ecu-tcu']);
add('sys-thermal', 'system', '热管理系统', 'Thermal Management System', '按设计调节乘员舱、电池及动力系统的热状态。', 'Regulates cabin, battery, and powertrain thermal states as designed.', ['ecu-vcu', 'ecu-bms', 'ecu-fuel-cell', 'actuator-pump', 'sensor-battery-temperature']);
add('sys-energy', 'system', '能源管理系统', 'Energy Management System', '根据动力方案协调能源来源、储能状态与能量流。', 'Coordinates energy sources, storage state, and energy flows according to the propulsion concept.', ['ecu-vcu', 'ecu-bms', 'ecu-hcu', 'ecu-fuel-cell']);
add('sys-network', 'system', '车载通信网络', 'Vehicle Communication Network', '连接控制器、传感器及中央计算平台。', 'Connects controllers, sensors, and central compute.', ['net-canfd', 'net-lin', 'net-ethernet']);

const ecuDefinitions: Array<[string, string, string, string, string, string[]]> = [
  ['ecu-vcu', '整车控制器', 'Vehicle Control Unit', '协调车辆运行模式和动力请求。', 'Coordinates vehicle modes and propulsion requests.', ['sys-powertrain', 'sys-energy', 'tech-autosar-classic', 'hw-mcu', 'net-canfd']],
  ['ecu-bms', '电池管理系统', 'Battery Management System', '监测电池状态并执行电池保护。', 'Monitors battery state and manages battery protection.', ['sys-battery', 'hw-bmafe', 'tech-iso26262', 'net-canfd']],
  ['ecu-mcu', '电机控制器', 'Motor Control Unit', '控制牵引电机的转矩与转速。', 'Controls traction motor torque and speed.', ['sys-powertrain', 'hw-mcu', 'tech-autosar-classic', 'net-canfd']],
  ['ecu-obc', '车载充电机', 'On-Board Charger', '将交流输入转换为高压直流充电电能。', 'Converts AC input into high-voltage DC charging power.', ['sys-charging', 'hw-pmic', 'tech-iso26262']],
  ['ecu-dcdc', '直流变换器', 'DC-DC Converter', '在高压和低压直流电源间转换。', 'Converts power between high- and low-voltage DC buses.', ['sys-charging', 'hw-pmic']],
  ['ecu-bcm', '车身控制模块', 'Body Control Module', '处理车身域开关和便利功能。', 'Handles body-domain switching and convenience functions.', ['sys-body', 'tech-autosar-classic', 'net-lin', 'hw-mcu']],
  ['ecu-esc', '制动与稳定控制器', 'ABS / ESC ECU', '提供防抱死制动及车辆稳定控制。', 'Provides anti-lock braking and electronic stability control.', ['sys-chassis', 'tech-iso26262', 'net-canfd']],
  ['ecu-adas', 'ADAS 域控制器', 'ADAS Domain Controller', '处理感知输入并执行驾驶辅助功能。', 'Processes perception inputs for driver-assistance functions.', ['sys-adas', 'sensor-camera', 'sensor-radar', 'hw-soc', 'tech-autosar-adaptive', 'net-ethernet']],
  ['ecu-gateway', '中央网关', 'Central Gateway', '在车载网络间路由并保护通信。', 'Routes and protects communication between in-vehicle networks.', ['sys-network', 'net-canfd', 'net-ethernet', 'tech-doip', 'hw-soc']],
  ['ecu-ivi', '车载信息娱乐系统', 'In-Vehicle Infotainment', '提供座舱多媒体与人机交互。', 'Provides cockpit multimedia and human-machine interaction.', ['sys-ivi', 'hw-soc', 'tech-someip', 'net-ethernet']],
  ['ecu-tcu', '车载通信单元', 'Telematics Control Unit', '支持车辆远程通信和联网服务。', 'Supports remote vehicle connectivity and telematics.', ['sys-ivi', 'tech-ota', 'tech-cybersecurity', 'hw-soc']],
  ['ecu-zonal', '区域控制器', 'Zonal Controller', '汇聚区域 I/O 并连接本地设备与骨干网。', 'Aggregates local I/O and connects devices to the backbone.', ['sys-body', 'sys-network', 'net-ethernet', 'net-lin', 'hw-mcu']],
];
for (const [id, zh, en, dz, de, links] of ecuDefinitions) {
  let apps = allPowertrains;
  if (id === 'ecu-bms' || id === 'ecu-mcu' || id === 'ecu-obc' || id === 'ecu-dcdc') apps = ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV'];
  if (id === 'ecu-engine') apps = ['ICE', 'HEV', 'PHEV', 'EREV'];
  if (id === 'ecu-fuel-cell') apps = ['FCEV'];
  add(id, 'ecu', zh, en, dz, de, links, apps);
}

add('sensor-camera', 'sensor', '摄像头传感器', 'Camera Sensor', '提供道路与目标图像输入。', 'Provides image input for roads and objects.', ['sys-adas', 'ecu-adas']);
add('sensor-radar', 'sensor', '毫米波雷达', 'Radar Sensor', '提供目标距离和相对速度测量。', 'Measures target distance and relative velocity.', ['sys-adas', 'ecu-adas']);
add('sensor-cell-voltage', 'sensor', '电芯电压采样', 'Cell Voltage Sensing', '采集电芯电压信号，供电池监测电路和 BMS 进行状态估算与保护判断。', 'Acquires cell-voltage signals for battery monitoring electronics and BMS estimation and protection decisions.', ['sys-battery', 'ecu-bms', 'hw-bmafe'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('sensor-battery-current', 'sensor', '电池电流传感器', 'Battery Current Sensor', '提供电池电流测量输入，具体传感原理和位置依设计而异。', 'Provides battery-current measurement input; sensing principle and location vary by design.', ['sys-battery', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('sensor-battery-temperature', 'sensor', '电池温度传感器', 'Battery Temperature Sensor', '提供电池温度测量输入，采样布点依电池包设计而异。', 'Provides battery temperature measurements; sensor placement varies by pack design.', ['sys-battery', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('sensor-insulation', 'sensor', '绝缘监测单元', 'Insulation Monitoring Device', '监测高压系统对车身的绝缘状态；实现可能集成于其他高压部件。', 'Monitors high-voltage system insulation to chassis; implementation may be integrated into another HV component.', ['sys-battery', 'sys-hv-distribution', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('sensor-engine-speed', 'sensor', '发动机转速传感器', 'Engine Speed Sensor', '向发动机控制系统提供转速或曲轴位置信号。', 'Provides engine speed or crank-position signals to engine control.', ['sys-engine', 'ecu-engine'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sensor-engine-temperature', 'sensor', '发动机温度传感器', 'Engine Temperature Sensor', '向发动机控制系统提供温度测量输入。', 'Provides temperature measurement input to engine control.', ['sys-engine', 'ecu-engine'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sensor-exhaust-oxygen', 'sensor', '排气氧传感器', 'Exhaust Oxygen Sensor', '为发动机控制和排放管理提供排气氧含量测量。', 'Provides exhaust oxygen measurements for engine and emissions control.', ['sys-aftertreatment', 'ecu-engine'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('sensor-hydrogen-pressure', 'sensor', '氢气压力监测', 'Hydrogen Pressure Sensing', '为氢气供给管理提供压力状态输入；传感器数量和布置依系统设计而异。', 'Provides pressure-state input for hydrogen supply management; sensor count and placement vary by system design.', ['sys-hydrogen', 'ecu-fuel-cell'], ['FCEV']);
add('actuator-pump', 'actuator', '电动冷却泵', 'Electric Coolant Pump', '按热管理需求循环冷却液。', 'Circulates coolant according to thermal demand.', ['sys-thermal']);
add('actuator-main-contactor', 'actuator', '主接触器', 'Main Contactor', '在高压系统控制策略下接通或断开电池包主回路。', 'Connects or disconnects the battery pack main circuit under the HV control strategy.', ['sys-battery', 'sys-hv-distribution', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('actuator-precharge', 'actuator', '预充回路', 'Pre-charge Circuit', '在适用设计中限制高压母线电容上电瞬态；实现形式依设计而异。', 'Limits HV bus capacitor inrush in applicable designs; implementation varies by design.', ['sys-battery', 'sys-hv-distribution', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('actuator-fuel-injector', 'actuator', '燃油喷射器', 'Fuel Injector', '按发动机控制命令计量并喷射燃油。', 'Meters and injects fuel in response to engine-control commands.', ['sys-engine', 'sys-fuel', 'ecu-engine'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('actuator-air-compressor', 'actuator', '空气压缩机', 'Air Compressor', '为燃料电池空气供给路径提供压缩空气；系统实现依设计而异。', 'Provides compressed air for the fuel-cell air-supply path; implementation varies by system design.', ['sys-air-supply', 'ecu-fuel-cell'], ['FCEV']);
add('actuator-hydrogen-isolation', 'actuator', '氢气隔离阀', 'Hydrogen Isolation Valve', '在适用安全策略下隔离氢气供给路径；阀门数量和布置依设计而异。', 'Isolates the hydrogen supply path under applicable safety strategies; valve count and placement vary by design.', ['sys-hydrogen', 'ecu-fuel-cell'], ['FCEV']);
add('hw-mcu', 'hardware', '汽车级微控制器', 'Automotive MCU', '用于实时控制与车载控制器应用。', 'Used for real-time control in automotive ECUs.', ['ecu-vcu', 'ecu-mcu', 'ecu-bcm']);
add('hw-soc', 'hardware', '汽车级系统级芯片', 'Automotive SoC', '集成高性能计算及接口能力。', 'Integrates high-performance compute and interfaces.', ['ecu-adas', 'ecu-ivi', 'ecu-gateway']);
add('hw-pmic', 'hardware', '电源管理芯片', 'PMIC', '管理电子系统中的电源轨与监控。', 'Manages power rails and monitoring for electronic systems.', ['ecu-obc', 'ecu-dcdc']);
add('hw-bmafe', 'hardware', '电池监测模拟前端', 'Battery Monitoring AFE', '采集电芯电压及温度等测量信号。', 'Acquires cell voltage, temperature, and related measurements.', ['ecu-bms']);
add('hw-battery-pack', 'hardware', '动力电池包', 'Traction Battery Pack', '电池系统中的高压储能总成；内部模组/电芯构型及包内集成边界依设计而异。', 'High-voltage energy-storage assembly within the battery system; internal module/cell configuration and integration boundaries vary by design.', ['sys-battery', 'hw-bdu', 'ecu-bms'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('hw-bdu', 'hardware', '电池断路单元', 'Battery Disconnect Unit', '通常承载接触器、预充及保护元件的高压回路部件；集成方式依设计而异。', 'HV circuit assembly commonly accommodating contactors, pre-charge, and protection elements; integration varies by design.', ['sys-battery', 'sys-hv-distribution', 'actuator-main-contactor', 'actuator-precharge', 'hw-hv-fuse'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('hw-hv-fuse', 'hardware', '高压熔断器', 'High-Voltage Fuse', '高压回路过流保护元件，数量和位置依系统设计而异。', 'Overcurrent protection component in HV circuits; count and placement vary by system design.', ['sys-battery', 'sys-hv-distribution', 'hw-bdu'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('hw-pdu', 'hardware', '高压配电单元', 'High-Voltage Power Distribution Unit', '向高压负载分配电能的硬件总成；与 BDU 的集成边界依设计而异。', 'Hardware assembly distributing power to HV loads; integration boundary with the BDU varies by design.', ['sys-hv-distribution', 'sys-battery'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('hw-cell-module', 'hardware', '电池模组 / 电芯总成', 'Battery Module / Cell Assembly', '电池包内的电化学储能单元层级示意；是否采用独立模组取决于电池包设计。', 'Illustrative electrochemical storage hierarchy within a pack; separate modules depend on pack design.', ['hw-battery-pack', 'sensor-cell-voltage'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('hw-hydrogen-storage', 'hardware', '高压储氢容器（示意）', 'High-Pressure Hydrogen Storage (illustrative)', '燃料电池车辆氢气储存功能的硬件示意；容器规格、数量与布置因车型和法规而异。', 'Illustrative hardware for hydrogen storage in an FCEV; vessel specification, count, and placement vary by vehicle and regulation.', ['sys-hydrogen', 'sensor-hydrogen-pressure', 'actuator-hydrogen-isolation'], ['FCEV']);
add('net-canfd', 'network', 'CAN FD', 'CAN FD', '支持可变数据长度的车载控制器通信。', 'In-vehicle controller network with flexible data length.', ['sys-network', 'tech-canfd', 'ecu-vcu', 'ecu-bms', 'ecu-esc']),
add('net-lin', 'network', 'LIN', 'LIN', '用于低成本车身子网络的串行通信。', 'Serial communication for cost-sensitive body sub-networks.', ['sys-network', 'tech-lin', 'ecu-bcm', 'ecu-zonal']),
add('net-ethernet', 'network', '车载以太网', 'Automotive Ethernet', '为车载骨干网和高带宽数据提供连接。', 'Provides backbone and high-bandwidth in-vehicle connectivity.', ['sys-network', 'tech-ethernet', 'ecu-adas', 'ecu-gateway', 'ecu-ivi']);

add('ecu-hcu', 'ecu', '混合动力控制单元', 'Hybrid Control Unit', '协调发动机、电机及传动系统的工作模式和扭矩分配；具体功能分配因拓扑而异。', 'Coordinates engine, motor, and transmission modes and torque allocation; functional allocation varies by topology.', ['sys-hybrid-control', 'sys-powertrain', 'sys-engine', 'sys-transmission', 'ecu-vcu', 'ecu-mcu'], ['HEV', 'PHEV']);
add('ecu-generator', 'ecu', '发电机控制器', 'Generator Control Unit', '控制增程发电路径中的发电机工作；不作为车轮牵引电机控制器。', 'Controls the generator in a range-extender electrical generation path; it is not the wheel-traction motor controller.', ['sys-range-extender', 'sys-powertrain', 'sys-battery'], ['EREV']);
add('ecu-bms-cmu', 'ecu', '电芯监测单元', 'Cell Monitoring Unit', '采集电芯级测量并向 BMS 控制器提供信息；物理分布及通信形式因设计而异。', 'Acquires cell-level measurements for the BMS controller; physical distribution and communication vary by design.', ['sys-battery', 'ecu-bms', 'hw-bmafe', 'sensor-cell-voltage'], ['BEV', 'HEV', 'PHEV', 'EREV', 'FCEV']);
add('ecu-central-compute', 'ecu', '中央计算平台（参考）', 'Central Compute Platform (reference)', '用于表达集中式 E/E 参考拓扑的逻辑计算节点，不代表特定车型的 ECU 配置。', 'Logical compute node for illustrating centralized E/E topology; not a specific vehicle ECU configuration.', ['sys-network', 'net-ethernet', 'ecu-gateway'], allPowertrains);
add('ecu-zonal-front', 'ecu', '前区域控制器（逻辑节点）', 'Front Zonal Controller (logical)', '用于区域式拓扑示意的逻辑节点；实际节点数量、位置与 I/O 分配依车型而异。', 'Logical node for zonal topology illustration; actual count, location, and I/O allocation vary by vehicle.', ['sys-body', 'sys-network', 'net-ethernet', 'net-lin'], allPowertrains);
add('ecu-zonal-rear', 'ecu', '后区域控制器（逻辑节点）', 'Rear Zonal Controller (logical)', '用于区域式拓扑示意的逻辑节点；并非所有车辆均采用前后区域划分。', 'Logical node for zonal topology illustration; not all vehicles use a front/rear zone split.', ['sys-body', 'sys-network', 'net-ethernet', 'net-lin'], allPowertrains);
add('ecu-powertrain-domain', 'ecu', '动力域控制器（逻辑节点）', 'Powertrain Domain Controller (logical)', '用于域式 E/E 拓扑示意的逻辑分组，不代表特定车型新增 ECU。', 'Logical grouping for a domain-style E/E topology; does not assert an additional ECU in a specific vehicle.', ['sys-powertrain', 'sys-battery', 'sys-engine', 'sys-electric-drive'], allPowertrains);
add('ecu-body-domain', 'ecu', '车身域控制器（逻辑节点）', 'Body Domain Controller (logical)', '用于域式 E/E 拓扑示意的逻辑分组，不代表特定车型新增 ECU。', 'Logical grouping for a domain-style E/E topology; does not assert an additional ECU in a specific vehicle.', ['sys-body'], allPowertrains);
add('ecu-adas-domain', 'ecu', '驾驶辅助域控制器（逻辑节点）', 'ADAS Domain Controller (logical)', '用于域式 E/E 拓扑示意的逻辑分组，不代表特定车型新增 ECU。', 'Logical grouping for a domain-style E/E topology; does not assert an additional ECU in a specific vehicle.', ['sys-adas'], allPowertrains);
add('ecu-cockpit-domain', 'ecu', '座舱域控制器（逻辑节点）', 'Cockpit Domain Controller (logical)', '用于域式 E/E 拓扑示意的逻辑分组，不代表特定车型新增 ECU。', 'Logical grouping for a domain-style E/E topology; does not assert an additional ECU in a specific vehicle.', ['sys-ivi'], allPowertrains);
add('ecu-transmission', 'ecu', '变速器控制器', 'Transmission Control Unit', '在适用动力方案中控制变速器执行与状态管理；可能集成于其他控制器。', 'Controls transmission actuation and state where applicable; may be integrated into another controller.', ['sys-transmission', 'sys-powertrain'], ['ICE', 'HEV', 'PHEV']);
add('ecu-engine', 'ecu', '发动机控制单元', 'Engine Control Unit', '管理内燃机喷射、点火和运行状态。', 'Manages combustion, ignition, and engine operation.', ['sys-engine', 'sys-fuel', 'sys-ignition', 'sys-aftertreatment', 'sys-powertrain', 'tech-autosar-classic', 'net-canfd'], ['ICE', 'HEV', 'PHEV', 'EREV']);
add('ecu-fuel-cell', 'ecu', '燃料电池控制器', 'Fuel Cell Controller', '监测燃料电池系统并协调其运行。', 'Monitors and coordinates fuel-cell system operation.', ['sys-fuel-cell', 'sys-hydrogen', 'sys-air-supply', 'sys-thermal', 'sys-energy', 'tech-iso26262'], ['FCEV']);

const techDefs: Array<[string, string, string, string, string, string[]]> = [
  ['tech-autosar-classic', 'AUTOSAR Classic', 'AUTOSAR Classic', '面向深度嵌入式实时控制器的软件架构。', 'Software architecture for deeply embedded real-time controllers.', ['ecu-vcu', 'ecu-bms', 'ecu-mcu', 'ecu-bcm', 'ecu-esc', 'ecu-engine']],
  ['tech-autosar-adaptive', 'AUTOSAR Adaptive', 'AUTOSAR Adaptive', '面向高性能 ECU 的服务化软件架构。', 'Service-oriented software architecture for high-performance ECUs.', ['ecu-adas', 'ecu-ivi', 'ecu-gateway']],
  ['tech-ethernet', '汽车以太网', 'Automotive Ethernet', '用于车载骨干网与高带宽应用的以太网技术。', 'Ethernet technology for vehicle backbones and high-bandwidth applications.', ['net-ethernet', 'ecu-adas', 'ecu-gateway', 'ecu-ivi']],
  ['tech-canfd', 'CAN / CAN FD', 'CAN / CAN FD', '广泛用于车载控制网络的通信技术。', 'Communication technology widely used in vehicle control networks.', ['net-canfd', 'ecu-vcu', 'ecu-bms', 'ecu-esc']],
  ['tech-lin', 'LIN', 'LIN', '面向简单低速设备的车载串行网络。', 'In-vehicle serial network for simple, low-speed devices.', ['net-lin', 'ecu-bcm', 'ecu-zonal']],
  ['tech-doip', 'DoIP', 'DoIP', '基于 IP 的车载诊断通信传输。', 'IP-based transport for in-vehicle diagnostics.', ['ecu-gateway', 'net-ethernet', 'std-13400']],
  ['tech-uds', 'UDS', 'UDS', '统一诊断服务应用层协议。', 'Application-layer protocol for unified diagnostics.', ['ecu-gateway', 'std-14229']],
  ['tech-someip', 'SOME/IP', 'SOME/IP', '用于车载服务发现和服务通信的中间件协议。', 'Middleware protocol for in-vehicle service discovery and communication.', ['ecu-ivi', 'ecu-gateway', 'ecu-adas', 'net-ethernet']],
  ['tech-sdv', '软件定义汽车', 'Software-Defined Vehicle', '以软件能力持续演进车辆功能的行业方向。', 'An industry direction for evolving vehicle capabilities through software.', ['ecu-tcu', 'tech-ota', 'tech-autosar-adaptive']],
  ['tech-ota', 'OTA 更新', 'OTA Update', '远程交付车辆软件或固件更新的能力。', 'Capability to deliver vehicle software or firmware updates remotely.', ['ecu-tcu', 'std-24089']],
  ['tech-iso26262', '功能安全', 'Functional Safety', '道路车辆 E/E 系统功能安全生命周期方法。', 'Functional safety lifecycle practices for road-vehicle E/E systems.', ['ecu-vcu', 'ecu-bms', 'ecu-esc', 'ecu-adas', 'std-26262']],
  ['tech-cybersecurity', '汽车网络安全', 'Automotive Cybersecurity', '车辆网络安全风险管理与工程实践。', 'Cybersecurity risk management and engineering for vehicles.', ['ecu-gateway', 'ecu-tcu', 'std-21434']],
  ['tech-adas', 'ADAS 感知融合', 'ADAS Sensor Fusion', '融合多传感器信息以支持驾驶辅助功能。', 'Combines sensor inputs to support driver-assistance features.', ['sys-adas', 'ecu-adas', 'sensor-camera', 'sensor-radar']],
  ['tech-diagnostics', '车载诊断', 'Vehicle Diagnostics', '用于故障读取、测试和维修的车载诊断能力。', 'In-vehicle diagnostics for fault reading, testing, and service.', ['ecu-gateway', 'tech-uds', 'tech-doip']],
  ['tech-100base', '100BASE-T1', '100BASE-T1', '单对双绞线汽车以太网物理层。', 'Automotive Ethernet physical layer over a single twisted pair.', ['net-ethernet', 'tech-ethernet']],
  ['tech-1000base', '1000BASE-T1', '1000BASE-T1', '千兆单对双绞线汽车以太网物理层。', 'Gigabit automotive Ethernet physical layer over a single twisted pair.', ['net-ethernet', 'tech-ethernet']],
];
for (const [id, zh, en, dz, de, links] of techDefs) add(id, 'technology', zh, en, dz, de, links);

const accessedAt = '2026-11-10T00:00:00.000Z';
const evidence = (id: string, title: string, publisher: string, url: string, publicationDate?: string, note?: { zh: string; en: string }): EvidenceSource => ({
  id, title: { zh: title, en: title }, publisher, type: 'Official specification / documentation', url, publicationDate, accessedAt, note,
});
const sourceAutosarClassic = evidence('source-autosar-classic', 'AUTOSAR Classic Platform', 'AUTOSAR', 'https://www.autosar.org/standards/classic-platform');
const sourceAutosarAdaptive = evidence('source-autosar-adaptive', 'AUTOSAR Adaptive Platform', 'AUTOSAR', 'https://www.autosar.org/standards/adaptive-platform');
const sourceUds = evidence('source-iso-14229-1-2020', 'ISO 14229-1:2020 Unified diagnostic services — Application layer', 'ISO', 'https://www.iso.org/standard/72439.html', '2020-02', {
  zh: 'ISO 页面显示此版已撤回；用于描述 UDS 的应用层与诊断测试仪/ECU 客户端-服务器范围，现行版本仍需人工核实。',
  en: 'ISO lists this edition as withdrawn; cited for the UDS application-layer and tester/ECU client-server scope. Current edition requires human verification.',
});
const sourceIpv4 = evidence('source-rfc791', 'RFC 791 — Internet Protocol', 'IETF', 'https://www.rfc-editor.org/rfc/rfc791', '1981-09');
const sourceIpv6 = evidence('source-rfc8200', 'RFC 8200 — Internet Protocol, Version 6 (IPv6) Specification', 'IETF', 'https://www.rfc-editor.org/rfc/rfc8200', '2017-07');
const sourceArp = evidence('source-rfc826', 'RFC 826 — An Ethernet Address Resolution Protocol', 'IETF', 'https://www.rfc-editor.org/rfc/rfc826', '1982-11');
const sourceNdp = evidence('source-rfc4861', 'RFC 4861 — Neighbor Discovery for IP version 6 (IPv6)', 'IETF', 'https://www.rfc-editor.org/rfc/rfc4861', '2007-09');
const sourceIeeeEthernet = evidence('source-ieee-802-3', 'IEEE 802.3 Ethernet standards catalog', 'IEEE Standards Association', 'https://standards.ieee.org/ieee/802.3/10422', undefined, {
  zh: '目录说明以太网标准包含 MAC 规范以及多种物理层；具体汽车 PHY/条款尚未逐项核实。',
  en: 'Catalog describes Ethernet MAC and multiple PHYs; specific automotive PHY clauses have not been independently checked.',
});
const localized = (zh = '', en = '') => ({ zh, en });
const coreTechnology: Array<{
  id: string; zh: string; en: string; domain: TechnologyDomain; subdomain: string; layer: string;
  description?: { zh: string; en: string }; details?: Partial<TechnologyDetails>; sources?: EvidenceSource[];
}> = [
  { id: 'tech-can', zh: 'CAN', en: 'CAN', domain: 'vehicle-communication', subdomain: 'Vehicle networks', layer: 'Data link / vehicle bus' },
  { id: 'tech-ethernet-mac', zh: '以太网 MAC', en: 'Ethernet MAC', domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Data link', sources: [sourceIeeeEthernet] },
  { id: 'tech-ethernet-switch', zh: '以太网交换机', en: 'Ethernet Switch', domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Data link', sources: [sourceIeeeEthernet] },
  { id: 'tech-vlan', zh: 'VLAN', en: 'VLAN', domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Data link', sources: [sourceIeeeEthernet] },
  { id: 'tech-ip-network', zh: 'IP 网络', en: 'IP Network', domain: 'automotive-ethernet', subdomain: 'Internet Protocol suite', layer: 'Network' },
  { id: 'tech-ipv4', zh: 'IPv4', en: 'IPv4', domain: 'automotive-ethernet', subdomain: 'Internet Protocol suite', layer: 'Network', description: { zh: '互联网协议第 4 版。', en: 'Internet Protocol version 4.' }, details: { definition: localized('互联网协议第 4 版。', 'Internet Protocol version 4.'), purpose: localized('为数据报提供网络层寻址与转发。', 'Provides network-layer addressing and forwarding for datagrams.') }, sources: [sourceIpv4] },
  { id: 'tech-ipv6', zh: 'IPv6', en: 'IPv6', domain: 'automotive-ethernet', subdomain: 'Internet Protocol suite', layer: 'Network', description: { zh: '互联网协议第 6 版。', en: 'Internet Protocol version 6.' }, details: { definition: localized('互联网协议第 6 版。', 'Internet Protocol version 6.') }, sources: [sourceIpv6] },
  { id: 'tech-arp', zh: 'ARP', en: 'ARP', domain: 'automotive-ethernet', subdomain: 'IPv4 address resolution', layer: 'Network / link-layer address resolution', description: { zh: '在以太网上将协议地址映射为 48 位以太网地址的地址解析协议。', en: 'An address-resolution protocol for mapping protocol addresses to 48-bit Ethernet addresses.' }, details: { definition: localized('在以太网上将协议地址映射为 48 位以太网地址的地址解析协议。', 'An address-resolution protocol for mapping protocol addresses to 48-bit Ethernet addresses.') }, sources: [sourceArp] },
  { id: 'tech-ndp', zh: 'NDP', en: 'Neighbor Discovery Protocol (NDP)', domain: 'automotive-ethernet', subdomain: 'IPv6 neighbor discovery', layer: 'Internet Control Message Protocol for IPv6', description: { zh: 'IPv6 邻居发现机制，包含邻居存在性发现、链路层地址发现、路由器发现和可达性维护。', en: 'IPv6 neighbor discovery for presence, link-layer addresses, routers, and reachability.' }, details: { definition: localized('IPv6 邻居发现机制，包含邻居存在性发现、链路层地址发现、路由器发现和可达性维护。', 'IPv6 neighbor discovery for presence, link-layer addresses, routers, and reachability.') }, sources: [sourceNdp] },
  { id: 'tech-diagnostic-tester', zh: '诊断测试仪', en: 'Diagnostic Tester', domain: 'automotive-diagnostics', subdomain: 'Diagnostic participants', layer: 'Diagnostic client' , sources: [sourceUds] },
  { id: 'tech-diagnostic-session', zh: '诊断会话', en: 'Diagnostic Session', domain: 'automotive-diagnostics', subdomain: 'UDS services', layer: 'Application service', sources: [sourceUds] },
  { id: 'tech-dtc', zh: '诊断故障码', en: 'Diagnostic Trouble Code (DTC)', domain: 'automotive-diagnostics', subdomain: 'UDS services', layer: 'Application service', sources: [sourceUds] },
  { id: 'tech-ecu-reprogramming', zh: 'ECU 重编程', en: 'ECU Reprogramming', domain: 'automotive-diagnostics', subdomain: 'Diagnostic services', layer: 'Application service', sources: [sourceUds] },
  { id: 'tech-diagnostic-communication', zh: '诊断通信', en: 'Diagnostic Communication', domain: 'automotive-diagnostics', subdomain: 'Diagnostic systems', layer: 'Vehicle diagnostic function', sources: [sourceUds] },
  { id: 'tech-soa', zh: '面向服务架构', en: 'Service-Oriented Architecture (SOA)', domain: 'automotive-software-architecture', subdomain: 'Automotive software architecture', layer: 'Software architecture', description: { zh: 'Adaptive AUTOSAR 采用的服务导向应用通信方式，支持运行时服务发现与通信。', en: 'A service-oriented application communication approach in Adaptive AUTOSAR, supporting runtime service discovery and communication.' }, details: { definition: localized('Adaptive AUTOSAR 采用的服务导向应用通信方式，支持运行时服务发现与通信。', 'A service-oriented application communication approach in Adaptive AUTOSAR, supporting runtime service discovery and communication.') }, sources: [sourceAutosarAdaptive] },
  { id: 'tech-middleware', zh: '汽车中间件', en: 'Automotive Middleware', domain: 'automotive-software-architecture', subdomain: 'Automotive software architecture', layer: 'Software platform' },
  { id: 'tech-vehicle-software-platform', zh: '车辆软件平台', en: 'Vehicle Software Platform', domain: 'automotive-software-architecture', subdomain: 'Automotive software architecture', layer: 'Vehicle platform' },
  { id: 'tech-fota', zh: 'FOTA', en: 'Firmware Over-the-Air (FOTA)', domain: 'software-defined-vehicle', subdomain: 'Software update', layer: 'Update delivery / firmware' },
  { id: 'tech-sota', zh: 'SOTA', en: 'Software Over-the-Air (SOTA)', domain: 'software-defined-vehicle', subdomain: 'Software update', layer: 'Update delivery / software' },
  { id: 'tech-centralized-computing', zh: '中央计算', en: 'Centralized Computing', domain: 'software-defined-vehicle', subdomain: 'Vehicle E/E and compute architecture', layer: 'E/E architecture' },
  { id: 'tech-vehicle-software-update', zh: '车辆软件更新架构', en: 'Vehicle Software Update Architecture', domain: 'software-defined-vehicle', subdomain: 'Software update', layer: 'Vehicle architecture' },
];
for (const item of coreTechnology) {
  const entity: Entity = {
    id: item.id, category: 'technology', name: localized(item.zh, item.en),
    description: localized(item.description?.zh ?? '', item.description?.en ?? ''), relatesTo: [], relations: [],
    sources: item.sources ?? [], confidence: 'Unverified', reviewStatus: 'Pending Review', createdBy: 'Agent',
    createdAt: now, updatedAt: now, verificationStatus: 'Unverified',
    technologyDetails: { domain: item.domain, subdomain: localized(item.subdomain, item.subdomain), layer: localized(item.layer, item.layer), ...item.details },
  };
  entities.push(entity);
}

const relationSpec: Array<[string, string, RelationType, string, string]> = [
  ['tech-canfd', 'tech-can', 'related_to', 'CAN FD 与 CAN 属于相关的车载通信技术；本链接用于分类，不陈述具体帧格式。', 'CAN FD and CAN are related vehicle communication technologies; this taxonomy link does not specify frame formats.'],
  ['tech-100base', 'tech-ethernet', 'part_of', '100BASE-T1 属于以太网物理层技术系列。', '100BASE-T1 belongs to the Ethernet physical-layer technology family.'],
  ['tech-1000base', 'tech-ethernet', 'part_of', '1000BASE-T1 属于以太网物理层技术系列。', '1000BASE-T1 belongs to the Ethernet physical-layer technology family.'],
  ['tech-ethernet-mac', 'tech-ethernet', 'part_of', 'MAC 是以太网数据链路功能的一部分；实现边界依系统而异。', 'MAC is part of Ethernet data-link functionality; implementation boundaries vary.'],
  ['tech-ethernet-switch', 'tech-ethernet', 'related_to', '交换机用于连接以太网链路；具体网络拓扑未在此处规定。', 'Switches connect Ethernet links; this does not prescribe a network topology.'],
  ['tech-vlan', 'tech-ethernet', 'related_to', 'VLAN 用于以太网二层网络划分。', 'VLAN provides Layer 2 segmentation in Ethernet networks.'],
  ['tech-ipv4', 'tech-ethernet', 'related_to', 'IP 协议可在以太网链路上承载；不表示特定车辆配置。', 'IP can be carried over Ethernet links; no vehicle configuration is implied.'],
  ['tech-ipv6', 'tech-ethernet', 'related_to', 'IP 协议可在以太网链路上承载；不表示特定车辆配置。', 'IP can be carried over Ethernet links; no vehicle configuration is implied.'],
  ['tech-ipv4', 'tech-arp', 'uses', 'IPv4 链路上的地址解析可使用 ARP。', 'Address resolution on IPv4 links can use ARP.'],
  ['tech-ipv6', 'tech-ndp', 'uses', 'IPv6 邻居发现由 NDP 提供。', 'IPv6 neighbor discovery is provided by NDP.'],
  ['tech-ipv4', 'tech-ip-network', 'part_of', '本知识图谱将 IPv4 归入 IP 网络协议族。', 'This knowledge map groups IPv4 within the IP networking family.'],
  ['tech-ipv6', 'tech-ip-network', 'part_of', '本知识图谱将 IPv6 归入 IP 网络协议族。', 'This knowledge map groups IPv6 within the IP networking family.'],
  ['tech-can', 'net-canfd', 'related_to', 'CAN 是 CAN FD 网络使用的技术家族成员；网络实例仅作关联索引。', 'CAN is part of the technology family associated with CAN FD networks; this is a knowledge link.'],
  ['tech-canfd', 'net-canfd', 'related_to', '关联到现有 CAN FD 通信网络实体。', 'Linked to the existing CAN FD communication-network entity.'],
  ['tech-lin', 'net-lin', 'related_to', '关联到现有 LIN 通信网络实体。', 'Linked to the existing LIN communication-network entity.'],
  ['tech-ethernet', 'net-ethernet', 'related_to', '关联到现有车载以太网网络实体。', 'Linked to the existing Automotive Ethernet network entity.'],
  ['tech-100base', 'net-ethernet', 'related_to', '该网络实体作为车载以太网 PHY 技术的架构索引，不代表物理链路配置。', 'The network entity is an architecture index for Ethernet PHY technology, not a physical-link configuration.'],
  ['tech-1000base', 'net-ethernet', 'related_to', '该网络实体作为车载以太网 PHY 技术的架构索引，不代表物理链路配置。', 'The network entity is an architecture index for Ethernet PHY technology, not a physical-link configuration.'],
  ['tech-doip', 'net-ethernet', 'related_to', '与现有车载以太网网络实体关联；具体 DoIP 路由需车型资料确认。', 'Linked to the existing Automotive Ethernet network entity; vehicle-specific DoIP routing needs confirmation.'],
  ['tech-doip', 'sys-network', 'related_to', '与车辆通信网络系统相关；未指定网络拓扑。', 'Related to vehicle communication networks; no topology is specified.'],
  ['tech-centralized-computing', 'ecu-central-compute', 'related_to', '逻辑架构概念与现有中央计算平台参考节点相连，不代表具体车辆配置。', 'The logical architecture concept links to the existing central-compute reference node; no vehicle configuration is implied.'],
  ['tech-ota', 'ecu-tcu', 'related_to', '与现有车载通信单元实体相关；不表示特定更新通路。', 'Related to the existing telematics control unit entity; no specific update path is implied.'],
  ['tech-ota', 'sys-network', 'related_to', '与车辆通信网络相关；具体更新路径依实现而异。', 'Related to vehicle communication networks; the update path varies by implementation.'],
  ['tech-doip', 'tech-ip-network', 'uses', 'DoIP 基于 IP 网络；具体传输细节待来源核实。', 'DoIP uses IP networking; transport details require source verification.'],
  ['tech-doip', 'tech-diagnostic-tester', 'communicates_with', '诊断测试仪是车载诊断通信的对端角色；部署方式依系统而异。', 'A diagnostic tester is a peer in vehicle diagnostic communication; deployment varies.'],
  ['tech-doip', 'ecu-gateway', 'communicates_with', '网关可能参与诊断网络路由；具体 DoIP 角色需车型资料确认。', 'A gateway may participate in diagnostic-network routing; a vehicle-specific DoIP role needs confirmation.'],
  ['tech-doip', 'ecu-vcu', 'communicates_with', 'DoIP 诊断通信可面向 ECU；具体 ECU 配置需车型资料确认。', 'DoIP diagnostics can communicate with ECUs; exact ECU configuration is vehicle-specific.'],
  ['tech-doip', 'tech-uds', 'transports', 'DoIP 可作为承载 UDS 诊断消息的传输方式；待人工核实现行规范版本。', 'DoIP can transport UDS diagnostic messages; current specification editions require human verification.'],
  ['tech-diagnostic-session', 'tech-uds', 'part_of', '诊断会话是 UDS 服务体系中的会话功能。', 'Diagnostic sessions are part of the UDS service model.'],
  ['tech-dtc', 'tech-uds', 'part_of', 'UDS 服务包含诊断信息及故障码相关服务。', 'UDS services include diagnostic-information and trouble-code-related services.'],
  ['tech-ecu-reprogramming', 'tech-uds', 'related_to', 'UDS 服务体系可用于 ECU 编程相关流程；具体流程取决于实现。', 'UDS services can support ECU programming procedures; exact procedures depend on implementation.'],
  ['tech-soa', 'tech-autosar-adaptive', 'related_to', 'AUTOSAR 官方资料描述 Adaptive 平台采用服务导向应用通信。', 'AUTOSAR describes service-oriented application communication in the Adaptive Platform.'],
  ['tech-autosar-classic', 'ecu-vcu', 'related_to', 'Classic AUTOSAR 面向基于微控制器的 ECU 软件架构；不代表该 ECU 的实际配置。', 'Classic AUTOSAR is a microcontroller-oriented ECU software architecture; this does not assert this ECU implementation.'],
  ['tech-autosar-adaptive', 'ecu-adas', 'related_to', 'Adaptive AUTOSAR 官方资料提及 ADAS 场景；不代表该 ECU 的实际软件平台。', 'AUTOSAR materials discuss ADAS use cases; this does not assert this ECU implementation.'],
  ['tech-autosar-classic', 'tech-autosar-adaptive', 'related_to', 'AUTOSAR 官方资料将两平台描述为可兼容、互补并可并行运行。', 'AUTOSAR describes the platforms as compatible and complementary, able to coexist.'],
  ['tech-middleware', 'tech-autosar-adaptive', 'related_to', 'Adaptive AUTOSAR 官方资料描述其采用中间件范式。', 'AUTOSAR describes a middleware paradigm in the Adaptive Platform.'],
  ['tech-sdv', 'tech-centralized-computing', 'related_to', '知识组织关联：SDV 与中央计算相关，但并非互为必要条件。', 'Knowledge-map association: SDV and centralized computing are related, not mutually required.'],
  ['tech-sdv', 'tech-ota', 'related_to', '知识组织关联：OTA 可用于车辆软件演进；不是 SDV 的唯一实现方式。', 'Knowledge-map association: OTA can support vehicle software evolution but is not the sole SDV implementation.'],
  ['tech-fota', 'tech-ota', 'part_of', '本知识图谱将 FOTA 作为 OTA 更新的固件更新类别；术语边界仍待来源核实。', 'This map models FOTA as an OTA firmware-update category; terminology boundaries require verification.'],
  ['tech-sota', 'tech-ota', 'part_of', '本知识图谱将 SOTA 作为 OTA 更新的软件更新类别；术语边界仍待来源核实。', 'This map models SOTA as an OTA software-update category; terminology boundaries require verification.'],
  ['tech-ota', 'ecu-gateway', 'communicates_with', '车辆更新流程可能经车载网络和网关传递；具体拓扑依实现而异。', 'Vehicle updates may traverse in-vehicle networks and gateways; topology varies by implementation.'],
  ['tech-ota', 'tech-vehicle-software-update', 'related_to', 'OTA 是车辆软件更新架构可采用的远程交付路径之一。', 'OTA is one possible remote-delivery path in a vehicle software-update architecture.'],
  ['tech-ota', 'net-ethernet', 'uses', '车辆软件更新数据可通过车载网络分发；具体网络路径需车型资料确认。', 'Vehicle update data may be distributed over in-vehicle networks; exact routes are vehicle-specific.'],
  ['tech-vehicle-software-update', 'tech-diagnostic-communication', 'related_to', '车辆更新与诊断通信可能协同，但具体流程依实现和规范。', 'Vehicle updates and diagnostic communication may interact; procedures depend on implementation and specifications.'],
];
for (const [sourceId, targetId, type, zh, en] of relationSpec) {
  const source = entities.find((entity) => entity.id === sourceId);
  const target = entities.find((entity) => entity.id === targetId);
  if (!source || !target) throw new Error(`Missing technology relation endpoint: ${sourceId} -> ${targetId}`);
  const relation = { targetId, type, description: localized(zh, en) };
  source.relations = [...(source.relations ?? []).filter((item) => item.targetId !== targetId), relation];
  source.relatesTo = Array.from(new Set([...source.relatesTo, targetId]));
}

const technologyMetadata = new Map<string, { domain: TechnologyDomain; subdomain: string; layer: string; sources?: EvidenceSource[]; details?: Partial<TechnologyDetails> }>([
  ['tech-canfd', { domain: 'vehicle-communication', subdomain: 'Vehicle networks', layer: 'Data link / vehicle bus' }],
  ['tech-lin', { domain: 'vehicle-communication', subdomain: 'Vehicle networks', layer: 'Vehicle bus' }],
  ['tech-ethernet', { domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Link and physical technologies', sources: [sourceIeeeEthernet] }],
  ['tech-100base', { domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Physical layer', sources: [sourceIeeeEthernet] }],
  ['tech-1000base', { domain: 'automotive-ethernet', subdomain: 'Automotive Ethernet', layer: 'Physical layer', sources: [sourceIeeeEthernet] }],
  ['tech-doip', { domain: 'automotive-diagnostics', subdomain: 'Diagnostic transport', layer: 'IP transport' }],
  ['tech-uds', { domain: 'automotive-diagnostics', subdomain: 'Unified diagnostic services', layer: 'Application layer', sources: [sourceUds], details: { definition: localized('诊断测试仪（客户端）控制车载 ECU（服务器）诊断功能的应用层服务。', 'Application-layer services for a diagnostic tester (client) to control diagnostic functions in an on-vehicle ECU (server).') } }],
  ['tech-diagnostics', { domain: 'automotive-diagnostics', subdomain: 'Vehicle diagnostics', layer: 'Vehicle diagnostic function' }],
  ['tech-autosar-classic', { domain: 'automotive-software-architecture', subdomain: 'AUTOSAR', layer: 'Microcontroller ECU platform', sources: [sourceAutosarClassic], details: { definition: localized('AUTOSAR Classic 采用应用层、RTE 与基础软件等分层结构，运行于微控制器。', 'AUTOSAR Classic uses layered application, RTE, and basic-software architecture on microcontrollers.'), purpose: localized('为汽车 ECU 软件提供标准化架构与接口。', 'Provides standardized architecture and interfaces for automotive ECU software.'), useCases: localized('官方资料定位于微控制器 ECU 软件；具体产品配置须另行核实。', 'Official materials position it for microcontroller ECUs; product-specific deployment requires separate verification.') } }],
  ['tech-autosar-adaptive', { domain: 'automotive-software-architecture', subdomain: 'AUTOSAR', layer: 'High-performance processor platform', sources: [sourceAutosarAdaptive], details: { definition: localized('AUTOSAR Adaptive 为汽车应用规定基于微处理器的运行环境与标准化接口。', 'AUTOSAR Adaptive specifies a runtime environment and standardized interfaces for automotive applications on microprocessors.'), purpose: localized('支持动态服务通信及高性能处理器平台上的应用。', 'Supports dynamic service communication and applications on microprocessor platforms.'), useCases: localized('AUTOSAR 官方资料涉及 ADAS 等场景；不意味着其取代 Classic。', 'AUTOSAR materials discuss use cases such as ADAS; this does not imply replacement of Classic.') } }],
  ['tech-someip', { domain: 'automotive-software-architecture', subdomain: 'Service communication', layer: 'Middleware / service communication' }],
  ['tech-sdv', { domain: 'software-defined-vehicle', subdomain: 'Vehicle software evolution', layer: 'Vehicle concept' }],
  ['tech-ota', { domain: 'software-defined-vehicle', subdomain: 'Software update', layer: 'Remote update delivery' }],
]);
for (const [id, metadata] of technologyMetadata) {
  const entity = entities.find((item) => item.id === id);
  if (!entity) continue;
  entity.technologyDetails = {
    domain: metadata.domain, subdomain: localized(metadata.subdomain, metadata.subdomain), layer: localized(metadata.layer, metadata.layer),
    ...metadata.details,
  };
  if (metadata.sources?.length) entity.sources = metadata.sources;
  if (['tech-canfd', 'tech-lin', 'tech-ethernet', 'tech-100base', 'tech-1000base', 'tech-doip', 'tech-uds', 'tech-diagnostics', 'tech-someip', 'tech-autosar-classic', 'tech-autosar-adaptive', 'tech-sdv', 'tech-ota'].includes(id)) {
    entity.createdBy = 'Agent';
    entity.reviewStatus = 'Pending Review';
    entity.verificationStatus = 'Unverified';
    entity.confidence = 'Unverified';
  }
}

const standards: Array<[string, string, string, string, string, string[]]> = [
  ['std-14229', 'ISO 14229', 'ISO 14229', '道路车辆统一诊断服务（UDS）系列标准。', 'Road vehicles — Unified diagnostic services (UDS) series.', ['tech-uds']],
  ['std-13400', 'ISO 13400', 'ISO 13400', '道路车辆基于 IP 的诊断通信（DoIP）系列标准。', 'Road vehicles — Diagnostic communication over IP (DoIP) series.', ['tech-doip']],
  ['std-26262', 'ISO 26262', 'ISO 26262', '道路车辆功能安全系列标准。', 'Road vehicles — Functional safety series.', ['tech-iso26262']],
  ['std-21434', 'ISO/SAE 21434', 'ISO/SAE 21434', '道路车辆网络安全工程标准。', 'Road vehicles — Cybersecurity engineering.', ['tech-cybersecurity']],
  ['std-15765', 'ISO 15765', 'ISO 15765', '基于 CAN 的道路车辆诊断通信。', 'Diagnostic communication over CAN for road vehicles.', ['tech-diagnostics', 'tech-canfd']],
  ['std-11898', 'ISO 11898', 'ISO 11898', '道路车辆控制器局域网（CAN）系列标准。', 'Road vehicles — Controller area network (CAN) series.', ['tech-canfd']],
  ['std-20078', 'ISO 20078', 'ISO 20078', '道路车辆扩展车辆（ExVe）Web 服务。', 'Road vehicles — Extended vehicle (ExVe) web services.', []],
  ['std-24089', 'ISO 24089', 'ISO 24089', '道路车辆软件更新工程标准。', 'Road vehicles — Software update engineering.', ['tech-ota']],
];
for (const [id, zh, en, dz, de, links] of standards) add(id, 'standard', zh, en, dz, de, links);

const companies: Array<[string, string, string, string, string, string]> = [
  ['company-toyota', '丰田汽车', 'Toyota Motor Corporation', 'OEM', '汽车整车制造商；此处仅表示行业角色，不表示与特定部件的供应关系。', 'Automotive OEM; inclusion does not imply a specific component supply relationship.'],
  ['company-bosch', '博世', 'Bosch', 'Tier 1 Supplier', '汽车技术与系统供应商；技术领域为一般能力参考。', 'Automotive technology and systems supplier; areas are general capabilities.'],
  ['company-conti', '大陆集团', 'Continental', 'Tier 1 Supplier', '汽车技术与系统供应商；技术领域为一般能力参考。', 'Automotive technology and systems supplier; areas are general capabilities.'],
  ['company-nxp', '恩智浦', 'NXP Semiconductors', 'Semiconductor Supplier', '提供汽车半导体产品与平台。', 'Automotive semiconductor products and platforms.'],
  ['company-infineon', '英飞凌', 'Infineon Technologies', 'Semiconductor Supplier', '提供汽车功率及控制半导体。', 'Automotive power and control semiconductors.'],
  ['company-qualcomm', '高通', 'Qualcomm', 'Technology Provider', '提供汽车计算与连接技术平台。', 'Automotive compute and connectivity technology platforms.'],
  ['company-vector', 'Vector Informatik', 'Vector Informatik', 'Software Supplier', '提供汽车电子开发与工具链软件。', 'Automotive software engineering and toolchain products.'],
  ['company-autosar', 'AUTOSAR', 'AUTOSAR', 'Standards Organization', '汽车开放系统架构合作伙伴组织。', 'Partnership organization for automotive open system architecture.'],
];
for (const [id, zh, en, type, dz, de] of companies) {
  add(id, 'company', zh, en, dz, de, [], allPowertrains, '', 'Unverified');
  entities[entities.length - 1].companyType = type;
}

setRelations('sys-battery', [
  relation('hw-battery-pack', 'contains', '包含动力电池包；内部构型依设计而异。', 'Contains the traction battery pack; internal configuration varies by design.'),
  relation('ecu-bms', 'integrates', '包括电池状态监测与保护功能，控制器集成边界依设计而异。', 'Includes battery-state monitoring and protection functions; controller integration varies by design.'),
  relation('hw-bdu', 'contains', '包含电池断路与预充相关硬件，集成方式依设计而异。', 'Contains battery disconnect and pre-charge related hardware; integration varies by design.'),
  relation('hw-pdu', 'distributes_power_to', '向高压负载配电；与断路单元的边界依设计而异。', 'Distributes power to HV loads; boundary with the disconnect unit varies by design.'),
  ...['sensor-cell-voltage', 'sensor-battery-current', 'sensor-battery-temperature', 'sensor-insulation'].map((id) => relation(id, 'contains', '包含相应测量/监测功能；实现可能集成。', 'Includes the corresponding sensing/monitoring function; implementation may be integrated.')),
  relation('actuator-main-contactor', 'contains', '包括主回路接通/断开执行功能。', 'Includes main-circuit connect/disconnect actuation.'),
  relation('actuator-precharge', 'contains', '包括适用的预充功能。', 'Includes pre-charge functionality where applicable.'),
  relation('hw-hv-fuse', 'contains', '包括高压过流保护元件。', 'Includes high-voltage overcurrent protection.'),
]);
setRelations('hw-battery-pack', [
  relation('hw-cell-module', 'contains', '电池包内电芯/模组层级示意；是否采用独立模组因设计而异。', 'Illustrative cell/module level within the pack; separate modules depend on design.'),
  relation('ecu-bms', 'monitors', '由 BMS 监测其状态；包内采样与控制器布置依设计而异。', 'Monitored by the BMS; in-pack sensing and controller placement vary by design.'),
]);
setRelations('ecu-bms', [
  relation('hw-bmafe', 'uses', '使用电池监测模拟前端采集电芯级测量；集成边界依设计而异。', 'Uses battery-monitoring AFE for cell-level measurements; integration varies by design.'),
  relation('sensor-cell-voltage', 'monitors', '通过电池监测电路获取电芯电压信息。', 'Receives cell-voltage information through battery-monitoring electronics.'),
  relation('sensor-battery-current', 'monitors', '使用电流测量进行电量状态估算与保护。', 'Uses current measurements for state estimation and protection.'),
  relation('sensor-battery-temperature', 'monitors', '使用温度信息进行状态管理与保护。', 'Uses temperature information for state management and protection.'),
  relation('sensor-insulation', 'monitors', '使用绝缘状态信息进行高压安全管理；实现可集成。', 'Uses insulation-status information for HV safety management; implementation may be integrated.'),
  relation('actuator-main-contactor', 'controls', '按高压状态策略控制主回路接触器。', 'Controls the main-circuit contactor according to HV state strategy.'),
  relation('actuator-precharge', 'controls', '按高压上电策略控制预充过程。', 'Controls pre-charge sequencing according to HV startup strategy.'),
  relation('ecu-bms-cmu', 'communicates_with', '与电芯监测单元交换测量数据；通信实现依设计而异。', 'Exchanges measurement data with cell monitoring units; communication implementation varies by design.'),
]);
setRelations('ecu-bms-cmu', [
  relation('sensor-cell-voltage', 'monitors', '采集电芯级电压测量；采样电路可能集成于监测单元。', 'Acquires cell-level voltage measurements; sensing circuitry may be integrated into the monitoring unit.'),
  relation('ecu-bms', 'communicates_with', '向 BMS 控制器提供测量数据。', 'Provides measurement data to the BMS controller.'),
]);
setRelations('hw-bdu', [
  relation('actuator-main-contactor', 'integrates', '通常承载或集成接触器，具体构型因设计而异。', 'Typically accommodates or integrates contactors; configuration varies by design.'),
  relation('actuator-precharge', 'integrates', '通常包含或连接预充回路，具体构型因设计而异。', 'Typically contains or connects the pre-charge circuit; configuration varies by design.'),
  relation('hw-hv-fuse', 'integrates', '保护元件可集成于断路单元或布置在其他位置。', 'Protection may be integrated into the disconnect unit or located elsewhere.'),
]);
setRelations('sys-engine', [
  relation('ecu-engine', 'controls', '由发动机控制单元执行发动机控制功能。', 'Engine control functions are performed by an engine control unit.'),
  relation('sensor-engine-speed', 'contains', '包含适用的发动机转速/位置测量功能。', 'Includes applicable engine speed/position sensing.'),
  relation('sensor-engine-temperature', 'contains', '包含适用的发动机温度测量功能。', 'Includes applicable engine temperature sensing.'),
  relation('actuator-fuel-injector', 'contains', '包含燃油计量与喷射执行功能。', 'Includes fuel metering and injection actuation.'),
  ...['sys-fuel', 'sys-ignition', 'sys-aftertreatment'].map((id) => relation(id, 'integrates', '作为参考系统边界；具体组合依发动机方案而异。', 'Illustrative system boundary; combination varies by engine concept.')),
]);
setRelations('ecu-engine', [
  relation('sensor-engine-speed', 'monitors', '接收发动机转速/位置测量。', 'Receives engine speed/position measurements.'),
  relation('sensor-engine-temperature', 'monitors', '接收发动机温度测量。', 'Receives engine temperature measurements.'),
  relation('sensor-exhaust-oxygen', 'monitors', '在适用配置中接收排气氧测量。', 'Receives exhaust oxygen measurements in applicable configurations.'),
  relation('actuator-fuel-injector', 'controls', '控制燃油喷射执行。', 'Controls fuel injection actuation.'),
]);
setRelations('sys-range-extender', [
  relation('ecu-generator', 'controls', '增程器发电功能的控制边界；车轮牵引由独立电驱路径提供。', 'Control boundary for range-extender generation; wheel traction is provided by a separate electric-drive path.'),
  relation('sys-electric-drive', 'related_to', '独立的车轮牵引电驱路径；发电系统不等同于牵引电驱。', 'Separate wheel-traction electric-drive path; the generator system is not the traction drive.'),
]);
setRelations('sys-fuel-cell', [
  relation('sys-hydrogen', 'depends_on', '依赖氢气储存与供给路径；具体部件布局依设计而异。', 'Depends on hydrogen storage and supply; component layout varies by design.'),
  relation('sys-air-supply', 'depends_on', '依赖氧化剂空气供给；具体平衡部件依设计而异。', 'Depends on oxidant air supply; balance-of-plant details vary by design.'),
  relation('ecu-fuel-cell', 'controls', '由燃料电池控制器监测并协调运行。', 'Monitored and coordinated by a fuel-cell controller.'),
]);
setRelations('sys-hydrogen', [
  relation('hw-hydrogen-storage', 'contains', '包含氢气储存功能；容器与系统集成依设计而异。', 'Contains hydrogen storage functionality; vessel and system integration vary by design.'),
  relation('sensor-hydrogen-pressure', 'contains', '包含适用的氢气压力监测功能。', 'Includes applicable hydrogen pressure sensing.'),
  relation('actuator-hydrogen-isolation', 'contains', '包含适用的氢气隔离执行功能。', 'Includes applicable hydrogen isolation actuation.'),
]);
setRelations('ecu-fuel-cell', [
  relation('sensor-hydrogen-pressure', 'monitors', '接收氢气供给压力状态输入；控制分配依系统设计而异。', 'Receives hydrogen supply pressure-state input; control allocation varies by system design.'),
  relation('actuator-hydrogen-isolation', 'controls', '按燃料电池系统安全策略控制氢气隔离功能。', 'Controls hydrogen isolation according to fuel-cell system safety strategy.'),
  relation('actuator-air-compressor', 'controls', '协调燃料电池空气供给功能。', 'Coordinates fuel-cell air-supply actuation.'),
]);
setRelations('sys-hybrid-control', [
  relation('ecu-hcu', 'controls', '混合动力控制功能的逻辑边界，可能集成于其他控制器。', 'Logical boundary for hybrid control; may be integrated into another controller.'),
]);

const propulsionNames: Record<Propulsion, [string, string, string, string]> = {
  ICE: ['传统燃油车', 'Internal Combustion Engine', '内燃机驱动的通用参考架构。', 'Illustrative reference architecture with an internal combustion engine.'],
  BEV: ['纯电动汽车', 'Battery Electric Vehicle', '动力电池与电机驱动的通用参考架构。', 'Illustrative reference architecture with traction battery and electric drive.'],
  HEV: ['混合动力汽车', 'Hybrid Electric Vehicle', '发动机与电驱动协同工作的通用参考架构。', 'Illustrative reference architecture combining engine and electric drive.'],
  PHEV: ['插电式混合动力汽车', 'Plug-in Hybrid Electric Vehicle', '可外接充电的混合动力通用参考架构。', 'Illustrative reference architecture for plug-in hybrid propulsion.'],
  EREV: ['增程式电动汽车', 'Extended-Range Electric Vehicle', '以电驱动为主并配有增程动力源的通用参考架构。', 'Illustrative electric-drive-first architecture with a range extender.'],
  FCEV: ['燃料电池汽车', 'Fuel Cell Electric Vehicle', '燃料电池与动力电池协同供能的通用参考架构。', 'Illustrative reference architecture combining fuel cell and battery power.'],
};
const architectures: Architecture[] = allPowertrains.map((id, index) => {
  const [zh, en, topoZh, topoEn] = propulsionNames[id];
  const systemIds = powertrainIds[id];
  const available = new Set(systemIds);
  const ecuIds = entities.filter((e) => e.category === 'ecu' && e.appliesTo?.includes(id) && e.relatesTo.some((r) => available.has(r))
    && !['ecu-central-compute', 'ecu-zonal', 'ecu-zonal-front', 'ecu-zonal-rear', 'ecu-powertrain-domain', 'ecu-body-domain', 'ecu-adas-domain', 'ecu-cockpit-domain'].includes(e.id)).map((e) => e.id);
  const eeTypes: Architecture['eeArchitecture'][] = ['Distributed', 'Centralized', 'Domain', 'Zonal', 'Centralized', 'Domain'];
  const eeArchitecture = eeTypes[index];
  const eeControllers: Record<Architecture['eeArchitecture'], string[]> = {
    Distributed: [],
    Domain: ['ecu-powertrain-domain', 'ecu-body-domain', 'ecu-adas-domain', 'ecu-cockpit-domain'],
    Zonal: ['ecu-zonal', 'ecu-zonal-front', 'ecu-zonal-rear'],
    Centralized: ['ecu-central-compute'],
  };
  for (const controllerId of eeControllers[eeArchitecture]) {
    if (entities.some((entity) => entity.id === controllerId && entity.appliesTo?.includes(id) && !ecuIds.includes(controllerId))) ecuIds.push(controllerId);
  }
  return {
    id: `architecture-${id.toLowerCase()}`, propulsion: id,
    name: { zh, en }, topology: { zh: topoZh, en: topoEn }, eeArchitecture,
    systemIds, ecuIds, confidence: 'Medium', reviewStatus: 'Approved', createdBy: 'Human', createdAt: now, updatedAt: now,
    sources: [], verificationStatus: 'Unverified',
  };
});

export const initialData: AppData = { version: 2, entities, architectures };
