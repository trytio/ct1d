import { Category } from "./cure-approach";

export interface TimelineEvent {
  id: string;
  year: number;
  month?: number;
  title: string;
  description: string;
  category: Category | "general";
  significance: "major" | "notable" | "incremental";
  source?: {
    title: string;
    url: string;
  };
  relatedApproachId?: string;
}
