const NVD_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0";

// The public NVD API allows 5 requests per rolling 30s window without an API key.
// A short delay between calls keeps a burst of lookups (e.g. scanning many
// dependencies in one job) from tripping that limit.
const REQUEST_DELAY_MS = 6000;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const extractSeverity = (cve) => {
  const metrics = cve.metrics?.cvssMetricV31 || cve.metrics?.cvssMetricV2 || [];
  const primary = metrics.find((m) => m.type === "Primary") || metrics[0];
  if (!primary) return { severity: "UNKNOWN", score: null };

  return {
    severity: primary.cvssData.baseSeverity || "UNKNOWN",
    score: primary.cvssData.baseScore ?? null,
  };
};

export const searchCvesByKeyword = async (keyword) => {
  const url = `${NVD_URL}?keywordSearch=${encodeURIComponent(keyword)}&resultsPerPage=10`;
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`NVD API request failed: ${response.status}`);
  }

  const data = await response.json();
  await sleep(REQUEST_DELAY_MS);

  return (data.vulnerabilities || []).map(({ cve }) => {
    const description = cve.descriptions.find((d) => d.lang === "en")?.value || "";
    const { severity, score } = extractSeverity(cve);
    return { id: cve.id, description, severity, score };
  });
};
