const { getCache, setCache, deleteCache, deleteCachePattern, CACHE_TTL } = require('./cache.service');

// Cache messages for a room
const cacheRoomMessages = async (roomId, messages) => {
  const cacheKey = `messages:${roomId}`;
  await setCache(cacheKey, messages, CACHE_TTL.MESSAGES);
};

// Get cached messages
const getCachedRoomMessages = async (roomId) => {
  const cacheKey = `messages:${roomId}`;
  return await getCache(cacheKey);
};

// Invalidate messages cache
const invalidateRoomMessagesCache = async (roomId) => {
  const cacheKey = `messages:${roomId}`;
  await deleteCache(cacheKey);
};

// Cache join requests
const cacheJoinRequests = async (roomId, requests) => {
  const cacheKey = `join-requests:${roomId}`;
  await setCache(cacheKey, requests, CACHE_TTL.JOIN_REQUESTS);
};

// Get cached join requests
const getCachedJoinRequests = async (roomId) => {
  const cacheKey = `join-requests:${roomId}`;
  return await getCache(cacheKey);
};

// Invalidate join requests cache
const invalidateJoinRequestsCache = async (roomId) => {
  const cacheKey = `join-requests:${roomId}`;
  await deleteCache(cacheKey);
};

module.exports = {
  cacheRoomMessages,
  getCachedRoomMessages,
  invalidateRoomMessagesCache,
  cacheJoinRequests,
  getCachedJoinRequests,
  invalidateJoinRequestsCache,
};
