const express = require("express");
const cors = require("cors");
require("dotenv").config();

const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7p3fj4a.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("electraPollDB");
    const userCollection = database.collection("users");

    // .............Authentication related api
    // Users
    app.post("/users", async (req, res) => {
      const user = req.body;
      const query = { email: user.email };
      const existingUser = await userCollection.findOne(query);
      if (existingUser) {
        return res.send({ message: "account already exist" });
      }
      const result = await userCollection.insertOne(user);
      res.send(result);
    });

    const votersCollection = client.db("electraPollDB").collection("voters");
    const electionCollection = client.db("electraPollDB").collection("elections")

    // ======================voter related apis===========================

    // add voter api
    app.patch("/add-voters/:email", async (req, res) => {
      const { email } = req.params;
      const voter = req.body;
      console.log(voter);
      const query = { email: email };
      const findVoters = await votersCollection.findOne(query);
      if (findVoters) {
        // if manager already add voter sedfadf
        const previousVoters = findVoters.voters;
        const newVoters = [...previousVoters, voter];
        console.log(previousVoters, voter);
        const updateDoc = {
          $set: {
            voters: newVoters,
          },
        };

        const options = { upsert: true };
        const result = await votersCollection.updateOne(
          query,
          updateDoc,
          options
        );
        res.send(result);
      } else {
        // if manager first add a voter
        console.log("nothing");
        const voterInfo = { email: email, voters: [voter] };
        const result = await votersCollection.insertOne(voterInfo);
        res.send(result);
      }
    });

    // =============== add elections ============
    app.post('/add-election', async (req, res) => {
      const election = req.body
      const result = await electionCollection.insertOne(election)
      res.send(result)
    })


    // -=============== update elections ===============
    app.patch('/election/:id', async (req, res) => {
      const id = req.params.id
      const election = req.body
      delete election._id
      const result = await electionCollection.updateOne({ _id: new ObjectId(id) }, { $set: election })
      res.send(result)
    })

    app.get('/election/:id', async (req, res) => {
      const id = req.params.id
      const result = await electionCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })
    app.get('/election', async (req, res) => {
      const result = await electionCollection.find()
      res.send(result)
    })

    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});
