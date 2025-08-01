const express = require('express');
const axios = require('axios');
const router = express.Router();

function extractKeyword(input) {
  const stopwords = [
    'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'aren\'t',
    'as', 'at', 'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
    'can', 'cannot', 'could', 'couldn\'t', 'did', 'didn\'t', 'do', 'does', 'doesn\'t', 'doing', 'don\'t',
    'down', 'during', 'each', 'few', 'for', 'from', 'further', 'had', 'hadn\'t', 'has', 'hasn\'t',
    'have', 'haven\'t', 'having', 'he', 'he\'d', 'he\'ll', 'he\'s', 'her', 'here', 'here\'s', 'hers',
    'herself', 'him', 'himself', 'his', 'how', 'how\'s', 'i', 'i\'d', 'i\'ll', 'i\'m', 'i\'ve', 'if',
    'in', 'into', 'is', 'isn\'t', 'it', 'it\'s', 'its', 'itself', 'let\'s', 'me', 'more', 'most',
    'mustn\'t', 'my', 'myself', 'no', 'nor', 'not', 'of', 'off', 'on', 'once', 'only', 'or', 'other',
    'ought', 'our', 'ours', 'ourselves', 'out', 'over', 'own', 'same', 'shan\'t', 'she', 'she\'d',
    'she\'ll', 'she\'s', 'should', 'shouldn\'t', 'so', 'some', 'such', 'than', 'that', 'that\'s', 'the',
    'their', 'theirs', 'them', 'themselves', 'then', 'there', 'there\'s', 'these', 'they', 'they\'d',
    'they\'ll', 'they\'re', 'they\'ve', 'this', 'those', 'through', 'to', 'too', 'under', 'until', 'up',
    'very', 'was', 'wasn\'t', 'we', 'we\'d', 'we\'ll', 'we\'re', 'we\'ve', 'were', 'weren\'t', 'what',
    'what\'s', 'when', 'when\'s', 'where', 'where\'s', 'which', 'while', 'who', 'who\'s', 'whom', 'why',
    'why\'s', 'with', 'won\'t', 'would', 'wouldn\'t', 'you', 'you\'d', 'you\'ll', 'you\'re', 'you\'ve',
    'your', 'yours', 'yourself', 'yourselves', 'wanna', 'goto', 'gonna'
  ];
  const words = input.toLowerCase().split(/\W+/).filter(w => w && !stopwords.includes(w));
  return words.join(' ');
}

module.exports = function () {
  // 🔎 Main Wikipedia Summary Route
  router.get('/wikipedia', async (req, res) => {
    const rawQuery = req.query.q;
    if (!rawQuery) {
      return res.status(400).json({ error: '404 No place' });
    }

    const keyword = extractKeyword(rawQuery);

    try {
      const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: keyword,
          format: 'json',
        }
      });

      const searchResults = searchRes.data.query.search;
      if (!searchResults.length) {
        return res.status(404).json({ error: 'No results found on Wikipedia' });
      }

      const bestTitle = searchResults[0].title;

      const summaryRes = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(bestTitle)}`
      );

      const data = summaryRes.data;

      res.json({
        title: data.title,
        description: data.description,
        extract: data.extract,
        image: data.thumbnail?.source || null,
        wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(bestTitle)}`
      });

    } catch (error) {
      console.error("Wikipedia fetch error:", error.message);
      res.status(500).json({ error: "Failed to fetch Wikipedia article" });
    }
  });

  // 💡 Suggestion Route
  router.get('/wiki-suggestions', async (req, res) => {
    const rawQuery = req.query.q;
    if (!rawQuery) {
      return res.status(400).json({ error: 'Missing query' });
    }

    const keyword = extractKeyword(rawQuery);

    try {
      const searchRes = await axios.get('https://en.wikipedia.org/w/api.php', {
        params: {
          action: 'query',
          list: 'search',
          srsearch: keyword,
          format: 'json',
        }
      });

      const searchResults = searchRes.data.query.search || [];
      const suggestions = searchResults.map(item => item.title);

      res.json({ suggestions });
    } catch (error) {
      console.error("Wikipedia suggestion error:", error.message);
      res.status(500).json({ error: "Failed to fetch Wikipedia suggestions" });
    }
  });

  return router;
};
