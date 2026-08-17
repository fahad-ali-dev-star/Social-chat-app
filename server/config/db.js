import mongoose from "mongoose";
import dns from "dns";

export const connectDB = async () => {
  try {
    // Configure reliable DNS servers to avoid querySrv ECONNREFUSED on local networks / Windows
    try {
      if (dns.setServers) {
        dns.setServers(["8.8.8.8", "1.1.1.1", "1.0.0.1"]);
      }
    } catch {
      // Ignore if DNS override is not permitted
    }

    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI || "mongodb://127.0.0.1:27017/mern-social-app";
    const conn = await mongoose.connect(mongoUri, {
      serverSelectionTimeoutMS: 10000,
      socketTimeoutMS: 45000,
      maxPoolSize: 50,
      minPoolSize: 5,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
    });
    console.log(`MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (err) {
    console.error(`MongoDB connection error: ${err.message}`);
    console.warn("Continuing without a database connection. Install MongoDB or set MONGO_URI to enable full auth and post features.");
    return null;
  }
};
