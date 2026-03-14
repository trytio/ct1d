export type TrialStatus =
  | "RECRUITING"
  | "NOT_YET_RECRUITING"
  | "ACTIVE_NOT_RECRUITING"
  | "COMPLETED"
  | "ENROLLING_BY_INVITATION"
  | "TERMINATED"
  | "WITHDRAWN"
  | "SUSPENDED"
  | "UNKNOWN";

export type TrialPhase =
  | "EARLY_PHASE1"
  | "PHASE1"
  | "PHASE2"
  | "PHASE3"
  | "PHASE4"
  | "NA";

export interface ClinicalTrial {
  nctId: string;
  title: string;
  status: TrialStatus;
  phase: TrialPhase | string;
  sponsor: string;
  summary: string;
  conditions: string[];
  interventions: string[];
  startDate?: string;
  completionDate?: string;
  enrollment?: number;
  locations: string[];
  url: string;
}

export interface TrialSearchResult {
  trials: ClinicalTrial[];
  totalCount: number;
  nextPageToken?: string;
}

export const TRIAL_STATUS_LABELS: Record<string, string> = {
  RECRUITING: "Recruiting",
  NOT_YET_RECRUITING: "Not Yet Recruiting",
  ACTIVE_NOT_RECRUITING: "Active, Not Recruiting",
  COMPLETED: "Completed",
  ENROLLING_BY_INVITATION: "Enrolling by Invitation",
  TERMINATED: "Terminated",
  WITHDRAWN: "Withdrawn",
  SUSPENDED: "Suspended",
  UNKNOWN: "Unknown",
};

export const TRIAL_STATUS_COLORS: Record<string, string> = {
  RECRUITING: "#10B981",
  NOT_YET_RECRUITING: "#F59E0B",
  ACTIVE_NOT_RECRUITING: "#3B82F6",
  COMPLETED: "#6B7280",
  ENROLLING_BY_INVITATION: "#8B5CF6",
  TERMINATED: "#EF4444",
  WITHDRAWN: "#EF4444",
  SUSPENDED: "#F97316",
  UNKNOWN: "#9CA3AF",
};
