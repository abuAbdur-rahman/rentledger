import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  throw new Error("Missing MONGODB_URI environment variable");
}

const MONGODB_CONNECTION_URI: string = MONGODB_URI;

type MongooseCache = {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
};

declare global {
  // eslint-disable-next-line no-var
  var __mongooseCache__: MongooseCache | undefined;
}

const cached = global.__mongooseCache__ ?? {
  conn: null,
  promise: null,
};

global.__mongooseCache__ = cached;

export async function connectToMongoDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(MONGODB_CONNECTION_URI, {
        maxPoolSize: 10,
      })
      .then((instance) => instance);
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
