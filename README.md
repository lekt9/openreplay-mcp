# OpenReplay MCP Server

An MCP (Model Context Protocol) server that provides AI-powered analytics for OpenReplay sessions. This server enables LLMs to query and analyze user sessions through OpenReplay's API.

## Authentication Methods

### API Key Authentication (Current)
The server currently uses API key authentication which provides access to:
- List all projects
- Get user sessions by user ID
- Get session events
- User details

**Note**: API key authentication has limited access. For full functionality (session search, metrics, funnels, etc.), JWT authentication is required.

### JWT Authentication (Future)
Full access to all OpenReplay features including:
- Complete session search with filters
- Performance metrics and analytics
- Funnel analysis
- Error tracking and aggregation
- Custom dashboards and metrics

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
# Your OpenReplay workspace URL
# For cloud: https://your-workspace.openreplay.com
# For self-hosted: Your instance URL
OPENREPLAY_API_URL=https://your-workspace.openreplay.com

# Organization API Key (find in Preferences > Account > Organization API Key)
OPENREPLAY_API_KEY=your_organization_api_key

# Project key from your project settings
OPENREPLAY_PROJECT_KEY=your_project_key
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
        "OPENREPLAY_API_URL": "https://your-workspace.openreplay.com",
        "OPENREPLAY_API_KEY": "your_organization_api_key",
        "OPENREPLAY_PROJECT_KEY": "your_project_key"
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