import type { AssistantTool, ToolResult } from './assistantTypes';

export class ToolRegistry {
  private tools = new Map<string, AssistantTool>();

  register(tool: AssistantTool): void {
    if (this.tools.has(tool.name)) {
      throw new Error(`Tool "${tool.name}" is already registered.`);
    }
    this.tools.set(tool.name, tool);
  }

  get(name: string): AssistantTool | undefined {
    return this.tools.get(name);
  }

  has(name: string): boolean {
    return this.tools.has(name);
  }

  getAll(): AssistantTool[] {
    return Array.from(this.tools.values());
  }

  async execute(name: string, input: Record<string, unknown>): Promise<ToolResult> {
    const tool = this.tools.get(name);
    if (!tool) {
      return {
        success: false,
        output: `Tool "${name}" not found.`
      };
    }
    try {
      return await tool.execute(input);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown tool error';
      return {
        success: false,
        output: message
      };
    }
  }
}

export function createToolRegistry(): ToolRegistry {
  return new ToolRegistry();
}
