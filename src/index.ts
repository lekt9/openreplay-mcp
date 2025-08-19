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
const OPENREPLAY_PROJECT_KEY = process.env.OPENREPLAY_PROJECT_KEY || process.env.OPENREPLAY_PROJECT_ID || "";

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
        "Authorization": OPENREPLAY_API_KEY,
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
          name: "list_projects",
          description: "Get list of all projects in the organization",
          inputSchema: {
            type: "object",
            properties: {},
            required: []
          }
        },
        {
          name: "get_user_sessions",
          description: "Get sessions for a specific user ID (API key authentication supported)",
          inputSchema: {
            type: "object",
            properties: {
              userId: { type: "string", description: "The user ID to get sessions for" },
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" }
            },
            required: ["userId"]
          }
        },
        {
          name: "search_sessions",
          description: "[Requires userId with API key auth] Search and filter sessions. Full search requires JWT authentication.",
          inputSchema: {
            type: "object",
            properties: {
              userId: { type: "string", description: "Required: User ID to search sessions for" },
              startDate: { type: "string", description: "Start date in ISO format" },
              endDate: { type: "string", description: "End date in ISO format" },
              filters: {
                type: "array",
                description: "Filters (limited with API key auth)",
                items: {
                  type: "object",
                  properties: {
                    type: { type: "string", description: "Filter type" },
                    operator: { type: "string", description: "Operator" },
                    value: { type: ["string", "number", "array"], description: "Filter value" }
                  }
                }
              },
              limit: { type: "number", description: "Number of sessions to return" },
              offset: { type: "number", description: "Offset for pagination" },
              sort: {
                type: "object",
                properties: {
                  field: { type: "string", description: "Field to sort by" },
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
          case "list_projects":
            return await this.listProjects();
          case "get_user_sessions":
            return await this.getUserSessions(args);
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

  private async listProjects() {
    const response = await this.api.get(`/api/v1/projects`);

    return {
      content: [
        {
          type: "text",
          text: JSON.stringify(response.data, null, 2),
        },
      ],
    };
  }

  private async getUserSessions(args: any) {
    const { userId, startDate, endDate } = args;
    const response = await this.api.get(`/api/v1/${OPENREPLAY_PROJECT_KEY}/users/${userId}/sessions`, {
      params: {
        start_date: startDate ? new Date(startDate).getTime() : undefined,
        end_date: endDate ? new Date(endDate).getTime() : undefined
      }
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

  private async searchSessions(args: any) {
    // Note: The v1 API with API keys has limited endpoints
    // For full session search, JWT authentication is required
    // This uses the user sessions endpoint as an alternative
    if (!args.userId) {
      return {
        content: [
          {
            type: "text",
            text: "Session search requires a userId when using API key authentication. For full search capabilities, JWT authentication is needed.",
          },
        ],
      };
    }
    
    const response = await this.api.get(`/api/v1/${OPENREPLAY_PROJECT_KEY}/users/${args.userId}/sessions`, {
      params: {
        start_date: args.startDate ? new Date(args.startDate).getTime() : Date.now() - 7 * 24 * 60 * 60 * 1000,
        end_date: args.endDate ? new Date(args.endDate).getTime() : Date.now()
      }
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
    // Session replay details not available via v1 API
    // Only events are available
    return {
      content: [
        {
          type: "text",
          text: "Session replay details are not available via API key authentication. Use get_session_events instead or use JWT authentication for full access.",
        },
      ],
    };
  }

  private async getSessionEvents(args: any) {
    const { sessionId } = args;
    const response = await this.api.get(`/api/v1/${OPENREPLAY_PROJECT_KEY}/sessions/${sessionId}/events`);

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
    // Aggregation requires access to the full sessions/search endpoint
    // which is not available via API key authentication
    return {
      content: [
        {
          type: "text",
          text: "Session aggregation is not available via API key authentication. You can retrieve individual user sessions instead.",
        },
      ],
    };
  }

  private async getUserJourney(args: any) {
    const { userId, startDate, endDate } = args;
    // Use the v1 API user sessions endpoint
    const response = await this.api.get(`/api/v1/${OPENREPLAY_PROJECT_KEY}/users/${userId}/sessions`, {
      params: {
        start_date: startDate ? new Date(startDate).getTime() : Date.now() - 30 * 24 * 60 * 60 * 1000,
        end_date: endDate ? new Date(endDate).getTime() : Date.now()
      }
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
    // Error analysis requires JWT authentication
    return {
      content: [
        {
          type: "text",
          text: "Error analysis is not available via API key authentication. JWT authentication is required for this feature.",
        },
      ],
    };
  }

  private async getFunnelAnalysis(args: any) {
    // Funnel analysis requires JWT authentication
    return {
      content: [
        {
          type: "text",
          text: "Funnel analysis is not available via API key authentication. JWT authentication is required for this feature.",
        },
      ],
    };
  }

  private async getPerformanceMetrics(args: any) {
    // Performance metrics require JWT authentication
    return {
      content: [
        {
          type: "text",
          text: "Performance metrics are not available via API key authentication. JWT authentication is required for this feature.",
        },
      ],
    };
  }

  private async executeCustomQuery(args: any) {
    // OpenReplay doesn't expose direct query access, but we can use the search with complex filters
    const { query, parameters } = args;
    
    return {
      content: [
        {
          type: "text",
          text: "Custom queries are not directly supported. Please use the specific search and filter tools instead.",
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