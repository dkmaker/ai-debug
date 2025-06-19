import type { DebugContext, WrapOptions } from '../types/index.js';

/**
 * Configuration for a specific action in the action map.
 * Defines how an action should be debugged automatically.
 *
 * @interface ActionMapEntry
 * @property {string} template - Template to use for this action
 * @property {Function | DebugContext} [context] - Context generator or static context
 * @property {Object} [cache] - Cache configuration override
 * @property {boolean} [raw] - Whether to use raw debugging mode
 *
 * @example
 * const entry: ActionMapEntry = {
 *   template: 'http',
 *   context: (userId) => ({
 *     url: `/api/users/${userId}`,
 *     method: 'GET'
 *   }),
 *   cache: {
 *     enabled: true,
 *     ttl: 300
 *   }
 * };
 */
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

/**
 * Map of action names to their debug configurations.
 *
 * @interface ActionMap
 *
 * @example
 * const actionMap: ActionMap = {
 *   'getUserById': {
 *     template: 'database',
 *     context: (id) => ({ sql: 'SELECT * FROM users WHERE id = ?', params: [id] })
 *   },
 *   'fetchUserData': {
 *     template: 'http',
 *     context: { method: 'GET' }
 *   }
 * };
 */
export interface ActionMap {
  [action: string]: ActionMapEntry;
}

/**
 * Registry for action map configurations.
 * Automatically configures debugging options based on action names.
 *
 * @class ActionMapRegistry
 *
 * Common patterns:
 * - Register actions in a central location
 * - Use function contexts for dynamic values
 * - Override cache settings per action
 * - Group related actions with similar configs
 *
 * @example
 * const registry = new ActionMapRegistry();
 * registry.register({
 *   'api.users.get': { template: 'http', context: { method: 'GET' } },
 *   'api.users.create': { template: 'http', context: { method: 'POST' } },
 *   'db.users.find': { template: 'database' }
 * });
 */
export class ActionMapRegistry {
  private actionMap: ActionMap = {};

  /**
   * Registers action configurations.
   *
   * @param {ActionMap} actions - Map of actions to register
   *
   * @example
   * registry.register({
   *   'fetchUser': { template: 'http' },
   *   'saveUser': { template: 'database' }
   * });
   */
  register(actions: ActionMap): void {
    Object.assign(this.actionMap, actions);
  }

  /**
   * Gets configuration for a specific action.
   *
   * @param {string} name - Action name to look up
   * @returns {ActionMapEntry | undefined} Action configuration if found
   */
  getAction(name: string): ActionMapEntry | undefined {
    return this.actionMap[name];
  }

  /**
   * Resolves wrap options for an action.
   * Evaluates dynamic contexts if needed.
   *
   * @param {string} action - Action name
   * @param {unknown[]} args - Arguments passed to the wrapped function
   * @returns {WrapOptions} Resolved options for wrapping
   *
   * @example
   * const options = registry.resolveOptions('fetchUser', [123]);
   * // Returns: { template: 'http', context: { url: '/api/users/123' } }
   */
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

  /**
   * Checks if an action is registered.
   *
   * @param {string} action - Action name to check
   * @returns {boolean} True if action is registered
   */
  has(action: string): boolean {
    return action in this.actionMap;
  }

  /**
   * Lists all registered action names.
   *
   * @returns {string[]} Array of action names
   *
   * @example
   * const actions = registry.list();
   * console.log('Registered actions:', actions);
   */
  list(): string[] {
    return Object.keys(this.actionMap);
  }
}
