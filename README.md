# OpenReplay MCP Server

An MCP (Model Context Protocol) server that provides AI-powered analytics for OpenReplay sessions. This server enables LLMs to query and analyze user sessions, identify patterns, detect issues, and provide insights about user behavior.

## Features

The MCP server provides flexible tools that allow LLMs to:

- **Search Sessions**: Query sessions with complex filters (user properties, errors, performance metrics, custom events)
- **Analyze User Journeys**: Track complete user paths across multiple sessions
- **Identify Drop-offs**: Find where users abandon flows
- **Detect Bugs & Issues**: Aggregate and analyze errors across sessions
- **Performance Analysis**: Get metrics like page load times, LCP, TTI
- **Funnel Analysis**: Analyze conversion paths and drop-off points
- **Custom Queries**: Execute custom queries for advanced analysis

## Installation

```bash
npm install
npm run build
```

## Configuration

1. Copy `.env.example` to `.env`:
```bash
cp .env.example .env
```

2. Configure your OpenReplay credentials:
```env
# OPENREPLAY_API_URL is optional - defaults to https://api.openreplay.com
OPENREPLAY_API_KEY=your_api_key
OPENREPLAY_PROJECT_ID=your_project_id
```

## Usage with Claude Desktop

Add to your Claude Desktop configuration (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "openreplay": {
      "command": "node",
      "args": ["/path/to/openreplay-mcp/dist/index.js"],
      "env": {
        "OPENREPLAY_API_URL": "https://api.openreplay.com",
        "OPENREPLAY_API_KEY": "your_api_key",
        "OPENREPLAY_PROJECT_ID": "your_project_id"
      }
    }
  }
}
```

## Available Tools

### search_sessions
Search and filter sessions with various criteria like date range, user properties, errors, performance metrics.

### get_session_details
Get detailed information about a specific session including all events, errors, network requests, console logs.

### get_session_events
Get all events from a session with optional filtering by event type.

### aggregate_sessions
Aggregate session data with various metrics and groupings (count, avg_duration, error_rate, bounce_rate, etc.).

### get_user_journey
Get the complete journey of a user across multiple sessions.

### get_errors_issues
Get errors and issues with their impact and affected sessions.

### get_funnel_analysis
Analyze user funnels and conversion paths with custom step definitions.

### get_performance_metrics
Get performance metrics like page load times, LCP, TTI with percentiles.

### execute_custom_query
Execute custom queries for advanced analysis (SQL-like syntax for ClickHouse).

## Example Queries

Once connected, you can ask the LLM questions like:

- "What are the most common drop-off points in our checkout flow?"
- "Show me the longest user sessions from the last week"
- "What JavaScript errors are affecting the most users?"
- "Analyze the user journey for users who converted vs those who didn't"
- "What pages have the worst performance metrics?"
- "Find patterns in sessions that resulted in errors"
- "Show me the bounce rate by device type and country"

## Development

```bash
# Run in development mode
npm run dev

# Build for production
npm run build

# Start production server
npm start
```

## License

MIT