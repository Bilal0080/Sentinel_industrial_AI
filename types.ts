
export enum HazardSeverity {
  LOW = 'LOW',
  MEDIUM = 'MEDIUM',
  HIGH = 'HIGH',
  CRITICAL = 'CRITICAL'
}

export interface HazardDetail {
  title: string;
  category: string;
  potentialRisk: string;
  preventativeMeasure: string;
  thermalImpact?: string;
  footwearCause?: string;
  severity: HazardSeverity;
}

export interface HealthObservation {
  symptom: string;
  timeframe: string;
  severity: HazardSeverity;
  actionRequired: string;
}

export interface AnalysisResult {
  hazards: HazardDetail[];
  severity: HazardSeverity;
  recommendations: string[];
  watchlist?: HealthObservation[];
  metabolicHeatIndex?: number;
}

export interface EmployeeFitnessResult {
  status: 'FIT' | 'UNFIT' | 'AT-RISK';
  vitalityScore: number;
  observations: string[];
  ppeCompliant: boolean;
  detectedSymptoms: string[];
  recommendation: string;
}

export interface GroundingSource {
  title: string;
  uri: string;
}

export interface AttendanceHealthAudit {
  attendanceRate: number;
  activeSickLeaves: number;
  topSymptoms: { symptom: string; count: number }[];
  correlationFindings: string;
  workforceVitalityScore: number;
  severity: HazardSeverity;
}

export interface FitnessRoutineStep {
  title: string;
  duration: string;
  instruction: string;
  benefit: string;
  focusArea: string;
}

export interface FitnessRoutine {
  routineName: string;
  totalDuration: string;
  steps: FitnessRoutineStep[];
  warningNote: string;
}
