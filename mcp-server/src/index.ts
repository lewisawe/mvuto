#!/usr/bin/env node
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';

import { buildServer } from './server.js';

/**
 * Entry point for the `mvuto-bodies` MCP server. Speaks MCP over stdio so a Kiro
 * client (configured in .kiro/settings/mcp.json) can call `list_presets` and
 * `get_preset`.
 */
const main = async (): Promise<void> => {
  const server = buildServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // Never log to stdout: it is the MCP transport channel. Use stderr only.
  process.stderr.write('[mvuto-bodies] MCP server running on stdio\n');
};

main().catch((err) => {
  process.stderr.write(`[mvuto-bodies] fatal: ${String(err)}\n`);
  process.exit(1);
});
