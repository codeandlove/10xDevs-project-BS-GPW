/**
 * Complete mock responses for NocoDB API
 * Based on actual API structure from api-plan.md
 */

export const mockSymbolsResponse = {
  symbols: [
    { symbol: "11B", label: "11BIT", name: "11 Bit Studios SA", active: true },
    { symbol: "ABE", label: "ABENA", name: "AB SA", active: true },
    { symbol: "ALE", label: "ALLEG", name: "Allegro.eu SA", active: true },
    { symbol: "CPD", label: "CPRDEV", name: "CPD SA", active: true },
    { symbol: "JSW", label: "JSW", name: "Jastrzębska Spółka Węglowa SA", active: true },
    { symbol: "KGH", label: "KGHM", name: "KGHM Polska Miedź SA", active: true },
    { symbol: "LPP", label: "LPP", name: "LPP SA", active: true },
    { symbol: "PKN", label: "PKNOR", name: "PKN Orlen SA", active: true },
    { symbol: "PKO", label: "PEKAO", name: "Bank Pekao SA", active: true },
    { symbol: "PZU", label: "PZU", name: "Powszechny Zakład Ubezpieczeń SA", active: true },
  ],
  total_count: 10,
  cached_at: new Date().toISOString(),
};

export const mockGridResponse = {
  success: true,
  data: {
    events: [
      {
        Id: "rec_001",
        symbol: "CPD",
        occurrence_date: "2024-01-15",
        event_type: "earnings_surprise",
        percent_change: 8.5,
        volume_change: 2.3,
        description: "Q4 earnings beat expectations",
        price_before: 45.2,
        price_after: 49.04,
      },
      {
        Id: "rec_002",
        symbol: "PKN",
        occurrence_date: "2024-01-16",
        event_type: "analyst_upgrade",
        percent_change: 5.2,
        volume_change: 1.8,
        description: "Analyst upgrade to Buy",
        price_before: 38.5,
        price_after: 40.5,
      },
      {
        Id: "rec_003",
        symbol: "PKO",
        occurrence_date: "2024-01-17",
        event_type: "dividend_announcement",
        percent_change: 3.1,
        volume_change: 1.2,
        description: "Dividend announced",
        price_before: 42.0,
        price_after: 43.3,
      },
    ],
    metadata: {
      range: "week",
      symbols: ["CPD", "PKN", "PKO", "PZU", "KGH", "JSW", "LPP", "ALE"],
      totalEvents: 3,
    },
  },
  timestamp: new Date().toISOString(),
};

export const mockEventDetailsResponse = {
  success: true,
  data: {
    Id: "rec_001",
    symbol: "CPD",
    occurrence_date: "2024-01-15",
    event_type: "earnings_surprise",
    percent_change: 8.5,
    volume_change: 2.3,
    description: "Q4 earnings beat expectations",
    price_before: 45.2,
    price_after: 49.04,
    volume_before: 125000,
    volume_after: 287500,
  },
  timestamp: new Date().toISOString(),
};

export const mockSummariesResponse = {
  success: true,
  data: {
    summaries: [
      {
        Id: "sum_001",
        event_id: "rec_001",
        summary_type: "context",
        content: "CPD reported Q4 earnings that significantly exceeded analyst expectations.",
        created_at: "2024-01-15T11:00:00Z",
      },
      {
        Id: "sum_002",
        event_id: "rec_001",
        summary_type: "impact",
        content: "Stock price increased by 8.5% following the announcement.",
        created_at: "2024-01-15T11:05:00Z",
      },
    ],
  },
  timestamp: new Date().toISOString(),
};
