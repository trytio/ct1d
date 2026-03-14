export interface PubMedArticle {
  pmid: string;
  title: string;
  authors: string[];
  journal: string;
  year: number;
  abstract: string;
  doi?: string;
  url: string;
}

export interface ResearchSearchResult {
  articles: PubMedArticle[];
  totalCount: number;
  query: string;
}
