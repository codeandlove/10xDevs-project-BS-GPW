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
    id: record.Id,
    symbol: record.symbol,
    occurrence_date: record.occurrence_date,
    event_type: record.event_type as EventType,
    percent_change: record.percent_change,
    has_summary: hasSummary,
  };
}

/**
 * Transform NocoDB summary record to DTO
 */
function transformSummary(record: NocoDBSummaryRecord): AISummary {
  let identifiedCauses: string[] = [];
  if (record.identified_causes) {
    try {
      identifiedCauses = JSON.parse(record.identified_causes);
    } catch {
      identifiedCauses = [];
    }
  }

  let predictedTrendProbability = {};
  if (record.predicted_trend_probability) {
    try {
      predictedTrendProbability = JSON.parse(record.predicted_trend_probability);
    } catch {
      predictedTrendProbability = {};
    }
  }

  return {
    id: record.Id,
    date: record.created_at,
    summary: record.summary,
    article_sentiment: record.article_sentiment as "positive" | "negative" | "neutral",
    identified_causes: identifiedCauses,
    predicted_trend_probability: predictedTrendProbability,
    source_url: record.source_url,
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

    // Build query
    const queryBuilder = new NocoDBQueryBuilder()
      .where("occurrence_date", "gte", startDate)
      .where("occurrence_date", "lte", calculatedEndDate)
      .sort("occurrence_date", true) // DESC
      .limit(1000);

    // Add symbols filter if provided
    if (symbols && symbols.length > 0) {
      queryBuilder.whereIn("symbol", symbols);
    }

    // Fetch events
    const eventsResponse = await this.client.queryRecords<NocoDBEventRecord>(NOCODB_TABLES.BLACK_SWANS, queryBuilder);

    // Check which events have summaries
    const eventIds = eventsResponse.list.map((e) => e.Id);
    const summariesMap = new Map<string, boolean>();

    if (eventIds.length > 0) {
      // Query summaries for these events
      const summariesQuery = new NocoDBQueryBuilder().limit(1000);

      // Build OR conditions for each event (symbol + occurrence_date)
      for (const event of eventsResponse.list) {
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
    const events: BlackSwanEventMinimal[] = eventsResponse.list.map((record) => {
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
    const summariesQuery = new NocoDBQueryBuilder()
      .where("symbol", "eq", eventRecord.symbol)
      .where("occurrence_date", "eq", eventRecord.occurrence_date)
      .sort("created_at", false) // ASC - get first (oldest)
      .limit(1);

    let firstSummary: AISummary | undefined;
    try {
      const summariesResponse = await this.client.queryRecords<NocoDBSummaryRecord>(
        NOCODB_TABLES.AI_SUMMARY,
        summariesQuery
      );
      if (summariesResponse.list.length > 0) {
        firstSummary = transformSummary(summariesResponse.list[0]);
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
      .where("date", "gte", historicStartDate.toISOString().split("T")[0])
      .where("date", "lt", eventRecord.occurrence_date)
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
      id: eventRecord.Id,
      symbol: eventRecord.symbol,
      occurrence_date: eventRecord.occurrence_date,
      event_type: eventRecord.event_type as EventType,
      percent_change: eventRecord.percent_change,
      open: eventRecord.open || 0,
      high: eventRecord.high || 0,
      low: eventRecord.low || 0,
      close: eventRecord.close || 0,
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
    const queryBuilder = new NocoDBQueryBuilder()
      .where("symbol", "eq", symbol)
      .where("occurrence_date", "eq", occurrenceDate)
      .sort("created_at", false) // ASC - oldest first
      .limit(100);

    const summariesResponse = await this.client.queryRecords<NocoDBSummaryRecord>(
      NOCODB_TABLES.AI_SUMMARY,
      queryBuilder
    );

    const summaries: AISummary[] = summariesResponse.list.map((record) => transformSummary(record));

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
