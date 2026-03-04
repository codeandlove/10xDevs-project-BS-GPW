/**
 * NocoDB Service Layer
 * Business logic for Black Swan Events data
 */

import { NocoDBClient, NocoDBQueryBuilder, NOCODB_TABLES } from "../lib/nocodb-client";
import type {
  GridResponse,
  BlackSwanEventMinimal,
  EventDetailsResponse,
  BlackSwanEventDetailed,
  SummariesResponse,
  AISummary,
  HistoricDataPoint,
  DateRange,
  EventType,
  NocoDBEventRecord,
  NocoDBSummaryRecord,
  NocoDBHistoricRecord,
  SymbolsResponse,
  GPWSymbol,
  NocoDBSymbolRecord,
} from "../types/nocodb.types";

/**
 * Transform NocoDB event record to minimal DTO
 */
function transformToMinimal(record: NocoDBEventRecord, hasSummary: boolean): BlackSwanEventMinimal {
  return {
    id: String(record.Id),
    symbol: record.symbol,
    occurrence_date: record.occurrence_date,
    event_type: (record.type || record.event_type || "VOLATILITY_UP") as EventType,
    percent_change: record.percent_change,
    has_summary: hasSummary,
  };
}

/**
 * Transform NocoDB summary record to DTO
 */
function transformSummary(record: NocoDBSummaryRecord): AISummary {
  // NocoDB returns data in 'response' object or as direct fields
  const data = record.response || record;

  let identifiedCauses: string[] = [];
  if (data.identified_causes) {
    if (Array.isArray(data.identified_causes)) {
      identifiedCauses = data.identified_causes;
    } else {
      try {
        identifiedCauses = JSON.parse(data.identified_causes as string);
      } catch {
        identifiedCauses = [];
      }
    }
  }

  let predictedTrendProbability = {};
  if (data.predicted_trend_probability) {
    if (typeof data.predicted_trend_probability === "object" && !Array.isArray(data.predicted_trend_probability)) {
      predictedTrendProbability = data.predicted_trend_probability;
    } else {
      try {
        predictedTrendProbability = JSON.parse(data.predicted_trend_probability as string);
      } catch {
        predictedTrendProbability = {};
      }
    }
  }

  // Map sentiment from Polish to English
  let sentiment: "positive" | "negative" | "neutral" = "neutral";
  const sentimentValue = data.article_sentiment?.toLowerCase();
  if (sentimentValue === "pozytywny" || sentimentValue === "positive") {
    sentiment = "positive";
  } else if (sentimentValue === "negatywny" || sentimentValue === "negative") {
    sentiment = "negative";
  }

  // Use CreatedAt, created_at, or date field for timestamp
  const dateField = record.CreatedAt || record.created_at || record.date || new Date().toISOString();

  // Get source URL - prioritize response.source_article_url, then record.source, then record.source_url
  const sourceUrl = record.response?.source_article_url || record.source || record.source_url;

  // Map recommended_action
  let recommendedAction: { action: "BUY" | "SELL" | "HOLD"; justification: string } | undefined;
  const recAction = record.response?.recommended_action;
  if (recAction) {
    const action = recAction.action?.toUpperCase();
    if (action === "BUY" || action === "SELL" || action === "HOLD") {
      recommendedAction = {
        action: action as "BUY" | "SELL" | "HOLD",
        justification: recAction.justification || "",
      };
    }
  }

  // Get keywords
  const keywords = record.response?.keywords;

  return {
    id: String(record.Id),
    date: dateField,
    summary: data.summary || "",
    article_sentiment: sentiment,
    identified_causes: identifiedCauses,
    predicted_trend_probability: predictedTrendProbability,
    recommended_action: recommendedAction,
    keywords: keywords,
    source_url: sourceUrl,
  };
}

/**
 * Transform NocoDB historic data to DTO
 */
function transformHistoricData(record: NocoDBHistoricRecord): HistoricDataPoint {
  return {
    date: record.date,
    open: record.open,
    high: record.high,
    low: record.low,
    close: record.close,
    volume: record.volume,
  };
}

/**
 * Transform NocoDB symbol record to DTO
 */
function transformSymbol(record: NocoDBSymbolRecord): GPWSymbol {
  return {
    symbol: record.symbol,
    label: record.label,
    name: record.name,
    active: record.active,
  };
}

/**
 * NocoDB Service
 */
export class NocoDBService {
  constructor(private client: NocoDBClient) {}

  /**
   * Get grid events with explicit date range
   * @param startDate - Start date in YYYY-MM-DD format
   * @param endDate - End date in YYYY-MM-DD format
   * @param symbols - Optional array of ticker symbols to filter
   */
  async getGridEvents(startDate: string, endDate: string, symbols?: string[]): Promise<GridResponse> {
    // Build query with date filters using exactDate for NocoDB Date fields
    const queryBuilder = new NocoDBQueryBuilder()
      .where("occurrence_date", "gte", startDate, "exactDate")
      .where("occurrence_date", "lte", endDate, "exactDate")
      .sort("occurrence_date", true) // DESC - newest first
      .limit(10000); // Increased limit for infinite scroll support

    // Add symbols filter if provided
    if (symbols && symbols.length > 0) {
      queryBuilder.whereIn("symbol", symbols);
    }

    // Fetch events with date filtering
    let eventsResponse;
    let needsMemoryFiltering = false;

    try {
      eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, queryBuilder);
    } catch (err) {
      // If NocoDB returns 422 (field name issue), fallback to fetching all and filtering in memory
      if (err && typeof err === "object" && "statusCode" in err && (err as { statusCode: number }).statusCode === 422) {
        needsMemoryFiltering = true;

        // Fetch without date filters
        const fallbackQuery = new NocoDBQueryBuilder().sort("occurrence_date", true).limit(15000); // Large limit

        if (symbols && symbols.length > 0) {
          fallbackQuery.whereIn("symbol", symbols);
        }

        eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, fallbackQuery);
      } else {
        throw err;
      }
    }

    // Filter by date in memory if NocoDB filtering failed
    let filteredEvents = eventsResponse.list;
    if (needsMemoryFiltering) {
      filteredEvents = eventsResponse.list.filter((event) => {
        return event.occurrence_date >= startDate && event.occurrence_date <= endDate;
      });
    }

    // Check which events have summaries
    const summariesMap = new Map<string, boolean>();

    if (filteredEvents.length > 0) {
      // Query summaries for these events
      const summariesQuery = new NocoDBQueryBuilder().limit(1000);

      // Build OR conditions for each event (symbol + occurrence_date)
      for (const event of filteredEvents) {
        summariesMap.set(`${event.symbol}_${event.occurrence_date}`, false);
      }

      try {
        const summariesResponse = await this.client.queryRecords<NocoDBSummaryRecord>(
          NOCODB_TABLES.AI_SUMMARY,
          summariesQuery
        );
        for (const summary of summariesResponse.list) {
          const key = `${summary.symbol}_${summary.occurrence_date}`;
          summariesMap.set(key, true);
        }
      } catch {
        // If summaries query fails, continue without summary flags
      }
    }

    // Transform to DTOs
    const events: BlackSwanEventMinimal[] = filteredEvents.map((record) => {
      const key = `${record.symbol}_${record.occurrence_date}`;
      const hasSummary = summariesMap.get(key) || false;
      return transformToMinimal(record, hasSummary);
    });

    // Extract unique symbols
    const uniqueSymbols = [...new Set(events.map((e) => e.symbol))];

    return {
      start_date: startDate,
      end_date: endDate,
      events,
      symbols: uniqueSymbols,
      cached_at: new Date().toISOString(),
    };
  }

  /**
   * Get event details with first summary and historic data
   */
  async getEventDetails(eventId: string): Promise<EventDetailsResponse> {
    // Fetch main event
    const eventRecord = await this.client.getRecord<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, eventId);

    // Fetch first AI summary
    // Note: Filtering only by symbol due to NocoDB field name issues
    // occurrence_date filter causes 422 error
    const summariesQuery = new NocoDBQueryBuilder().where("symbol", "eq", eventRecord.symbol).limit(10); // Get up to 10 to find matching date

    let firstSummary: AISummary | undefined;
    let matchingSummaryRecord: NocoDBSummaryRecord | undefined;
    try {
      const summariesResponse = await this.client.queryRecords<NocoDBSummaryRecord>(
        NOCODB_TABLES.AI_SUMMARY,
        summariesQuery
      );

      // Filter by occurrence_date in memory (since NocoDB filter causes 422)
      matchingSummaryRecord = summariesResponse.list.find((s) => s.occurrence_date === eventRecord.occurrence_date);

      if (matchingSummaryRecord) {
        firstSummary = transformSummary(matchingSummaryRecord);
      }
    } catch {
      // Continue without summary
    }

    // Fetch historic data (30 days before event)
    const eventDate = new Date(eventRecord.occurrence_date);
    const historicStartDate = new Date(eventDate);
    historicStartDate.setDate(historicStartDate.getDate() - 30);

    const historicQuery = new NocoDBQueryBuilder()
      .where("symbol", "eq", eventRecord.symbol)
      .where("date", "gte", historicStartDate.toISOString().split("T")[0], "exactDate")
      .where("date", "lt", eventRecord.occurrence_date, "exactDate")
      .sort("date", false) // ASC
      .limit(100);

    let historicData: HistoricDataPoint[] = [];
    try {
      const historicResponse = await this.client.queryRecords<NocoDBHistoricRecord>(
        NOCODB_TABLES.HISTORIC_DATA,
        historicQuery
      );
      historicData = historicResponse.list.map((record) => transformHistoricData(record));
    } catch {
      // Continue without historic data
    }

    const detailedEvent: BlackSwanEventDetailed = {
      id: String(eventRecord.Id),
      symbol: eventRecord.symbol,
      occurrence_date: eventRecord.occurrence_date,
      // Use type field from NocoDB, fallback to event_type, then summary's event_type
      event_type: (eventRecord.type ||
        eventRecord.event_type ||
        matchingSummaryRecord?.response?.event_type ||
        "VOLATILITY_UP") as EventType,
      percent_change: eventRecord.percent_change,
      open: eventRecord.open || eventRecord.last_close || 0,
      high: eventRecord.high || 0,
      low: eventRecord.low || 0,
      close: eventRecord.close || eventRecord.current_close || 0,
      volume: eventRecord.volume || 0,
      first_summary: firstSummary,
      historic_data: historicData,
    };

    return {
      event: detailedEvent,
      cached_at: new Date().toISOString(),
    };
  }

  /**
   * Get all AI summaries for a specific event
   */
  async getEventSummaries(symbol: string, occurrenceDate: string, eventType?: EventType): Promise<SummariesResponse> {
    // Note: Filtering only by symbol due to NocoDB field name issues
    // occurrence_date filter causes 422 error - will filter in memory
    const queryBuilder = new NocoDBQueryBuilder().where("symbol", "eq", symbol).limit(100); // No sorting - avoid field name issues

    const summariesResponse = await this.client.queryRecords<NocoDBSummaryRecord>(
      NOCODB_TABLES.AI_SUMMARY,
      queryBuilder
    );

    // Filter by occurrence_date in memory (since NocoDB filter causes 422)
    const filteredSummaries = summariesResponse.list.filter((record) => record.occurrence_date === occurrenceDate);

    const summaries: AISummary[] = filteredSummaries.map((record) => transformSummary(record));

    return {
      symbol,
      occurrence_date: occurrenceDate,
      event_type: eventType,
      summaries,
      total_count: summaries.length,
      cached_at: new Date().toISOString(),
    };
  }

  /**
   * Get all active GPW symbols (tickers)
   * @param range - Optional date range to aggregate event counts per symbol
   */
  async getActiveSymbols(range?: DateRange | null): Promise<SymbolsResponse> {
    // Build query: where active=true, sort by symbol, limit 1000
    const queryBuilder = new NocoDBQueryBuilder()
      .where("active", "eq", "true") // Boolean as string for NocoDB API
      .sort("symbol", false) // ASC
      .limit(1000);

    const symbolsResponse = await this.client.querySymbols(queryBuilder);

    // Transform to DTOs
    let symbols: GPWSymbol[] = symbolsResponse.list.map((record) => transformSymbol(record));

    // If range provided, aggregate ALL-TIME event counts per symbol
    // (not just for the current range - so tickers with 0 events this week
    // still show their historical count in the filter modal)
    if (range) {
      const eventCounts = await this.getAllTimeEventCounts();

      // Add eventCount to each symbol
      symbols = symbols.map((symbol) => ({
        ...symbol,
        eventCount: eventCounts.get(symbol.symbol) || 0,
      }));
    }

    return {
      symbols,
      total_count: symbols.length,
      cached_at: new Date().toISOString(),
    };
  }

  /**
   * Get all-time event counts per symbol (no date restriction)
   * Used in AdvancedTickerFilter so tickers with 0 events in the current range
   * still show their historical count.
   * @returns Map of symbol -> total event count
   */
  private async getAllTimeEventCounts(): Promise<Map<string, number>> {
    const queryBuilder = new NocoDBQueryBuilder().sort("occurrence_date", true).limit(10000);

    const eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, queryBuilder);

    const counts = new Map<string, number>();
    eventsResponse.list.forEach((event) => {
      counts.set(event.symbol, (counts.get(event.symbol) || 0) + 1);
    });

    return counts;
  }
}
