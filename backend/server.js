require('dotenv').config();

const app = require('./src/app');
const connectDB = require('./src/config/db');
const { ensureFixedSahayak } = require('./src/services/seed.service');

const bootstrap = async () => {
  try {
    await connectDB();
    await ensureFixedSahayak();

    const port = process.env.PORT || 5000;
    const host = process.env.HOST || '0.0.0.0';
    app.listen(port, host, () => {
      console.log(`Server running on http://${host}:${port}`);
    });
  } catch (error) {
    console.error('Server bootstrap failed:', error);
    process.exit(1);
  }
};

bootstrap();