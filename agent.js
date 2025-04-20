require("dotenv").config();
const { ChatOpenAI } = require("@langchain/openai");
const { AgentExecutor, createReactAgent } = require("langchain/agents");
const { DynamicTool } = require("langchain/tools");
const { ChatPromptTemplate } = require("@langchain/core/prompts");
const axios = require("axios");
const readline = require("readline");

// Function to request user input
function askUserId(question) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      rl.close();
      resolve(answer);
    });
  });
}

// Step 1: Fetch the list of tools from your MCP server
async function fetchToolsFromMCP() {
  const res = await axios.get(`${process.env.MCP_SERVER_URL}/tools`);
  const toolDefs = res.data.tools;

  return toolDefs.map((tool) => {
    return new DynamicTool({
      name: tool.name,
      description: tool.description,
      func: async (input) => {
        try {
          let parameters;

          // If the input is a string, try to repair the JSON format
          if (typeof input === "string") {
            try {
              // Fix JSON formatting issues
              let fixedInput = input
                .replace(/([{,]\s*)(\w+)\s*:/g, '$1"$2":') // keys
                .replace(/:\s*(\w+)(?=[}\s])/g, ': "$1"'); // values

              parameters = JSON.parse(fixedInput);
              console.log("Parsed parameters:", parameters);
            } catch (parseError) {
              console.error("Error parsing JSON:", parseError);
              console.error("Received input:", input);
              throw new Error(`Could not parse input as JSON: ${input}`);
            }
          } else {
            parameters = input;
          }

          const response = await axios.post(
            `${process.env.MCP_SERVER_URL}/tools/${tool.name}`,
            {
              parameters,
            }
          );
          return JSON.stringify(response.data);
        } catch (error) {
          console.error(`Error in tool ${tool.name}:`, error);
          return `Error: ${error.message}`;
        }
      },
    });
  });
}

// Step 2: Create agent with tools
async function main() {
  const tools = await fetchToolsFromMCP();

  const model = new ChatOpenAI({
    temperature: 0,
    modelName: "gpt-4o-mini",
    openAIApiKey: process.env.OPENAI_API_KEY,
  });

  // Create an explicit prompt for the agent
  const prompt = ChatPromptTemplate.fromTemplate(`
    You are a helpful assistant that responds to user queries using available tools.

    INSTRUCTIONS:
    1. Analyze the user query carefully
    2. Use the provided tools to gather necessary information
    3. Provide a clear and concise final answer

    FORMAT YOUR RESPONSE EXACTLY AS FOLLOWS:

    Thought: [Reasoning about the approach step by step]
    Action: [tool_name]
    Action Input: [parameters in valid JSON format]
    Observation: [tool result]
    ... (repeat Thought/Action/Action Input/Observation as needed)
    Thought: [Final reasoning based on observations]
    Final Answer: [Concise answer addressing the query]

    Query: {input}

    Available tools:
    {tools}

    Tool names: {tool_names}

    {agent_scratchpad}
  `);

  const agent = await createReactAgent({
    llm: model,
    tools: tools,
    prompt: prompt,
  });

  const executor = new AgentExecutor({
    agent: agent,
    tools: tools,
    verbose: true,
  });

  // Ask the user for a user ID
  const userId = await askUserId(
    "Enter the user ID to check their recent purchases: "
  );

  const result = await executor.invoke({
    input: `What has the userId ${userId} bought recently?`,
  });

  console.log("Response:", result.output);
}

main();
