const redis = require("redis");
const redisClient = redis.createClient();

(async () => {
  await redisClient.connect({
    url: "redis://localhost:6379",
    socket: {
      host: "localhost",
      port: 6379,
    },
  });
})();

redisClient.on("ready", () => {
  console.log("Redis Client Connected!");
});

redisClient.on("error", (err) => {
  console.log("Error in the Connection");
});
