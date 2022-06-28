const { createClient } = require("redis");

var cacheHostName = process.env.CACHEHOSTNAME;
var cachePassword = process.env.CACHEPASSWORD;

try {
  // Connecting to redis
  const client = createClient({
    url: "redis://" + cacheHostName + ":6379",
    password: cachePassword,
    lazyConnect: true,
    showFriendlyErrorStack: false,
    retry_strategy: (options) => {
      const { error, total_retry_time, attempt } = options;
      if (error?.code === "ECONNREFUSED" || error?.code === "NR_CLOSED") {
        return 5000;
      }
      if (total_retry_time > 1000 * 15) {
        return undefined;
      }
      if (attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 1000, 5000); //in ms
    },
  });

  client.on("error", () => {
    client.disconnect();
  });

  if (!client.isOpen) client.connect();

  module.exports = client;
} catch (error) {
  const client = createClient({
    url: "redis://" + cacheHostName + ":6379",
    password: cachePassword,
    lazyConnect: true,
    showFriendlyErrorStack: false,
    retry_strategy: (options) => {
      const { error, total_retry_time, attempt } = options;
      if (error?.code === "ECONNREFUSED" || error?.code === "NR_CLOSED") {
        return 5000;
      }
      if (total_retry_time > 1000 * 15) {
        return undefined;
      }
      if (attempt > 10) {
        return undefined;
      }
      return Math.min(options.attempt * 1000, 5000); //in ms
    },
  });
  module.exports = client;
}
