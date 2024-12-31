import mongoose from 'mongoose';

if (!global.mongoose) {
  global.mongoose = { conn: null, promise: null };
}

export async function connectToDatabase(): Promise<mongoose.Connection> {
  if (global.mongoose.conn) {
    return global.mongoose.conn;
  }

  if (!global.mongoose.promise) {
    const opts = {
      bufferCommands: false,
    };

    global.mongoose.promise = mongoose.connect(process.env.MONGODB_URI!, opts).then((mongoose) => mongoose.connection);
  }

  global.mongoose.conn = await global.mongoose.promise;
  return global.mongoose.conn;
}