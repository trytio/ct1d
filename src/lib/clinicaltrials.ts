import type { ClinicalTrial, TrialSearchResult, TrialStatus } from "@/types/trial";

const CT_API_BASE = "https://clinicaltrials.gov/api/v2/studies";

interface SearchTrialsParams {
  query?: string;
  status?: string;
  phase?: string;
  pageSize?: number;
  pageToken?: string;
}

export async function searchTrials(
  params: SearchTrialsParams
): Promise<TrialSearchResult> {
  const url = new URL(CT_API_BASE);

  // Always filter by T1D condition
  url.searchParams.set("query.cond", "type 1 diabetes");

  // Intervention / keyword search
  if (params.query) {
    url.searchParams.set("query.intr", params.query);
  }

  // Status filter (e.g. RECRUITING)
  if (params.status) {
    url.searchParams.set("filter.overallStatus", params.status);
  }

  // Phase filter (e.g. PHASE3)
  if (params.phase) {
    url.searchParams.set("filter.phase", params.phase);
  }

  // Pagination
  url.searchParams.set("pageSize", String(params.pageSize ?? 20));
  if (params.pageToken) {
    url.searchParams.set("pageToken", params.pageToken);
  }

  // Request specific fields to keep response manageable
  url.searchParams.set(
    "fields",
    [
      "NCTId",
      "BriefTitle",
      "OverallStatus",
      "Phase",
      "LeadSponsorName",
      "BriefSummary",
      "Condition",
      "InterventionName",
      "InterventionType",
      "StartDate",
      "PrimaryCompletionDate",
      "EnrollmentCount",
      "LocationCity",
      "LocationState",
      "LocationCountry",
    ].join("|")
  );

  const res = await fetch(url.toString());
  if (!res.ok) {
    throw new Error(`ClinicalTrials.gov API error: ${res.status}`);
  }

  const data = await res.json();

  const trials: ClinicalTrial[] = (data.studies ?? []).map(mapStudyToTrial);

  return {
    trials,
    totalCount: data.totalCount ?? trials.length,
    nextPageToken: data.nextPageToken ?? undefined,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */
function mapStudyToTrial(study: any): ClinicalTrial {
  const proto = study.protocolSection ?? {};
  const idModule = proto.identificationModule ?? {};
  const statusModule = proto.statusModule ?? {};
  const sponsorModule = proto.sponsorCollaboratorsModule ?? {};
  const descriptionModule = proto.descriptionModule ?? {};
  const conditionsModule = proto.conditionsModule ?? {};
  const armsModule = proto.armsInterventionsModule ?? {};
  const designModule = proto.designModule ?? {};
  const contactsModule = proto.contactsLocationsModule ?? {};

  // Extract NCT ID
  const nctId: string = idModule.nctId ?? "";

  // Extract title
  const title: string = idModule.briefTitle ?? idModule.officialTitle ?? "";

  // Extract status
  const rawStatus: string = statusModule.overallStatus ?? "UNKNOWN";
  const status = rawStatus.toUpperCase().replace(/ /g, "_") as TrialStatus;

  // Extract phase — the API returns an array like ["PHASE2", "PHASE3"]
  const phases: string[] = designModule.phases ?? [];
  const phase: string = phases.length > 0 ? phases.join("/") : "N/A";

  // Extract sponsor
  const sponsor: string = sponsorModule.leadSponsor?.name ?? "";

  // Extract summary
  const summary: string = descriptionModule.briefSummary ?? "";

  // Extract conditions
  const conditions: string[] = conditionsModule.conditions ?? [];

  // Extract interventions
  const interventionList: any[] = armsModule.interventions ?? [];
  const interventions: string[] = interventionList.map(
    (i: any) => {
      const type = i.type ?? "";
      const name = i.name ?? "";
      return type ? `${type}: ${name}` : name;
    }
  );

  // Extract dates
  const startDate: string | undefined = statusModule.startDateStruct?.date;
  const completionDate: string | undefined =
    statusModule.primaryCompletionDateStruct?.date;

  // Extract enrollment
  const enrollment: number | undefined =
    designModule.enrollmentInfo?.count ??
    undefined;

  // Extract locations
  const locationList: any[] = contactsModule.locations ?? [];
  const locations: string[] = locationList.map((loc: any) => {
    const parts = [loc.city, loc.state, loc.country].filter(Boolean);
    return parts.join(", ");
  });

  return {
    nctId,
    title,
    status,
    phase,
    sponsor,
    summary,
    conditions,
    interventions,
    startDate,
    completionDate,
    enrollment,
    locations,
    url: `https://clinicaltrials.gov/study/${nctId}`,
  };
}
/* eslint-enable @typescript-eslint/no-explicit-any */
