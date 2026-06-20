import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import leaderboardRouter from './routes/leaderboard.js';
import authRouter from './routes/admin/auth.js';
import matchesRouter from './routes/admin/matches.js';
import usersRouter from './routes/admin/users.js';
import predictionsRouter from './routes/admin/predictions.js';
import dashboardRouter from './routes/admin/dashboard.js';
import gamesRouter from './routes/admin/games.js';
import bracketRouter from './routes/admin/bracket.js';
import prizeTiersRouter from './routes/admin/prizeTiers.js';
import publicGamesRouter from './routes/games.js';
import publicMatchesRouter from './routes/matches.js';
import publicBracketRouter from './routes/bracket.js';
import publicTeamsRouter from './routes/teams.js';
import adminTeamsRouter from './routes/admin/teams.js';
import participantsRouter from './routes/participants.js';
import settingsRouter from './routes/settings.js';
import adminSettingsRouter from './routes/admin/settings.js';
import errorHandler from './middleware/errorHandler.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const app = express();

app.use(cors({ origin: process.env.CLIENT_ORIGIN || 'http://localhost:5173' }));
app.use(express.json());

// Locally-stored team icons (country flags / club logos), US-114.
app.use('/icons', express.static(join(__dirname, '../public/icons')));

app.use('/api/leaderboard', leaderboardRouter);
app.use('/api/admin/auth', authRouter);
app.use('/api/admin/matches', matchesRouter);
app.use('/api/admin/users', usersRouter);
app.use('/api/admin/predictions', predictionsRouter);
app.use('/api/admin/dashboard', dashboardRouter);
app.use('/api/admin/games', gamesRouter);
app.use('/api/admin/bracket', bracketRouter);
app.use('/api/admin/prize-tiers', prizeTiersRouter);
app.use('/api/games', publicGamesRouter);
app.use('/api/matches', publicMatchesRouter);
app.use('/api/bracket', publicBracketRouter);
app.use('/api/teams', publicTeamsRouter);
app.use('/api/admin/teams', adminTeamsRouter);
app.use('/api/participants', participantsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/admin/settings', adminSettingsRouter);

app.use(errorHandler);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));

export default app;
