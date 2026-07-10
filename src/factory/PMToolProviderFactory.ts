import { env } from '../config/env';
import { IPMToolProvider } from '../interfaces/IPMToolProvider';
import { ClickUpProvider } from '../providers/ClickUpProvider';
import { JiraProvider } from '../providers/JiraProvider';
import { PMProvider } from '../types/ticket.types';

/**
 * Single place that knows how to turn a provider name from a request
 * into a configured IPMToolProvider instance. Callers (controllers)
 * never import a concrete provider class directly.
 */
export class PMToolProviderFactory {
  private static instances = new Map<PMProvider, IPMToolProvider>();

  static get(provider: PMProvider): IPMToolProvider {
    const cached = this.instances.get(provider);
    if (cached) return cached;

    const instance = this.create(provider);
    this.instances.set(provider, instance);
    return instance;
  }

  private static create(provider: PMProvider): IPMToolProvider {
    switch (provider) {
      case 'jira':
        return new JiraProvider(env.jira);
      case 'clickup':
        return new ClickUpProvider(env.clickup);
      default:
        throw new Error(`Unsupported PM tool provider: ${provider}`);
    }
  }
}
