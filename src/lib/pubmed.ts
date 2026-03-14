import { XMLParser } from "fast-xml-parser";
import type { PubMedArticle } from "@/types/research";

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";

function apiKeyParam(): string {
  const key = process.env.NCBI_API_KEY;
  return key ? `&api_key=${key}` : "";
}

interface ESearchResult {
  esearchresult: {
    count: string;
    idlist: string[];
  };
}

export async function searchPubMed(
  query: string,
  maxResults: number = 10
): Promise<PubMedArticle[]> {
  // Step 1: ESearch — get PMIDs
  const searchUrl =
    `${EUTILS_BASE}/esearch.fcgi?db=pubmed` +
    `&term=type+1+diabetes+AND+${encodeURIComponent(query)}` +
    `&retmax=${maxResults}` +
    `&retmode=json` +
    apiKeyParam();

  const searchRes = await fetch(searchUrl);
  if (!searchRes.ok) {
    throw new Error(`PubMed ESearch failed: ${searchRes.status}`);
  }

  const searchData: ESearchResult = await searchRes.json();
  const pmids = searchData.esearchresult.idlist;

  if (!pmids || pmids.length === 0) {
    return [];
  }

  // Step 2: EFetch — get article details as XML
  const fetchUrl =
    `${EUTILS_BASE}/efetch.fcgi?db=pubmed` +
    `&id=${pmids.join(",")}` +
    `&rettype=abstract` +
    `&retmode=xml` +
    apiKeyParam();

  const fetchRes = await fetch(fetchUrl);
  if (!fetchRes.ok) {
    throw new Error(`PubMed EFetch failed: ${fetchRes.status}`);
  }

  const xmlText = await fetchRes.text();

  // Step 3: Parse XML
  const parser = new XMLParser({
    ignoreAttributes: false,
    isArray: (tagName) =>
      ["PubmedArticle", "Author", "AbstractText"].includes(tagName),
  });

  const parsed = parser.parse(xmlText);

  const articles: PubMedArticle[] = [];
  const pubmedArticles =
    parsed?.PubmedArticleSet?.PubmedArticle ?? [];

  for (const article of pubmedArticles) {
    try {
      const medlineCitation = article.MedlineCitation;
      const articleData = medlineCitation?.Article;
      if (!articleData) continue;

      const pmid = String(medlineCitation.PMID?.["#text"] ?? medlineCitation.PMID ?? "");

      const title = typeof articleData.ArticleTitle === "string"
        ? articleData.ArticleTitle
        : articleData.ArticleTitle?.["#text"] ?? "";

      // Parse authors
      const authorList = articleData.AuthorList?.Author ?? [];
      const authors: string[] = [];
      for (const author of Array.isArray(authorList) ? authorList : [authorList]) {
        const lastName = author.LastName ?? "";
        const foreName = author.ForeName ?? "";
        if (lastName) {
          authors.push(foreName ? `${lastName} ${foreName}` : lastName);
        } else if (author.CollectiveName) {
          authors.push(author.CollectiveName);
        }
      }

      // Parse journal
      const journal = articleData.Journal?.Title ?? articleData.Journal?.ISOAbbreviation ?? "";

      // Parse year
      const pubDate = articleData.Journal?.JournalIssue?.PubDate;
      const year = Number(
        pubDate?.Year ??
        pubDate?.MedlineDate?.substring(0, 4) ??
        medlineCitation.DateCompleted?.Year ??
        0
      );

      // Parse abstract
      const abstractTexts = articleData.Abstract?.AbstractText;
      let abstract = "";
      if (typeof abstractTexts === "string") {
        abstract = abstractTexts;
      } else if (Array.isArray(abstractTexts)) {
        abstract = abstractTexts
          .map((t) => {
            if (typeof t === "string") return t;
            const label = t["@_Label"] ? `${t["@_Label"]}: ` : "";
            return `${label}${t["#text"] ?? ""}`;
          })
          .join("\n\n");
      } else if (abstractTexts?.["#text"]) {
        abstract = abstractTexts["#text"];
      }

      // Parse DOI
      const elocationIds = articleData.ELocationID;
      let doi: string | undefined;
      if (Array.isArray(elocationIds)) {
        const doiEntry = elocationIds.find(
          (e: Record<string, string>) => e["@_EIdType"] === "doi"
        );
        doi = doiEntry?.["#text"];
      } else if (elocationIds?.["@_EIdType"] === "doi") {
        doi = elocationIds["#text"];
      }

      // Also check ArticleIdList in PubmedData for DOI
      if (!doi) {
        const articleIds = article.PubmedData?.ArticleIdList?.ArticleId;
        if (Array.isArray(articleIds)) {
          const doiId = articleIds.find(
            (a: Record<string, string>) => a["@_IdType"] === "doi"
          );
          doi = doiId?.["#text"];
        } else if (articleIds?.["@_IdType"] === "doi") {
          doi = articleIds["#text"];
        }
      }

      articles.push({
        pmid,
        title: cleanText(title),
        authors,
        journal,
        year,
        abstract: cleanText(abstract),
        doi,
        url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
      });
    } catch {
      // Skip articles that fail to parse
      continue;
    }
  }

  return articles;
}

function cleanText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "") // strip any residual HTML/XML tags
    .replace(/\s+/g, " ")
    .trim();
}
