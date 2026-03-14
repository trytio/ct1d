export type Phase =
  | "preclinical"
  | "phase_1"
  | "phase_1_2"
  | "phase_2"
  | "phase_3"
  | "approved"
  | "discontinued";

export type Category =
  | "stem_cell"
  | "immunotherapy"
  | "gene_editing"
  | "beta_cell_regeneration"
  | "encapsulation"
  | "combination"
  | "artificial_pancreas";

export interface StudyReference {
  title: string;
  journal: string;
  year: number;
  url: string;
  pmid?: string;
}

export interface CureApproach {
  id: string;
  name: string;
  organization: string;
  category: Category;
  phase: Phase;
  description: string;
  plainLanguageSummary: string;
  mechanism: string;
  keyFindings: string[];
  challenges: string[];
  keyStudies: StudyReference[];
  relatedTrialNCTIds: string[];
  relatedApproachIds: string[];
  lastUpdated: string;
  tags: string[];
}

export interface CategoryDefinition {
  id: Category;
  name: string;
  description: string;
  color: string;
  icon: string;
}

export const PHASE_LABELS: Record<Phase, string> = {
  preclinical: "Preclinical",
  phase_1: "Phase 1",
  phase_1_2: "Phase 1/2",
  phase_2: "Phase 2",
  phase_3: "Phase 3",
  approved: "Approved",
  discontinued: "Discontinued",
};

export const PHASE_COLORS: Record<Phase, string> = {
  preclinical: "#6B7280",
  phase_1: "#3B82F6",
  phase_1_2: "#6366F1",
  phase_2: "#F59E0B",
  phase_3: "#10B981",
  approved: "#F59E0B",
  discontinued: "#EF4444",
};
