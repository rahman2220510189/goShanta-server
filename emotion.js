const express = require('express');
const axios = require('axios');
const router = express.Router();

module.exports = function () {
  router.get('/wikipedia', async (req, res) => {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    try {
      const response = await axios.get(
        `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(query)}`
      );

      const data = response.data;

      res.json({
        title: data.title,
        description: data.description,
        extract: data.extract,
        image: data.thumbnail?.source || null,
        wikipedia_url: `https://en.wikipedia.org/wiki/${encodeURIComponent(query)}`
      });
    } catch (error) {
      console.error("Wikipedia API error:", error.message);
      res.status(500).json({ error: "Failed to fetch from Wikipedia" });
    }
  });
   router.get('/wiki-suggestions', async (req, res) => {
    const query = req.query.q;
    if (!query) {
      return res.status(400).json({ error: 'Missing search query' });
    }

    try {
      const response = await axios.get(
        `https://en.wikipedia.org/w/api.php`,
        {
          params: {
            action: 'opensearch',
            search: query,
            limit: 5,
            namespace: 0,
            format: 'json'
          }
        }
      );

      const suggestions = response.data[1]; 
      res.json({ suggestions });
    } catch (error) {
      console.error("Wikipedia suggestion error:", error.message);
      res.status(500).json({ error: "Failed to fetch Wikipedia suggestions" });
    }
  });

  return router;
};