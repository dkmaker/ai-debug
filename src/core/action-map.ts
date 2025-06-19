import type { DebugContext, WrapOptions } from '../types/index.js';

export interface ActionMapEntry {
  template: string;
  context?: ((...args: unknown[]) => DebugContext) | DebugContext;
  cache?: {
    enabled?: boolean;
    ttl?: number | ((result: unknown) => number);
    key?: (context: DebugContext) => string;
  };
  raw?: boolean;
}

export interface ActionMap {
  [action: string]: ActionMapEntry;
}

export class ActionMapRegistry {
  private actionMap: ActionMap = {};

  register(actions: ActionMap): void {
    Object.assign(this.actionMap, actions);
  }

  getAction(name: string): ActionMapEntry | undefined {
    return this.actionMap[name];
  }

  resolveOptions(action: string, args: unknown[]): WrapOptions {
    const entry = this.getAction(action);
    if (!entry) {
      return {};
    }

    const options: WrapOptions = {
      template: entry.template,
      raw: entry.raw,
    };

    // Resolve context
    if (entry.context) {
      if (typeof entry.context === 'function') {
        options.context = entry.context(...args);
      } else {
        options.context = entry.context;
      }
    }

    return options;
  }

  has(action: string): boolean {
    return action in this.actionMap;
  }

  list(): string[] {
    return Object.keys(this.actionMap);
  }
}
