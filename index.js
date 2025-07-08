const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();

const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.cjuyyb2.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


const apiRoutes = require('./apiRoutes');

async function run() {
  try {

    await client.connect();
    console.log(" MongoDB connected");


    const db = client.db('goShanta');


    app.use('/api', apiRoutes(db));

    app.get('/', (req, res) => {
      res.send('GoShanta falling from the sky');
    });


    app.listen(port, () => {
      console.log(` GoShanta is running on port ${port}`);
    });

  } catch (err) {
    console.error("❌ MongoDB connection error:", err);
  }
}

run();
