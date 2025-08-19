#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";
import axios, { AxiosInstance } from "axios";
import { z } from "zod";
import dotenv from "dotenv";

dotenv.config();

// Configuration
const OPENREPLAY_API_URL = process.env.OPENREPLAY_API_URL || "https://api.openreplay.com";
const OPENREPLAY_API_KEY = process.env.OPENREPLAY_API_KEY || "";
const OPENREPLAY_PROJECT_ID = process.env.OPENREPLAY_PROJECT_ID || "";

class OpenReplayMCP {
  private server: Server;
  private api: AxiosInstance;

  constructor() {
    this.server = new Server(
      {
        name: "openreplay-mcp",
        version: "0.1.0",
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    // Initialize API client
    this.api = axios.create({
      baseURL: OPENREPLAY_API_URL,
      headers: {
        "Authorization": `Bearer ${OPENREPLAY_API_KEY}`,
        "Content-Type": "application/json",
      },
    });

    this.setupHandlers();
  }

  private setupHandlers() {
    // List available tools
    this.server.setRequestHandler(ListToolsRequestSchema, async () => ({
      tools: [
        {
          name: "search_sessions",
          description: "Search and filter sessions with various criteria like date range, user properties, errors, performance metrics, custom events, etc.",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              filters: {
                type: "array",
                description: "Array of filters to apply",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", description: "Filter type (e.g., USER_ID, USER_BROWSER, USER_OS, USER_DEVICE, USER_COUNTRY, DURATION, ERROR, CUSTOM, METADATA, etc.)" },
                    operator: { type: "string", description: "Operator (is, is_not, contains, starts_with, ends_with, greater, less, between)" },
                    value: { type: ["string", "number", "array"], description: "Filter value" }
                  }
                }
              },
              limit: { type: "number", description: "Number of sessions to return (default 50)" },
              offset: { type: "number", description: "Offset for pagination" },
              sort: {
                type: "object",
                properties: {
                  field: { type: "string", description: "Field to sort by (startedAt, duration, errorCount, etc.)" },
                  order: { type: "string", enum: ["asc", "desc"], description: "Sort order" }
                }
              }
            },
            required: []
          }
        },
        {
          name: "get_session_details",
          description: "Get detailed information about a specific session including all events, errors, network requests, console logs, custom events, and performance metrics",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "The session ID to retrieve" }
            },
            required: ["sessionId"]
          }
        },
        {
          name: "get_session_events",
          description: "Get all events from a session with optional filtering by event type",
          inputSchema: {
            type: "object",
            properties: {
              sessionId: { type: "string", description: "The session ID" },
              eventTypes: {
                type: "array",
                items: { type: "string" },
                description: "Filter by specific event types (CLICK, INPUT, LOCATION, CUSTOM, ERROR, etc.)"
              },
              startTime: { type: "number", description: "Start timestamp (ms)" },
              endTime: { type: "number", description: "End timestamp (ms)" }
            },
            required: ["sessionId"]
          }
        },
        {
          name: "aggregate_sessions",
          description: "Aggregate session data with various metrics and groupings",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              metrics: {
                type: "array",
                description: "Metrics to calculate",
                items: {
                  type: "string",
                  enum: ["count", "avg_duration", "error_rate", "bounce_rate", "unique_users", "page_views"]
                }
              },
              groupBy: {
                type: "array",
                description: "Fields to group by",
                items: {
                  type: "string",
                  enum: ["hour", "day", "week", "browser", "device", "country", "page", "error_type"]
                }
              },
              filters: { type: "array", description: "Same filter format as search_sessions" }
            },
            required: ["metrics"]
          }
        },
        {
          name: "get_user_journey",
          description: "Get the complete journey of a user across multiple sessions",
          inputSchema: {
            type: "object",
            properties: {
              userId: { type: "string", description: "User ID or anonymous ID" },
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              includeEvents: { type: "boolean", description: "Include detailed events (default false)" }
            },
            required: ["userId"]
          }
        },
        {
          name: "get_errors_issues",
          description: "Get errors and issues with their impact and affected sessions",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              errorTypes: {
                type: "array",
                items: { type: "string" },
                description: "Filter by error types (js_exception, missing_resource, etc.)"
              },
              minOccurrences: { type: "number", description: "Minimum number of occurrences" },
              groupBy: { type: "string", enum: ["message", "stack", "url"], description: "How to group errors" }
            }
          }
        },
        {
          name: "get_funnel_analysis",
          description: "Analyze user funnels and conversion paths",
          inputSchema: {
            type: "object",
            properties: {
              steps: {
                type: "array",
                description: "Funnel steps in order",
                items: {
                  type: "object",
                  properties: {
                    name: { type: "string", description: "Step name" },
                    eventType: { type: "string", description: "Event type (LOCATION, CLICK, CUSTOM)" },
                    eventValue: { type: "string", description: "Event value to match" }
                  }
                }
              },
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              filters: { type: "array", description: "Additional filters" }
            },
            required: ["steps"]
          }
        },
        {
          name: "get_performance_metrics",
          description: "Get performance metrics like page load times, largest contentful paint, time to interactive, etc.",
          inputSchema: {
            type: "object",
            properties: {
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              metrics: {
                type: "array",
                items: {
                  type: "string",
                  enum: ["load_time", "dom_complete", "first_paint", "first_contentful_paint", "largest_contentful_paint", "time_to_interactive", "cpu_load", "memory_usage"]
                }
              },
              groupBy: {
                type: "array",
                items: { type: "string", enum: ["page", "browser", "device", "country"] }
              },
              percentiles: {
                type: "array",
                items: { type: "number" },
                description: "Percentiles to calculate (e.g., [50, 75, 90, 95, 99])"
              }
            },
            required: ["metrics"]
          }
        },
        {
          name: "execute_custom_query",
          description: "Execute a custom query on the session data (supports SQL-like syntax for ClickHouse)",
          inputSchema: {
            type: "object",
            properties: {
              query: { type: "string", description: "Custom query to execute" },
              parameters: { type: "object", description: "Query parameters" }
            },
            required: ["query"]
          }
        }
      ],
    }));

    // Handle tool calls
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case "search_sessions":
            return await this.searchSessions(args);
          case "get_session_details":
            return await this.getSessionDetails(args);
          case "get_session_events":
            return await this.getSessionEvents(args);
          case "aggregate_sessions":
            return await this.aggregateSessions(args);
          case "get_user_journey":
            return await this.getUserJourney(args);
          case "get_errors_issues":
            return await this.getErrorsIssues(args);
          case "get_funnel_analysis":
            return await this.getFunnelAnalysis(args);
          case "get_performance_metrics":
            return await this.getPerformanceMetrics(args);
          case "execute_custom_query":
            return await this.executeCustomQuery(args);
          default:
            throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
        }
      } catch (error: any) {
        if (error instanceof McpError) throw error;
        
        return {
          content: [
            {
              type: "text",
              text: `Error: ${error.message || "Unknown error occurred"}`,
            },
          ],
        };
      }
    });
  }

  private async searchSessions(args: any) {
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/sessions/search`, {
      startDate: args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: args.endDate || new Date().toISOString(),
      filters: args.filters || [],
      limit: args.limit || 50,
      offset: args.offset || 0,
      sort: args.sort || { field: "startedAt", order: "desc" }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getSessionDetails(args: any) {
    const { sessionId } = args;
    const response = await this.api.get(`/v1/projects/${OPENREPLAY_PROJECT_ID}/sessions/${sessionId}`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getSessionEvents(args: any) {
    const { sessionId, eventTypes, startTime, endTime } = args;
    const response = await this.api.get(`/v1/projects/${OPENREPLAY_PROJECT_ID}/sessions/${sessionId}/events`, {
      params: { eventTypes, startTime, endTime }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async aggregateSessions(args: any) {
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/sessions/aggregate`, {
      startDate: args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: args.endDate || new Date().toISOString(),
      metrics: args.metrics,
      groupBy: args.groupBy || [],
      filters: args.filters || []
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getUserJourney(args: any) {
    const { userId, startDate, endDate, includeEvents } = args;
    const response = await this.api.get(`/v1/projects/${OPENREPLAY_PROJECT_ID}/users/${userId}/journey`, {
      params: { startDate, endDate, includeEvents }
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getErrorsIssues(args: any) {
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/errors/search`, {
      startDate: args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: args.endDate || new Date().toISOString(),
      errorTypes: args.errorTypes || [],
      minOccurrences: args.minOccurrences || 1,
      groupBy: args.groupBy || "message"
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getFunnelAnalysis(args: any) {
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/funnels/analyze`, {
      steps: args.steps,
      startDate: args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: args.endDate || new Date().toISOString(),
      filters: args.filters || []
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getPerformanceMetrics(args: any) {
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/performance/metrics`, {
      startDate: args.startDate || new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      endDate: args.endDate || new Date().toISOString(),
      metrics: args.metrics,
      groupBy: args.groupBy || [],
      percentiles: args.percentiles || [50, 75, 90, 95, 99]
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async executeCustomQuery(args: any) {
    const { query, parameters } = args;
    const response = await this.api.post(`/v1/projects/${OPENREPLAY_PROJECT_ID}/query`, {
      query,
      parameters: parameters || {}
    });

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  async run() {
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    console.error("OpenReplay MCP Server running on stdio");
  }
}

// Main
const server = new OpenReplayMCP();
server.run().catch(console.error);