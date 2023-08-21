const express = require("express");
const schedule = require('node-schedule');
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const { SessionsClient } = require("dialogflow");
const path = require("path");


const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());


// =============================Initialize Dialogflow client start======================
const credentialsPath = path.join(
  __dirname,
  "/electrapollagent-uxap-dd518e96b30c.json"
);
const sessionClient = new SessionsClient({
  keyFilename: credentialsPath,
});
// Generate a unique session ID
const sessionID = `${Date.now()}-${Math.random()
  .toString(36)
  .substring(2, 15)}`;
console.log(sessionID);
// ===========================Initialize Dialogflow client end=======================




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

const electionCollection = client.db("electraPollDB").collection("elections");

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

    // ======================voter related apis===========================
    // get all voters by manager's email
    app.get("/voters/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await votersCollection.find(query).toArray();
      res.send(result);
    });
    // add voter api
    app.post("/add-voters", async (req, res) => {
      const voterInfo = req.body;
      const result = await votersCollection.insertOne(voterInfo);
      res.send(result);
    });

    // delete voter api
    app.delete("/voters/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await votersCollection.deleteOne(query);
      res.send(result);
    });

    // =============== add elections ============
    app.post("/add-election", async (req, res) => {
      const election = req.body;
      const result = await electionCollection.insertOne(election);
      res.send(result);
    });

    // -=============== update elections ===============
    app.patch("/election/:id", async (req, res) => {
      const id = req.params.id;
      const election = req.body;
      delete election._id;

      if (election.status === 'ongoing' && election.autoDate) {
        election.startDate = new Date()
        election.endDate = new Date(election.startDate.getTime() + election.autoDate * 60 * 1000);
      }

      if (election.startDate) {
        election.startDate = new Date(election.startDate);
      }

      if (election.endDate) {
        election.endDate = new Date(election.endDate);
      }

      console.log(election);

      const result = await electionCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: election }
      );
      res.send(result);
    });

    app.get('/election/:id', async (req, res) => {
      const id = req.params.id
      const result = await electionCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // =================get all election per company==============
    app.get("/elections/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });

    // ===============delete election==============
    app.patch('/remove-election/:id', async (req, res) => {
      const id = req.params.id
      const result = await electionCollection.deleteOne({ _id: new ObjectId(id) })
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


// =====================================chatbot apis start=======================

// Handle incoming messages
app.post("/send-message", async (req, res) => {
  const { message } = req.body;
  console.log(message)


  const sessionPath = sessionClient.sessionPath(
    "electrapollagent-uxap",
    sessionID
  );

  const request = {
    session: sessionPath,
    queryInput: {
      text: {
        text: message,
        languageCode: "en-US",
      },
    },
  };

  try {
    const responses = await sessionClient.detectIntent(request);
    const result = responses[0].queryResult;
    const botResponse = result.fulfillmentText;

    if (message == "Welcome Message") {

      res.json({
        response:
          "Welcome to our website! I am ElectraPoll Agent. How can I assist you?",
      });
      console.log({ message });
    } else {
      res.json({ response: botResponse });
    }
  } catch (error) {
    console.error("Error sending message to Dialogflow:", error);
    res.status(500).json({ error: "An error occurred." });
  }
});

// ================================chatbot apis end=================================



// =============================handle elelction status based on starttime endtime============================
setInterval(() => {
  checkStatus()
}, 20000);

async function checkStatus() {
  const currentTime = new Date();

  // Find elections that are 'published' and should now be 'ongoing'
  const toBeOngoing = await electionCollection.find({
    status: 'published',
    startDate: { $lte: currentTime }
  }).toArray();

  // Update these elections to 'ongoing'
  for (let election of toBeOngoing) {
    await electionCollection.updateOne(
      { _id: new ObjectId(election._id) },
      { $set: { status: 'ongoing' } }
    );
  }

  const hasAutoDate = await electionCollection.find()

  // Find elections that are 'ongoing' and should now be 'completed'
  const toBeCompleted = await electionCollection.find({
    status: 'ongoing',
    endDate: { $lte: currentTime } // use $lte, not $gte
  }).toArray();


  // Update these elections to 'completed'
  for (let election of toBeCompleted) {
    await electionCollection.updateOne(
      { _id: new ObjectId(election._id) },
      { $set: { status: 'completed' } }
    );
  }
}


app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});

