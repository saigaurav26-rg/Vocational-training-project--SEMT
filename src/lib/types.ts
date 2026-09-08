export type Role = 'ADMIN' | 'ENGINEER' | 'MAINTENANCE_STAFF' | 'VIEWER';

export type EquipmentStatus =
  | 'ACTIVE'
  | 'UNDER_MAINTENANCE'
  | 'OUT_OF_SERVICE'
  | 'DECOMMISSIONED';

export type EquipmentCondition =
  | 'EXCELLENT'
  | 'GOOD'
  | 'FAIR'
  | 'POOR'
  | 'CRITICAL';

export type Criticality = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type SubstationStatus =
  | 'ACTIVE'
  | 'INACTIVE'
  | 'UNDER_MAINTENANCE'
  | 'DECOMMISSIONED';

export type MaintenanceType =
  | 'PREVENTIVE'
  | 'CORRECTIVE'
  | 'PREDICTIVE'
  | 'BREAKDOWN'
  | 'INSPECTION'
  | 'EMERGENCY'
  | 'ROUTINE';

export type MaintenanceStatus =
  | 'PLANNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED';

export type InspectionType =
  | 'ROUTINE'
  | 'PERIODIC'
  | 'PRE_MONSOON'
  | 'POST_MONSOON'
  | 'PREVENTIVE'
  | 'SPECIAL'
  | 'BREAKDOWN';

export type ScheduleFrequency =
  | 'MONTHLY'
  | 'QUARTERLY'
  | 'HALF_YEARLY'
  | 'YEARLY'
  | 'CUSTOM';

export interface User {
  id: number;
  email: string;
  name: string;
  role: Role;
  created_at: string;
  is_demo: number;
}

export interface Substation {
  id: number;
  substation_name: string;
  substation_code: string;
  location: string;
  district: string;
  state: string;
  voltage_level: string;
  commissioning_date: string | null;
  description: string | null;
  status: SubstationStatus;
  created_at: string;
  updated_at: string;
  is_demo: number;
}

export interface EquipmentType {
  id: number;
  name: string;
  category: string;
  description: string | null;
  default_maintenance_days: number;
  active: number;
  created_at: string;
}

export interface Equipment {
  id: number;
  equipment_tag: string;
  equipment_name: string;
  equipment_type_id: number;
  substation_id: number;
  manufacturer: string;
  model_number: string;
  serial_number: string;
  installation_date: string | null;
  commissioning_date: string | null;
  location: string;
  bay: string;
  feeder: string;
  voltage_level: string;
  status: EquipmentStatus;
  condition: EquipmentCondition;
  criticality: Criticality;
  description: string | null;
  last_maintenance_date: string | null;
  next_maintenance_date: string | null;
  maintenance_frequency_days: number;
  responsible_person: string | null;
  created_at: string;
  updated_at: string;
  is_demo: number;
}

export interface EquipmentRating {
  id: number;
  equipment_id: number;
  spec_key: string;
  spec_label: string;
  spec_value: string;
  unit: string;
}

export interface MaintenanceLog {
  id: number;
  equipment_id: number;
  maintenance_type: MaintenanceType;
  maintenance_date: string;
  performed_by: string;
  maintenance_reason: string;
  observations: string | null;
  work_performed: string | null;
  parts_replaced: string | null;
  test_results: string | null;
  condition_before: EquipmentCondition;
  condition_after: EquipmentCondition;
  downtime_hours: number;
  recommendations: string | null;
  next_maintenance_date: string | null;
  status: MaintenanceStatus;
  is_demo: number;
  created_at: string;
  updated_at: string;
}

export interface InspectionLog {
  id: number;
  equipment_id: number;
  inspection_date: string;
  inspector: string;
  inspection_type: InspectionType;
  condition: EquipmentCondition;
  observations: string | null;
  abnormalities: string | null;
  measurements: string | null;
  recommendations: string | null;
  next_action: string | null;
  follow_up_date: string | null;
  triggered_maintenance_id: number | null;
  is_demo: number;
  created_at: string;
}

export interface MaintenanceSchedule {
  id: number;
  equipment_id: number;
  maintenance_type: MaintenanceType;
  frequency: ScheduleFrequency;
  frequency_days: number;
  last_completed: string | null;
  next_due: string;
  responsible_person: string | null;
  priority: Criticality;
  status: MaintenanceStatus;
  notes: string | null;
}

export interface Notification {
  id: number;
  user_id: number | null;
  equipment_id: number | null;
  type: string;
  title: string;
  message: string;
  severity: 'INFO' | 'WARNING' | 'CRITICAL';
  read: number;
  created_at: string;
}

export interface AuditLog {
  id: number;
  user_id: number | null;
  action: string;
  entity: string;
  entity_id: number | null;
  field: string | null;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export interface Session {
  id: string;
  user_id: number;
  expires_at: string;
  created_at: string;
}

export interface EquipmentWithRelations extends Equipment {
  equipment_type_name: string;
  equipment_type_category: string;
  substation_name: string;
  substation_code: string;
}