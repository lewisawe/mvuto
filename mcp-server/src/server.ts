import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import {
  PRESET_NAMES,
  getPresetData,
  isPresetName,
} from './presets-data.js';

/**
 * Build the `mvuto-bodies` MCP server (REQ-24). Both tools delegate to the
 * shared preset module so the live tool output and the exported JSON agree.
 */
export const buildServer = (): McpServer => {
  const server = new McpServer({
    name: 'mvuto-bodies',
    version: '1.0.0',
  });

  // list_presets — enumerate the available celestial presets.
  server.registerTool(
    'list_presets',
    {
      title: 'List presets',
      description:
        'List the names of the available celestial presets for the Mvuto gravity sandbox.',
      inputSchema: {},
    },
    async () => ({
      content: [
        {
          type: 'text',
          text: JSON.stringify({ presets: PRESET_NAMES }, null, 2),
        },
      ],
    }),
  );

  // get_preset — return the bodies for a named preset.
  server.registerTool(
    'get_preset',
    {
      title: 'Get preset',
      description:
        'Return the full list of bodies (position, velocity, mass, hue) for a named preset. ' +
        `Valid names: ${PRESET_NAMES.join(', ')}.`,
      inputSchema: {
        name: z
          .string()
          .describe(`Preset name. One of: ${PRESET_NAMES.join(', ')}.`),
      },
    },
    async ({ name }) => {
      if (!isPresetName(name)) {
        return {
          isError: true,
          content: [
            {
              type: 'text',
              text: `Unknown preset "${name}". Valid names: ${PRESET_NAMES.join(', ')}.`,
            },
          ],
        };
      }
      const bodies = getPresetData(name);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ name, bodies }, null, 2),
          },
        ],
      };
    },
  );

  return server;
};
