const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { ObjectId } = require('mongodb');

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

        app.get("/api/hotels/:id", async (req, res) => {
            try {
                const hotel = await db.collection("hotels").findOne({ _id: new ObjectId(req.params.id) });
                res.send(hotel);
            } catch (error) {
                console.error("Error fetching hotel:", error);
                res.status(500).send({ error: "Something went wrong!" });
            }
        });
         
        app.post('/api/bookings', async(req, res) =>{
            try{
                const bookingData = req.body;
                const result = await db.collection('bookings').insertOne(bookingData);
                res.status(201).send({success : true, insertedId: result.insertedId})
            } catch(error){
                  console.error("Booking Error:", error);
    res.status(500).send({ success: false, error: "Failed to submit booking" });  
            }
        })


        app.get('/', (req, res) => {
            res.send('GoShanta falling from the sky');
        });


        app.listen(port, () => {
            console.log(` GoShanta is running on port ${port}`);
        });

    } catch (err) {
        console.error(" MongoDB connection error:", err);
    }
}

run();
