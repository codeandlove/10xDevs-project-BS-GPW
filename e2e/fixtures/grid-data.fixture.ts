/**
 * Mock data for grid E2E tests
 * Simulates NocoDB API responses
 */

export const mockGridData = {
  events: [
    {
      id: "rec_test_001",
      symbol: "CPD",
      occurrence_date: "2024-01-15",
      event_type: "earnings_surprise" as const,
      percent_change: 8.5,
      volume_change: 2.3,
      description: "Q4 earnings beat expectations",
    },
    {
      id: "rec_test_002",
      symbol: "PKN",
      occurrence_date: "2024-01-16",
      event_type: "analyst_upgrade" as const,
      percent_change: 5.2,
      volume_change: 1.8,
      description: "Analyst upgrade to Buy",
    },
    {
      id: "rec_test_003",
      symbol: "PKO",
      occurrence_date: "2024-01-17",
      event_type: "dividend_announcement" as const,
      percent_change: 3.1,
      volume_change: 1.2,
      description: "Dividend announced",
    },
  ],
  dateRange: {
    start: "2024-01-15",
    end: "2024-01-21",
  },
  symbols: ["CPD", "PKN", "PKO", "PZU", "KGH", "JSW", "LPP", "ALE"],
  metadata: {
    totalEvents: 3,
    cachedAt: new Date().toISOString(),
  },
};

export const mockEventDetails = {
  id: "rec_test_001",
  symbol: "CPD",
  occurrence_date: "2024-01-15",
  event_type: "earnings_surprise",
  percent_change: 8.5,
  volume_change: 2.3,
  description: "Q4 earnings beat expectations",
  price_before: 45.20,
  price_after: 49.04,
  volume_before: 125000,
  volume_after: 287500,
  created_at: "2024-01-15T10:30:00Z",
};

export const mockSummaries = [
  {
    id: "sum_001",
    event_id: "rec_test_001",
    summary_type: "context",
    content: "CPD reported Q4 earnings that significantly exceeded analyst expectations.",
    created_at: "2024-01-15T11:00:00Z",
  },
  {
    id: "sum_002",
    event_id: "rec_test_001",
    summary_type: "impact",
    content: "Stock price increased by 8.5% following the announcement.",
    created_at: "2024-01-15T11:05:00Z",
  },
];
