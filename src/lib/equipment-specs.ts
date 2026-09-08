'use client';

export interface EquipmentTypeSpecField {
  key: string;
  label: string;
  unit: string;
}

const SPEC_MAP: Record<string, EquipmentTypeSpecField[]> = {
  'Wave Trap': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A' },
    { key: 'frequency', label: 'Frequency', unit: 'Hz' },
    { key: 'inductance', label: 'Inductance', unit: 'mH' },
    { key: 'associated_line', label: 'Associated Line', unit: '' },
  ],
  'Current Transformer (CT)': [
    { key: 'primary_current', label: 'Primary Current', unit: 'A' },
    { key: 'secondary_current', label: 'Secondary Current', unit: 'A' },
    { key: 'ratio', label: 'Ratio', unit: '' },
    { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
    { key: 'burden', label: 'Burden', unit: 'VA' },
    { key: 'core_type', label: 'Core Type', unit: '' },
    { key: 'insulation_level', label: 'Insulation Level', unit: 'kV' },
  ],
  'Potential Transformer (PT)': [
    { key: 'primary_voltage', label: 'Primary Voltage', unit: 'kV' },
    { key: 'secondary_voltage', label: 'Secondary Voltage', unit: 'V' },
    { key: 'ratio', label: 'Ratio', unit: '' },
    { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
    { key: 'burden', label: 'Burden', unit: 'VA' },
  ],
  'Capacitive Voltage Transformer (CVT)': [
    { key: 'primary_voltage', label: 'Primary Voltage', unit: 'kV' },
    { key: 'secondary_voltage', label: 'Secondary Voltage', unit: 'V' },
    { key: 'ratio', label: 'Ratio', unit: '' },
    { key: 'frequency', label: 'Frequency', unit: 'Hz' },
    { key: 'accuracy_class', label: 'Accuracy Class', unit: '' },
    { key: 'burden', label: 'Burden', unit: 'VA' },
  ],
  'Lightning Arrester (LA)': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'mcov', label: 'Maximum Continuous Operating Voltage', unit: 'kV' },
    { key: 'nominal_discharge', label: 'Nominal Discharge Current', unit: 'kA' },
    { key: 'energy_rating', label: 'Energy Rating', unit: 'kJ' },
  ],
  'Circuit Breaker': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A' },
    { key: 'breaking_capacity', label: 'Breaking Capacity', unit: 'kA' },
    { key: 'operating_mechanism', label: 'Operating Mechanism', unit: '' },
    { key: 'insulation_level', label: 'Insulation Level', unit: 'kV' },
  ],
  'Isolator / Disconnector': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A' },
    { key: 'type', label: 'Type', unit: '' },
  ],
  'Earth Switch': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'short_circuit_current', label: 'Short Time Current', unit: 'kA' },
  ],
  'Power Transformer': [
    { key: 'mva_rating', label: 'MVA Rating', unit: 'MVA' },
    { key: 'hv_voltage', label: 'HV Voltage', unit: 'kV' },
    { key: 'lv_voltage', label: 'LV Voltage', unit: 'kV' },
    { key: 'vector_group', label: 'Vector Group', unit: '' },
    { key: 'impedance', label: 'Impedance', unit: '%' },
    { key: 'cooling_type', label: 'Cooling Type', unit: '' },
    { key: 'tap_changer', label: 'Tap Changer Type', unit: '' },
  ],
  'Protection Relay': [
    { key: 'relay_type', label: 'Relay Type', unit: '' },
    { key: 'manufacturer', label: 'Manufacturer', unit: '' },
    { key: 'model', label: 'Model', unit: '' },
    { key: 'protection_functions', label: 'Protection Functions', unit: '' },
    { key: 'protocol', label: 'Communication Protocol', unit: '' },
  ],
  'Battery Bank': [
    { key: 'capacity', label: 'Capacity', unit: 'Ah' },
    { key: 'voltage', label: 'Voltage', unit: 'V' },
    { key: 'cell_type', label: 'Cell Type', unit: '' },
  ],
  'Busbar': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'rated_current', label: 'Rated Current', unit: 'A' },
    { key: 'material', label: 'Material', unit: '' },
  ],
  'Capacitor Bank': [
    { key: 'rated_voltage', label: 'Rated Voltage', unit: 'kV' },
    { key: 'rated_reactive_power', label: 'Reactive Power', unit: 'kVAr' },
  ],
};

export function getSpecFields(typeName: string): EquipmentTypeSpecField[] {
  return SPEC_MAP[typeName] ?? [];
}