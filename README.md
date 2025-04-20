# LangChain Agent for MCP

This is a test project demonstrating how to create a LangChain agent that interacts with an MCP (Model Context Protocol) server.

## Overview

This agent:
- Fetches available tools from an MCP server
- Creates dynamic LangChain tools from the MCP tool definitions
- Executes queries using these tools through a LLM-powered agent

## Setup

1. Install dependencies:
```
npm install
```

2. Set up environment variables:
```
cp .env.sample .env
```
Then add your OpenAI API key and the MCP server URL.

3. Run the agent:
```
node agent.js
```

## How It Works

The agent will:
1. Connect to the MCP server and fetch all available tools
2. Create a LangChain agent with these tools and a specific prompt
3. Process user queries by selecting and executing the appropriate tools
4. Return results in a coherent format
