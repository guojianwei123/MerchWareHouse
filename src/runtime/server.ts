import { createApp } from './app';
import { appLogger } from '../adapters/logging/logger';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, () => {
  appLogger.info('Guozi Warehouse API listening', {
    module: 'server',
    url: `http://localhost:${port}`,
  });
});
