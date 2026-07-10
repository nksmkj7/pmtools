import { createApp } from './app';
import { env } from './config/env';

const app = createApp();

app.listen(env.port, () => {
  // eslint-disable-next-line no-console
  console.log(
    `PM tools integration API listening on container port ${env.port} (host: http://localhost:${env.hostPort})`,
  );
});
