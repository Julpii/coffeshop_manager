import { app } from './app.js';
import { config } from './config.js';

app.listen(config.port, () => console.log(`Coffee shop API running on http://localhost:${config.port}`));
