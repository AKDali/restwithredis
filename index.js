const express = require("express");
const redis = require("redis");
const fetch = require("node-fetch");

const PORT = process.env.PORT || 5000;
const REDIS_URL = process.env.REDIS_URL || "redis";
const REDIS_PORT = process.env.REDIS_PORT || 6379;

const client = redis.createClient({
  host: REDIS_URL,
  port: REDIS_PORT,
});

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: false }));

const cache = (req, res, next) => {
  // Check if data is cached
  const { username } = req.params;
  client.get(username, (err, data) => {
    if (err) {
      return res.status(500).json({ msg: "error with redis" });
    }
    if (data !== null) {
      res.status(200).json({ message: `${username} has ${data} github repos` });
    } else {
      next();
    }
  });
};

app.get("/", (req, res) => {
  res.send("All well ...");
});

app.get("/repos/:username", cache, async (req, res) => {
  try {
    // Fetch the data
    const { username } = req.params;
    const response = await fetch(`https://api.github.com/users/${username}`);
    const data = await response.json();
    const repos = data.public_repos;

    // set data to redis
    client.setex(username, 60, repos);

    res.status(200).json({ message: `${username} has ${repos} github repos` });
  } catch (e) {
    res.status(500).json({ msg: e });
  }
});

app.listen(PORT, () => console.log(`App listening on ${PORT}`));
