const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth.routes');
const sahayakRoutes = require('./routes/sahayak.routes');
const farmerRoutes = require('./routes/farmer.routes');

const app = express();

app.use(cors());
app.use(express.json());
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.originalUrl} from ${req.ip}`);
  next();
});

app.get('/', (req, res) => {
  res.send('API running...');
});

app.get('/health', (req, res) => {
  res.json({ success: true, message: 'Backend healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/sahayak', sahayakRoutes);
app.use('/api/farmer', farmerRoutes);

module.exports = app;