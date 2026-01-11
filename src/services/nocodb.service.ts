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
} from "../types/nocodb.types";

/**
 * Calculate date range based on range type
 */
function calculateDateRange(endDateStr: string, range: DateRange): { startDate: string; endDate: string } {
  const endDate = new Date(endDateStr);

  let daysToSubtract: number;
  switch (range) {
    case "week":
      daysToSubtract = 7;
      break;
    case "month":
      daysToSubtract = 30;
      break;
    case "quarter":
      daysToSubtract = 90;
      break;
  }

  const startDate = new Date(endDate);
  startDate.setDate(startDate.getDate() - daysToSubtract);

  return {
    startDate: startDate.toISOString().split("T")[0], // YYYY-MM-DD
    endDate: endDate.toISOString().split("T")[0],
  };
}

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
  if (data.recommended_action) {
    const action = data.recommended_action.action?.toUpperCase();
    if (action === "BUY" || action === "SELL" || action === "HOLD") {
      recommendedAction = {
        action: action as "BUY" | "SELL" | "HOLD",
        justification: data.recommended_action.justification || "",
      };
    }
  }

  // Get keywords
  const keywords = data.keywords || record.response?.keywords;

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
 * NocoDB Service
 */
export class NocoDBService {
  constructor(private client: NocoDBClient) {}

  /**
   * Get grid events with filters
   */
  async getGridEvents(range: DateRange, symbols?: string[], endDate?: string): Promise<GridResponse> {
    // Calculate date range
    const endDateStr = endDate || new Date().toISOString().split("T")[0];
    const { startDate, endDate: calculatedEndDate } = calculateDateRange(endDateStr, range);

    // Build query with date filters using exactDate for NocoDB Date fields
    const queryBuilder = new NocoDBQueryBuilder()
      .where("occurrence_date", "gte", startDate, "exactDate")
      .where("occurrence_date", "lte", calculatedEndDate, "exactDate")
      .sort("occurrence_date", true) // DESC - newest first
      .limit(1000); // Increased limit for date range queries

    // Add symbols filter if provided
    if (symbols && symbols.length > 0) {
      queryBuilder.whereIn("symbol", symbols);
    }

    // Fetch events with date filtering
    let eventsResponse;
    let needsMemoryFiltering = false;

    try {
      eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, queryBuilder);
    } catch {
      // If NocoDB returns 422 (field name issue), fallback to fetching all and filtering in memory
      if (error && typeof error === "object" && "statusCode" in error && error.statusCode === 422) {
        needsMemoryFiltering = true;

        // Fetch without date filters
        const fallbackQuery = new NocoDBQueryBuilder().sort("occurrence_date", true).limit(10000); // Large limit to get all recent events

        if (symbols && symbols.length > 0) {
          fallbackQuery.whereIn("symbol", symbols);
        }

        eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, fallbackQuery);
      } else {
        throw error;
      }
    }

    // Filter by date in memory if NocoDB filtering failed
    let filteredEvents = eventsResponse.list;
    if (needsMemoryFiltering) {
      filteredEvents = eventsResponse.list.filter((event) => {
        return event.occurrence_date >= startDate && event.occurrence_date <= calculatedEndDate;
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
      range,
      start_date: startDate,
      end_date: calculatedEndDate,
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
}
