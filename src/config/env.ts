import dotenv from 'dotenv';

dotenv.config();

export const env = {
  port: parseInt(process.env.PORT ?? '3000', 10),
  // Set by docker-compose.yml to the host-side port from the same PORT value
  // used in its port mapping. Falls back to `port` when run outside Docker,
  // where the process's own port IS the host-reachable port.
  hostPort: parseInt(process.env.HOST_PORT ?? process.env.PORT ?? '3000', 10),
  jira: {
    baseUrl: process.env.JIRA_BASE_URL ?? '',
    email: process.env.JIRA_EMAIL ?? '',
    apiToken: process.env.JIRA_API_TOKEN ?? '',
  },
  clickup: {
    baseUrl: process.env.CLICKUP_BASE_URL ?? 'https://api.clickup.com',
    apiToken: process.env.CLICKUP_API_TOKEN ?? '',
  },
};
