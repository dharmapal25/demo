const redisClient = require('../config/redis');

// Cache TTL (Time To Live) in seconds
const CACHE_TTL = {
  ROOM: 300, // 5 minutes
  ROOMS_LIST: 60, // 1 minute
  MESSAGES: 600, // 10 minutes
  USER: 300, // 5 minutes
  JOIN_REQUESTS: 120, // 2 minutes
};

// Get from cache
const getCache = async (key) => {
  try {
    const data = await redisClient.get(key);
    return data ? JSON.parse(data) : null;
  } catch (err) {
    console.error(`Cache get error for key ${key}:`, err);
    return null;
  }
};

// Set in cache
const setCache = async (key, data, ttl = CACHE_TTL.ROOM) => {
  try {
    await redisClient.setex(key, ttl, JSON.stringify(data));
  } catch (err) {
    console.error(`Cache set error for key ${key}:`, err);
  }
};

// Delete from cache
const deleteCache = async (key) => {
  try {
    await redisClient.del(key);
  } catch (err) {
    console.error(`Cache delete error for key ${key}:`, err);
  }
};

// Delete cache pattern (e.g., room:*)
const deleteCachePattern = async (pattern) => {
  try {
    const keys = await redisClient.keys(pattern);
    if (keys.length > 0) {
      await redisClient.del(...keys);
    }
  } catch (err) {
    console.error(`Cache delete pattern error for ${pattern}:`, err);
  }
};

// Clear all cache
const clearAllCache = async () => {
  try {
    await redisClient.flushdb();
  } catch (err) {
    console.error('Cache clear all error:', err);
  }
};

module.exports = {
  getCache,
  setCache,
  deleteCache,
  deleteCachePattern,
  clearAllCache,
  CACHE_TTL,
};
