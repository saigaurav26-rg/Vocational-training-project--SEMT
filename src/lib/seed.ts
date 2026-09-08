import { db, initSchema } from './db';
import bcrypt from 'bcryptjs';

interface SpecDef {
  key: string;
  label: string;
  value: string;
  unit: string;
}

interface EquipmentTypeDef {
  name: string;
  category: string;
  description: string;
  default_days: number;
  specs: Omit<SpecDef, 'value'>[];
  sampleRatings: Record<string, string>;
}

const EQUIPMENT_TYPES: EquipmentTypeDef[] = [
  {
    name: 'Wave Trap',
    category: 'Line Protection',
    description: 'Wave trap (line trap) blocks high-frequency communication signals while allowing power frequency current to pass.',
    default_days: 180,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'rated_current', label: 'Rated Current', unit: 'A' },
      { key: 'frequency', label: 'Frequency', unit: 'Hz' },
      { key: 'inductance', label: 'Inductance', unit: 'mH' },
      { key: 'associated_line', label: 'Associated Line', unit: '' },
    ],
    sampleRatings: {
      rated_voltage: '132',
      rated_current: '1250',
      frequency: '50',
      inductance: '0.5',
      associated_line: '132 kV Line-1',
    },
  },
  {
    name: 'Current Transformer (CT)',
    category: 'Instrument Transformer',
    description: 'Current transformer steps down primary current to a measurable secondary current for metering and protection.',
    default_days: 365,
    specs: [
      { key: 'primary_current', label: 'Primary Current', unit: 'A' },
      { key: 'secondary_current', label: 'Secondary Current', unit: 'A' },
      { key: 'ratio', label: 'Ratio', unit: '' },
      { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
      { key: 'burden', label: 'Burden', unit: 'VA' },
      { key: 'core_type', label: 'Core Type', unit: '' },
      { key: 'insulation_level', label: 'Insulation Level', unit: 'kV' },
    ],
    sampleRatings: {
      primary_current: '1200',
      secondary_current: '1',
      ratio: '1200/1',
      accuracy_class: '0.5 / 5P20',
      burden: '30',
      core_type: 'Metering + Protection',
      insulation_level: '145',
    },
  },
  {
    name: 'Potential Transformer (PT)',
    category: 'Instrument Transformer',
    description: 'Potential transformer steps down high voltage to standard low voltage for metering and protection.',
    default_days: 365,
    specs: [
      { key: 'primary_voltage', label: 'Primary Voltage', unit: 'kV' },
      { key: 'secondary_voltage', label: 'Secondary Voltage', unit: 'V' },
      { key: 'ratio', label: 'Ratio', unit: '' },
      { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
      { key: 'burden', label: 'Burden', unit: 'VA' },
    ],
    sampleRatings: {
      primary_voltage: '132',
      secondary_voltage: '110',
      ratio: '132000/110',
      accuracy_class: '0.5',
      burden: '100',
    },
  },
  {
    name: 'Capacitive Voltage Transformer (CVT)',
    category: 'Instrument Transformer',
    description: 'CVT combines a capacitive voltage divider and inductive element to provide voltage for metering and protection.',
    default_days: 365,
    specs: [
      { key: 'primary_voltage', label: 'Primary Voltage', unit: 'kV' },
      { key: 'secondary_voltage', label: 'Secondary Voltage', unit: 'V' },
      { key: 'ratio', label: 'Ratio', unit: '' },
      { key: 'frequency', label: 'Frequency', unit: 'Hz' },
      { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
      { key: 'burden', label: 'Burden', unit: 'VA' },
    ],
    sampleRatings: {
      primary_voltage: '220',
      secondary_voltage: '110',
      ratio: '220000/110',
      frequency: '50',
      accuracy_class: '0.5 / 3P',
      burden: '100',
    },
  },
  {
    name: 'Lightning Arrester (LA)',
    category: 'Surge Protection',
    description: 'Lightning arrester protects equipment from over-voltage transients caused by lightning or switching.',
    default_days: 180,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'mcov', label: 'Maximum Continuous Operating Voltage', unit: 'kV' },
      { key: 'nominal_discharge', label: 'Nominal Discharge Current', unit: 'kA' },
      { key: 'energy_rating', label: 'Energy Rating', unit: 'kJ' },
    ],
    sampleRatings: {
      rated_voltage: '120',
      mcov: '98',
      nominal_discharge: '10',
      energy_rating: 'Not specified',
    },
  },
  {
    name: 'Circuit Breaker',
    category: 'Switchgear',
    description: 'Circuit breaker interrupts fault and load currents.',
    default_days: 180,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'rated_current', label: 'Rated Current', unit: 'A' },
      { key: 'breaking_capacity', label: 'Breaking Capacity', unit: 'kA' },
      { key: 'operating_mechanism', label: 'Operating Mechanism', unit: '' },
      { key: 'insulation_level', label: 'Insulation Level', unit: 'kV' },
    ],
    sampleRatings: {
      rated_voltage: '132',
      rated_current: '1250',
      breaking_capacity: '31.5',
      operating_mechanism: 'Spring operated',
      insulation_level: '145',
    },
  },
  {
    name: 'Isolator / Disconnector',
    category: 'Switchgear',
    description: 'Isolator provides visible isolation of equipment when open.',
    default_days: 180,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'rated_current', label: 'Rated Current', unit: 'A' },
      { key: 'type', label: 'Type', unit: '' },
    ],
    sampleRatings: {
      rated_voltage: '132',
      rated_current: '1250',
      type: 'Double break',
    },
  },
  {
    name: 'Earth Switch',
    category: 'Switchgear',
    description: 'Earth switch grounds the circuit for safety.',
    default_days: 365,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'short_circuit_current', label: 'Short Time Current', unit: 'kA' },
    ],
    sampleRatings: {
      rated_voltage: '132',
      short_circuit_current: '31.5',
    },
  },
  {
    name: 'Power Transformer',
    category: 'Power Equipment',
    description: 'Power transformer steps voltage levels between HV and LV sides.',
    default_days: 90,
    specs: [
      { key: 'mva_rating', label: 'MVA Rating', unit: 'MVA' },
      { key: 'hv_voltage', label: 'HV Voltage', unit: 'kV' },
      { key: 'lv_voltage', label: 'LV Voltage', unit: 'kV' },
      { key: 'vector_group', label: 'Vector Group', unit: '' },
      { key: 'impedance', label: 'Impedance', unit: '%' },
      { key: 'cooling_type', label: 'Cooling Type', unit: '' },
      { key: 'tap_changer', label: 'Tap Changer Type', unit: '' },
    ],
    sampleRatings: {
      mva_rating: '40',
      hv_voltage: '132',
      lv_voltage: '33',
      vector_group: 'Dyn11',
      impedance: '12.5',
      cooling_type: 'ONAN/ONAF',
      tap_changer: 'OLTC',
    },
  },
  {
    name: 'Protection Relay',
    category: 'Protection & Control',
    description: 'Protection relay detects faults and commands circuit breakers.',
    default_days: 365,
    specs: [
      { key: 'relay_type', label: 'Relay Type', unit: '' },
      { key: 'manufacturer', label: 'Manufacturer', unit: '' },
      { key: 'model', label: 'Model', unit: '' },
      { key: 'protection_functions', label: 'Protection Functions', unit: '' },
      { key: 'protocol', label: 'Communication Protocol', unit: '' },
    ],
    sampleRatings: {
      relay_type: 'Numerical',
      manufacturer: 'ABB',
      model: 'REF615',
      protection_functions: 'Overcurrent, Earth fault, Distance',
      protocol: 'IEC 61850',
    },
  },
  {
    name: 'Battery Bank',
    category: 'DC System',
    description: 'Battery bank provides DC backup for control and protection.',
    default_days: 180,
    specs: [
      { key: 'capacity', label: 'Capacity', unit: 'Ah' },
      { key: 'voltage', label: 'Voltage', unit: 'V' },
      { key: 'cell_type', label: 'Cell Type', unit: '' },
    ],
    sampleRatings: {
      capacity: '300',
      voltage: '110',
      cell_type: 'Lead acid',
    },
  },
  {
    name: 'Busbar',
    category: 'Conductors',
    description: 'Busbar is a conductor connecting multiple feeders in a substation.',
    default_days: 365,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'rated_current', label: 'Rated Current', unit: 'A' },
      { key: 'material', label: 'Material', unit: '' },
    ],
    sampleRatings: {
      rated_voltage: '132',
      rated_current: '2000',
      material: 'Aluminum alloy',
    },
  },
  {
    name: 'Capacitor Bank',
    category: 'Reactive Compensation',
    description: 'Capacitor bank provides reactive power compensation.',
    default_days: 365,
    specs: [
      { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
      { key: 'rated_reactive_power', label: 'Reactive Power', unit: 'kVAr' },
    ],
    sampleRatings: {
      rated_voltage: '33',
      rated_reactive_power: '5000',
    },
  },
];

export async function seedDatabase(): Promise<void> {
  initSchema();
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  if (userCount.c > 0) return;

  const adminHash = await bcrypt.hash('admin123', 10);
  const engineerHash = await bcrypt.hash('engineer123', 10);
  const staffHash = await bcrypt.hash('staff123', 10);
  const viewerHash = await bcrypt.hash('viewer123', 10);

  const insertUser = db.prepare(
    'INSERT INTO users (email, name, password_hash, role, is_demo) VALUES (?, ?, ?, ?, ?)'
  );
  insertUser.run('admin@semt.local', 'System Administrator', adminHash, 'ADMIN', 0);
  insertUser.run('engineer@semt.local', 'Demo Engineer', engineerHash, 'ENGINEER', 1);
  insertUser.run('staff@semt.local', 'Demo Maintenance Staff', staffHash, 'MAINTENANCE_STAFF', 1);
  insertUser.run('viewer@semt.local', 'Demo Viewer', viewerHash, 'VIEWER', 1);

  const typeIds: Record<string, number> = {};
  const insertType = db.prepare(
    'INSERT INTO equipment_types (name, category, description, default_maintenance_days, active) VALUES (?, ?, ?, ?, 1)'
  );
  for (const t of EQUIPMENT_TYPES) {
    const result = insertType.run(t.name, t.category, t.description, t.default_days);
    typeIds[t.name] = Number(result.lastInsertRowid);
  }

  const substations = [
    {
      name: 'Raipur 220/132 kV Substation',
      code: 'RAI-220',
      location: 'Raipur',
      district: 'Raipur',
      state: 'Chhattisgarh',
      voltage: '220 kV',
      commissioning: '2018-03-15',
      description: 'Major EHV substation providing 220 kV and 132 kV interconnections.',
      status: 'ACTIVE' as const,
    },
    {
      name: 'Bhilai 132/33 kV Substation',
      code: 'BHL-132',
      location: 'Bhilai',
      district: 'Durg',
      state: 'Chhattisgarh',
      voltage: '132 kV',
      commissioning: '2015-08-21',
      description: '132/33 kV industrial substation supplying the Bhilai steel complex.',
      status: 'ACTIVE' as const,
    },
    {
      name: 'Korba 220 kV Substation',
      code: 'KOR-220',
      location: 'Korba',
      district: 'Korba',
      state: 'Chhattisgarh',
      voltage: '220 kV',
      commissioning: '2012-11-05',
      description: 'Power station switchyard associated with Korba thermal generation.',
      status: 'ACTIVE' as const,
    },
    {
      name: 'Bilaspur 132 kV Substation',
      code: 'BSP-132',
      location: 'Bilaspur',
      district: 'Bilaspur',
      state: 'Chhattisgarh',
      voltage: '132 kV',
      commissioning: '2020-06-12',
      description: '132 kV substation supporting Bilaspur regional distribution.',
      status: 'UNDER_MAINTENANCE' as const,
    },
  ];

  const insertSub = db.prepare(
    `INSERT INTO substations
      (substation_name, substation_code, location, district, state, voltage_level, commissioning_date, description, status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const subIds: number[] = [];
  for (const s of substations) {
    const r = insertSub.run(s.name, s.code, s.location, s.district, s.state, s.voltage, s.commissioning, s.description, s.status);
    subIds.push(Number(r.lastInsertRowid));
  }

  type EqSpec = {
    typeName: string;
    tag: string;
    name: string;
    subIndex: number;
    bay: string;
    feeder: string;
    manufacturer: string;
    model: string;
    serial: string;
    install: string;
    commission: string;
    condition: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    criticality: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
    status: 'ACTIVE' | 'UNDER_MAINTENANCE' | 'OUT_OF_SERVICE' | 'DECOMMISSIONED';
    voltage: string;
    lastMaint: string;
    nextMaint: string;
    frequency: number;
    location: string;
    responsible: string;
  };

  const equipmentList: EqSpec[] = [
    // Raipur 220
    { typeName: 'Wave Trap', tag: 'WT-RAI-001', name: 'Wave Trap Line 1', subIndex: 0, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'ABB', model: 'LR-132', serial: 'ABB-WT-2020-001', install: '2018-04-10', commission: '2018-04-20', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-02-15', nextMaint: '2026-08-15', frequency: 180, location: 'Yard-A', responsible: 'Demo Engineer' },
    { typeName: 'Current Transformer (CT)', tag: 'CT-RAI-001', name: 'CT Bay 1', subIndex: 0, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'Siemens', model: '4MA4-132', serial: 'SIE-CT-2020-001', install: '2018-04-12', commission: '2018-04-22', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-01-10', nextMaint: '2026-09-25', frequency: 365, location: 'Bay-1', responsible: 'Demo Engineer' },
    { typeName: 'Capacitive Voltage Transformer (CVT)', tag: 'CVT-RAI-001', name: 'CVT Bay 1', subIndex: 0, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'Areva', model: 'CMB-220', serial: 'ARV-CVT-2019-002', install: '2018-04-15', commission: '2018-04-25', condition: 'FAIR', criticality: 'HIGH', status: 'ACTIVE', voltage: '220 kV', lastMaint: '2025-09-05', nextMaint: '2026-07-05', frequency: 365, location: 'Bay-1', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Lightning Arrester (LA)', tag: 'LA-RAI-001', name: 'LA Bay 1', subIndex: 0, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'OBO Bettermann', model: 'V20-C/3', serial: 'OBO-LA-2020-005', install: '2018-04-18', commission: '2018-04-28', condition: 'GOOD', criticality: 'MEDIUM', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-04-01', nextMaint: '2026-10-01', frequency: 180, location: 'Bay-1', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Circuit Breaker', tag: 'CB-RAI-001', name: 'Circuit Breaker Bay 1', subIndex: 0, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'Siemens', model: '3AP1FG-132', serial: 'SIE-CB-2018-011', install: '2018-04-05', commission: '2018-04-15', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-03-10', nextMaint: '2026-09-10', frequency: 180, location: 'Bay-1', responsible: 'Demo Engineer' },
    { typeName: 'Power Transformer', tag: 'PT-RAI-001', name: 'Power Transformer 1', subIndex: 0, bay: 'Bay-T1', feeder: 'T1', manufacturer: 'Crompton Greaves', model: '40MVA', serial: 'CG-PT-2018-100', install: '2018-03-01', commission: '2018-03-15', condition: 'EXCELLENT', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '220/132 kV', lastMaint: '2026-05-15', nextMaint: '2026-08-15', frequency: 90, location: 'Yard-T1', responsible: 'Demo Engineer' },
    { typeName: 'Protection Relay', tag: 'RLY-RAI-001', name: 'Line Protection Relay', subIndex: 0, bay: 'Panel-A', feeder: 'Line-1', manufacturer: 'ABB', model: 'REF615', serial: 'ABB-RLY-2019-302', install: '2019-02-10', commission: '2019-02-20', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-02-20', nextMaint: '2027-02-20', frequency: 365, location: 'Relay Panel', responsible: 'Demo Engineer' },
    { typeName: 'Battery Bank', tag: 'BAT-RAI-001', name: '110V Battery Bank', subIndex: 0, bay: 'Battery Room', feeder: 'DC', manufacturer: 'Exide', model: '300Ah', serial: 'EXI-BAT-2019-450', install: '2019-01-12', commission: '2019-01-22', condition: 'FAIR', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '110 V DC', lastMaint: '2025-12-05', nextMaint: '2026-06-15', frequency: 180, location: 'Battery Room', responsible: 'Demo Maintenance Staff' },

    // Bhilai 132
    { typeName: 'Wave Trap', tag: 'WT-BHL-001', name: 'Wave Trap Feeder 1', subIndex: 1, bay: 'Bay-A', feeder: 'Feeder-1', manufacturer: 'ABB', model: 'LR-132', serial: 'ABB-WT-2017-021', install: '2015-09-01', commission: '2015-09-12', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-01-20', nextMaint: '2026-07-20', frequency: 180, location: 'Yard-A', responsible: 'Demo Engineer' },
    { typeName: 'Current Transformer (CT)', tag: 'CT-BHL-001', name: 'CT Feeder 1', subIndex: 1, bay: 'Bay-A', feeder: 'Feeder-1', manufacturer: 'ABB', model: 'IMB-132', serial: 'ABB-CT-2017-033', install: '2015-09-05', commission: '2015-09-15', condition: 'POOR', criticality: 'HIGH', status: 'UNDER_MAINTENANCE', voltage: '132 kV', lastMaint: '2025-08-15', nextMaint: '2026-05-20', frequency: 365, location: 'Bay-A', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Potential Transformer (PT)', tag: 'PT-BHL-001', name: 'PT Bus', subIndex: 1, bay: 'Bus', feeder: 'Bus', manufacturer: 'Siemens', model: 'PVS-132', serial: 'SIE-PT-2017-044', install: '2015-09-08', commission: '2015-09-18', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2025-11-10', nextMaint: '2026-11-10', frequency: 365, location: 'Bus', responsible: 'Demo Engineer' },
    { typeName: 'Circuit Breaker', tag: 'CB-BHL-001', name: 'CB Feeder 1', subIndex: 1, bay: 'Bay-A', feeder: 'Feeder-1', manufacturer: 'Crompton Greaves', model: 'CG-132', serial: 'CG-CB-2017-066', install: '2015-09-12', commission: '2015-09-22', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-02-28', nextMaint: '2026-08-28', frequency: 180, location: 'Bay-A', responsible: 'Demo Engineer' },
    { typeName: 'Isolator / Disconnector', tag: 'ISO-BHL-001', name: 'Isolator Feeder 1', subIndex: 1, bay: 'Bay-A', feeder: 'Feeder-1', manufacturer: 'Prowell', model: 'ISO-132', serial: 'PRW-ISO-2017-088', install: '2015-09-15', commission: '2015-09-25', condition: 'GOOD', criticality: 'MEDIUM', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-03-05', nextMaint: '2026-09-05', frequency: 180, location: 'Bay-A', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Capacitor Bank', tag: 'CAP-BHL-001', name: 'Capacitor Bank', subIndex: 1, bay: 'Yard', feeder: 'Bus', manufacturer: 'EPCOS', model: 'CB-5000', serial: 'EPC-CAP-2017-101', install: '2015-10-01', commission: '2015-10-12', condition: 'GOOD', criticality: 'MEDIUM', status: 'ACTIVE', voltage: '33 kV', lastMaint: '2026-04-10', nextMaint: '2026-10-10', frequency: 180, location: 'Yard', responsible: 'Demo Maintenance Staff' },

    // Korba 220
    { typeName: 'Power Transformer', tag: 'PT-KOR-001', name: 'Generator Transformer 1', subIndex: 2, bay: 'Bay-GT1', feeder: 'GT1', manufacturer: 'BHEL', model: '210MVA', serial: 'BHL-PT-2012-201', install: '2012-11-01', commission: '2012-11-05', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '220/15.75 kV', lastMaint: '2026-05-25', nextMaint: '2026-08-25', frequency: 90, location: 'Yard-GT', responsible: 'Demo Engineer' },
    { typeName: 'Circuit Breaker', tag: 'CB-KOR-001', name: 'Bus Coupler Breaker', subIndex: 2, bay: 'Bus', feeder: 'Coupler', manufacturer: 'ABB', model: 'LTA-220', serial: 'ABB-CB-2012-077', install: '2012-11-02', commission: '2012-11-08', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '220 kV', lastMaint: '2026-04-12', nextMaint: '2026-10-12', frequency: 180, location: 'Bus', responsible: 'Demo Engineer' },
    { typeName: 'Lightning Arrester (LA)', tag: 'LA-KOR-001', name: 'LA Transformer 1', subIndex: 2, bay: 'Bay-GT1', feeder: 'GT1', manufacturer: 'OBO Bettermann', model: 'V25-B/3', serial: 'OBO-LA-2012-050', install: '2012-11-04', commission: '2012-11-10', condition: 'FAIR', criticality: 'MEDIUM', status: 'ACTIVE', voltage: '220 kV', lastMaint: '2025-09-12', nextMaint: '2026-05-30', frequency: 180, location: 'Yard-GT', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Busbar', tag: 'BUS-KOR-001', name: '220 kV Main Bus', subIndex: 2, bay: 'Bus', feeder: 'Main', manufacturer: 'Generic', model: 'Tubular', serial: 'BUS-KOR-2012-001', install: '2012-10-01', commission: '2012-11-05', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '220 kV', lastMaint: '2026-03-15', nextMaint: '2027-03-15', frequency: 365, location: 'Yard', responsible: 'Demo Engineer' },
    { typeName: 'Protection Relay', tag: 'RLY-KOR-001', name: 'Transformer Differential Relay', subIndex: 2, bay: 'Panel-B', feeder: 'GT1', manufacturer: 'Siemens', model: '7UT612', serial: 'SIE-RLY-2018-401', install: '2018-06-01', commission: '2018-06-15', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '220 kV', lastMaint: '2026-01-05', nextMaint: '2027-01-05', frequency: 365, location: 'Relay Panel', responsible: 'Demo Engineer' },

    // Bilaspur 132
    { typeName: 'Wave Trap', tag: 'WT-BSP-001', name: 'Wave Trap Line 1', subIndex: 3, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'ABB', model: 'LR-132', serial: 'ABB-WT-2020-101', install: '2020-07-01', commission: '2020-07-12', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-02-15', nextMaint: '2026-08-15', frequency: 180, location: 'Yard', responsible: 'Demo Engineer' },
    { typeName: 'Current Transformer (CT)', tag: 'CT-BSP-001', name: 'CT Line 1', subIndex: 3, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'Schweitzer', model: 'CT-132', serial: 'SEL-CT-2020-202', install: '2020-07-04', commission: '2020-07-15', condition: 'EXCELLENT', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-04-22', nextMaint: '2027-04-22', frequency: 365, location: 'Bay-1', responsible: 'Demo Engineer' },
    { typeName: 'Potential Transformer (PT)', tag: 'PT-BSP-001', name: 'PT Bus', subIndex: 3, bay: 'Bus', feeder: 'Bus', manufacturer: 'GE', model: 'JVF-132', serial: 'GE-PT-2020-303', install: '2020-07-08', commission: '2020-07-20', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2025-12-15', nextMaint: '2026-12-15', frequency: 365, location: 'Bus', responsible: 'Demo Engineer' },
    { typeName: 'Lightning Arrester (LA)', tag: 'LA-BSP-001', name: 'LA Line 1', subIndex: 3, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'OBO Bettermann', model: 'V20-C/3', serial: 'OBO-LA-2020-404', install: '2020-07-10', commission: '2020-07-22', condition: 'GOOD', criticality: 'MEDIUM', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-03-20', nextMaint: '2026-09-20', frequency: 180, location: 'Bay-1', responsible: 'Demo Maintenance Staff' },
    { typeName: 'Circuit Breaker', tag: 'CB-BSP-001', name: 'CB Line 1', subIndex: 3, bay: 'Bay-1', feeder: 'Line-1', manufacturer: 'ABB', model: '3AP1FI-132', serial: 'ABB-CB-2020-505', install: '2020-07-12', commission: '2020-07-25', condition: 'GOOD', criticality: 'CRITICAL', status: 'ACTIVE', voltage: '132 kV', lastMaint: '2026-05-01', nextMaint: '2026-11-01', frequency: 180, location: 'Bay-1', responsible: 'Demo Engineer' },
    { typeName: 'Battery Bank', tag: 'BAT-BSP-001', name: '110V Battery Bank', subIndex: 3, bay: 'Battery Room', feeder: 'DC', manufacturer: 'Amara Raja', model: '200Ah', serial: 'AR-BAT-2020-606', install: '2020-08-01', commission: '2020-08-15', condition: 'GOOD', criticality: 'HIGH', status: 'ACTIVE', voltage: '110 V DC', lastMaint: '2026-02-10', nextMaint: '2026-08-10', frequency: 180, location: 'Battery Room', responsible: 'Demo Maintenance Staff' },
  ];

  const insertEquipment = db.prepare(
    `INSERT INTO equipment
      (equipment_tag, equipment_name, equipment_type_id, substation_id, manufacturer, model_number, serial_number,
       installation_date, commissioning_date, location, bay, feeder, voltage_level, status, condition, criticality,
       description, last_maintenance_date, next_maintenance_date, maintenance_frequency_days, responsible_person, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const insertRating = db.prepare(
    'INSERT INTO equipment_ratings (equipment_id, spec_key, spec_label, spec_value, unit) VALUES (?, ?, ?, ?, ?)'
  );

  const eqIds: Record<string, number> = {};
  for (const e of equipmentList) {
    const typeId = typeIds[e.typeName];
    if (!typeId) continue;
    const subId = subIds[e.subIndex];
    const r = insertEquipment.run(
      e.tag,
      e.name,
      typeId,
      subId,
      e.manufacturer,
      e.model,
      e.serial,
      e.install,
      e.commission,
      e.location,
      e.bay,
      e.feeder,
      e.voltage,
      e.status,
      e.condition,
      e.criticality,
      `Sample ${e.typeName} installed during commissioning of the substation.`,
      e.lastMaint,
      e.nextMaint,
      e.frequency,
      e.responsible
    );
    const eqId = Number(r.lastInsertRowid);
    eqIds[e.tag] = eqId;
    const typeDef = EQUIPMENT_TYPES.find((t) => t.name === e.typeName);
    if (typeDef) {
      for (const spec of typeDef.specs) {
        const val = typeDef.sampleRatings[spec.key] ?? 'Not specified';
        insertRating.run(eqId, spec.key, spec.label, val, spec.unit);
      }
    }
  }

  const insertMaint = db.prepare(
    `INSERT INTO maintenance_logs
      (equipment_id, maintenance_type, maintenance_date, performed_by, maintenance_reason, observations, work_performed,
       parts_replaced, test_results, condition_before, condition_after, downtime_hours, recommendations,
       next_maintenance_date, status, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );
  const insertInsp = db.prepare(
    `INSERT INTO inspection_logs
      (equipment_id, inspection_date, inspector, inspection_type, condition, observations, abnormalities, measurements,
       recommendations, next_action, follow_up_date, is_demo)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`
  );

  const sampleMaintenances: Array<{
    tag: string;
    type: string;
    date: string;
    performer: string;
    reason: string;
    obs: string;
    work: string;
    parts: string;
    test: string;
    before: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    after: 'EXCELLENT' | 'GOOD' | 'FAIR' | 'POOR' | 'CRITICAL';
    downtime: number;
    rec: string;
    next: string;
    status: string;
  }> = [
    { tag: 'WT-RAI-001', type: 'PREVENTIVE', date: '2026-02-15', performer: 'Demo Maintenance Staff', reason: 'Scheduled preventive maintenance', obs: 'Wave trap insulation surfaces clean, no visible damage.', work: 'Visual inspection, cleaning of insulator surfaces, tightness check of all connections.', parts: 'None', test: 'Insulation resistance measured 4500 MΩ at 5 kV.', before: 'GOOD', after: 'GOOD', downtime: 0.5, rec: 'Continue six-monthly schedule.', next: '2026-08-15', status: 'COMPLETED' },
    { tag: 'CT-RAI-001', type: 'PREVENTIVE', date: '2026-01-10', performer: 'Demo Maintenance Staff', reason: 'Annual maintenance schedule', obs: 'Secondary terminals cleaned, ratio test passed.', work: 'Ratio and polarity test, burden check, cleaning.', parts: 'None', test: 'Ratio error 0.2% within class 0.5 limits.', before: 'GOOD', after: 'GOOD', downtime: 1, rec: 'Annual schedule adequate.', next: '2027-01-10', status: 'COMPLETED' },
    { tag: 'CVT-RAI-001', type: 'CORRECTIVE', date: '2025-09-05', performer: 'Demo Engineer', reason: 'Capacitor stack showing drift', obs: 'Secondary voltage variation noted during switching.', work: 'Capacitor unit inspection, replaced stack section.', parts: '1× Capacitor unit', test: 'Ratio within limits, accuracy class restored.', before: 'FAIR', after: 'FAIR', downtime: 6, rec: 'Schedule next maintenance in 12 months.', next: '2026-09-05', status: 'COMPLETED' },
    { tag: 'CB-RAI-001', type: 'PREVENTIVE', date: '2026-03-10', performer: 'Demo Engineer', reason: 'Scheduled maintenance', obs: 'Mechanism operations smooth.', work: 'Mechanism lubrication, contact wear measurement, timing test.', parts: 'None', test: 'Closing time 35 ms, opening time 22 ms within limits.', before: 'GOOD', after: 'GOOD', downtime: 2, rec: 'Continue schedule.', next: '2026-09-10', status: 'COMPLETED' },
    { tag: 'PT-RAI-001', type: 'PREVENTIVE', date: '2026-05-15', performer: 'Demo Engineer', reason: 'Quarterly preventive maintenance', obs: 'Oil temperature normal, silica gel active.', work: 'Oil sampling, BDV test, thermography, tightening of joints.', parts: 'None', test: 'BDV 65 kV at 2.5 mm gap.', before: 'EXCELLENT', after: 'EXCELLENT', downtime: 4, rec: 'Maintain quarterly schedule.', next: '2026-08-15', status: 'COMPLETED' },
    { tag: 'BAT-RAI-001', type: 'PREVENTIVE', date: '2025-12-05', performer: 'Demo Maintenance Staff', reason: 'Half-yearly battery maintenance', obs: 'Some cell voltages below expected.', work: 'Equalizing charge applied, terminal cleaning.', parts: 'None', test: 'Cell voltages restored to 2.23 V ± 0.05 V.', before: 'GOOD', after: 'FAIR', downtime: 2, rec: 'Reduce interval to quarterly.', next: '2026-06-05', status: 'COMPLETED' },
    { tag: 'CT-BHL-001', type: 'CORRECTIVE', date: '2025-08-15', performer: 'Demo Engineer', reason: 'Abnormal secondary current during inspection', obs: 'Secondary circuit resistance elevated.', work: 'Loop resistance check, identified and repaired loose terminal.', parts: '1× Terminal block', test: 'Loop resistance within limits.', before: 'GOOD', after: 'POOR', downtime: 4, rec: 'Replace CT at next outage.', next: '2025-12-15', status: 'COMPLETED' },
    { tag: 'PT-KOR-001', type: 'PREVENTIVE', date: '2026-05-25', performer: 'Demo Engineer', reason: 'Quarterly preventive', obs: 'All parameters within limits.', work: 'Oil filtration, gas analysis, thermography.', parts: 'None', test: 'DGA within IEEE limits.', before: 'GOOD', after: 'GOOD', downtime: 6, rec: 'Continue schedule.', next: '2026-08-25', status: 'COMPLETED' },
    { tag: 'BUS-KOR-001', type: 'INSPECTION', date: '2026-03-15', performer: 'Demo Engineer', reason: 'Annual bus inspection', obs: 'No hot spots observed.', work: 'Thermography scan of all bolted connections.', parts: 'None', test: 'All joints within 5K of reference.', before: 'GOOD', after: 'GOOD', downtime: 0, rec: 'Continue annual schedule.', next: '2027-03-15', status: 'COMPLETED' },
  ];

  for (const m of sampleMaintenances) {
    const eqId = eqIds[m.tag];
    if (!eqId) continue;
    insertMaint.run(
      eqId,
      m.type,
      m.date,
      m.performer,
      m.reason,
      m.obs,
      m.work,
      m.parts,
      m.test,
      m.before,
      m.after,
      m.downtime,
      m.rec,
      m.next,
      m.status
    );
  }

  const sampleInspections = [
    { tag: 'WT-RAI-001', date: '2026-04-10', inspector: 'Demo Engineer', type: 'ROUTINE', condition: 'GOOD', obs: 'No abnormalities detected.', abn: 'None', meas: 'Insulation 4500 MΩ', rec: 'Continue schedule.', action: 'Routine', follow: '2026-10-10' },
    { tag: 'CT-RAI-001', date: '2026-03-12', inspector: 'Demo Engineer', type: 'PERIODIC', condition: 'GOOD', obs: 'All parameters nominal.', abn: 'None', meas: 'Ratio 1200/1 ±0.2%', rec: 'Continue annual schedule.', action: 'Periodic', follow: '2027-03-12' },
    { tag: 'CVT-RAI-001', date: '2026-04-05', inspector: 'Demo Engineer', type: 'ROUTINE', condition: 'FAIR', obs: 'Slight drift observed, watch carefully.', abn: 'Secondary voltage variation', meas: 'Drift 1.5%', rec: 'Increase to quarterly inspections.', action: 'Quarterly inspection', follow: '2026-07-05' },
    { tag: 'BAT-RAI-001', date: '2026-04-20', inspector: 'Demo Maintenance Staff', type: 'PRE_MONSOON', condition: 'FAIR', obs: 'Cell 18 voltage low.', abn: 'One weak cell identified', meas: 'Cell 18 voltage 2.10V', rec: 'Schedule equalizing charge.', action: 'Equalizing charge', follow: '2026-05-05' },
    { tag: 'CB-BHL-001', date: '2026-05-02', inspector: 'Demo Engineer', type: 'PRE_MONSOON', condition: 'GOOD', obs: 'All clear.', abn: 'None', meas: 'Operation counter 1247', rec: 'Continue schedule.', action: 'Continue routine', follow: '2026-11-02' },
    { tag: 'PT-KOR-001', date: '2026-06-01', inspector: 'Demo Engineer', type: 'PERIODIC', condition: 'GOOD', obs: 'Oil temp 56°C, normal.', abn: 'None', meas: 'Oil temp 56°C', rec: 'Continue.', action: 'Continue', follow: '2026-09-01' },
  ];

  for (const i of sampleInspections) {
    const eqId = eqIds[i.tag];
    if (!eqId) continue;
    insertInsp.run(
      eqId,
      i.date,
      i.inspector,
      i.type,
      i.condition,
      i.obs,
      i.abn,
      i.meas,
      i.rec,
      i.action,
      i.follow
    );
  }

  const insertSchedule = db.prepare(
    `INSERT INTO maintenance_schedules
      (equipment_id, maintenance_type, frequency, frequency_days, last_completed, next_due, responsible_person, priority, status, notes)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
  );
  for (const e of equipmentList) {
    const eqId = eqIds[e.tag];
    if (!eqId) continue;
    insertSchedule.run(
      eqId,
      'PREVENTIVE',
      e.frequency === 90 ? 'QUARTERLY' : e.frequency === 180 ? 'HALF_YEARLY' : 'YEARLY',
      e.frequency,
      e.lastMaint,
      e.nextMaint,
      e.responsible,
      e.criticality,
      'PLANNED',
      `Scheduled preventive maintenance for ${e.name}.`
    );
  }

  const insertAudit = db.prepare(
    'INSERT INTO audit_logs (user_id, action, entity, entity_id, field, old_value, new_value) VALUES (?, ?, ?, ?, ?, ?, ?)'
  );
  const adminId = (db.prepare('SELECT id FROM users WHERE email = ?').get('admin@semt.local') as { id: number }).id;
  const engineerId = (db.prepare('SELECT id FROM users WHERE email = ?').get('engineer@semt.local') as { id: number }).id;
  insertAudit.run(adminId, 'SEED', 'substations', null, null, null, 'Seeded sample substations');
  insertAudit.run(adminId, 'SEED', 'equipment', null, null, null, 'Seeded sample equipment records');
  insertAudit.run(engineerId, 'SEED', 'maintenance_logs', null, null, null, 'Seeded sample maintenance history');
  insertAudit.run(engineerId, 'SEED', 'inspection_logs', null, null, null, 'Seeded sample inspection history');
}