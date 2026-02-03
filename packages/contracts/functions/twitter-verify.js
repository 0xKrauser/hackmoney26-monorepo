// Chainlink Functions source for Twitter verification
// args[0] = twitter username
// args[1] = ethereum address (lowercase hex with 0x prefix)
// secrets.TWITTER_BEARER_TOKEN = Twitter API v2 bearer token
/* global args, Functions, secrets */

const username = args[0];
const expectedAddress = args[1].toLowerCase();

if (!username || !expectedAddress) {
  return Functions.encodeInt256(-1);
}

// Step 1: Get user ID from username
const userResponse = await Functions.makeHttpRequest({
  url: `https://api.x.com/2/users/by/username/${username}`,
  headers: {
    Authorization: `Bearer ${secrets.TWITTER_BEARER_TOKEN}`,
  },
});

if (userResponse.error) {
  return Functions.encodeInt256(-1);
}

const userId = userResponse.data.data.id;

if (!userId) {
  return Functions.encodeInt256(-1);
}

// Step 2: Get recent tweets
const tweetsResponse = await Functions.makeHttpRequest({
  url: `https://api.x.com/2/users/${userId}/tweets?max_results=10`,
  headers: {
    Authorization: `Bearer ${secrets.TWITTER_BEARER_TOKEN}`,
  },
});

if (tweetsResponse.error) {
  return Functions.encodeInt256(-1);
}

const tweets = tweetsResponse.data.data;

if (!tweets || tweets.length === 0) {
  return Functions.encodeInt256(0);
}

// Step 3: Check if any tweet contains the verification message
const verificationPrefix = 'verifying my twitter account for ';
let verified = false;

for (const tweet of tweets) {
  const text = tweet.text.toLowerCase();
  if (text.includes(verificationPrefix) && text.includes(expectedAddress)) {
    verified = true;
    break;
  }
}

return Functions.encodeInt256(verified ? 1 : 0);
