import express from 'express'
import dotenv from 'dotenv'
import auth from './routes/auth/auth.js'
dotenv.config();
const app = express();


app.use(express.json());
app.use('/auth', auth);

app.listen(3000, () => {
  console.log('Server is running on http://localhost:3000');
});