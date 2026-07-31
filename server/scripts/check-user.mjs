import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.join(__dirname, '..', '.env') });
dotenv.config({ path: path.join(__dirname, '..', '.env.local') });

await mongoose.connect(process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/mern-social-app');
const User = mongoose.models.User || (await import('../models/User.js')).default;
const user = await User.findOne({ email: 'gabrufahad500@gmail.com' }).select('+password').lean();
console.log(JSON.stringify(user, null, 2));
await mongoose.disconnect();
