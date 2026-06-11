import 'dotenv/config';
import express from 'express';
import cors from 'cors';

import leaderboardRouter from './routes/leaderboard.js';
import authRouter from './routes/admin/auth.js';
import matchesRouter from './routes/admin/matches.js';
import usersRouter from './routes/admin/users.js';
import predictionsRouter from './routes/admin/predictions.js';
import errorHandler from './middleware/errorHandler.js';

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin/auth', authRouter);
app.use('/api/admin/matches', matchesRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/predictions', predictionsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
