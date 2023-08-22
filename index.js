const express = require("express");
const schedule = require("node-schedule");
const cors = require("cors");
require("dotenv").config();
const bodyParser = require("body-parser");
const nodemailer = require("nodemailer");
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
    app.get("/users/:email", async (req, res) => {
      const email = req.params.email;

      const query = { email: email };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // update user>>
    app.patch("/users/:email", async (req, res) => {
      try {
        const email = req.params.email;
        const updatedData = req.body;
        const result = await userCollection.updateOne(
          { email: email },
          { $set: updatedData }
        );

        if (result.modifiedCount > 0) {
          res.status(200).json({ message: "User data updated successfully" });
        } else {
          res.status(404).json({ message: "User not found" });
        }
      } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Internal server error" });
      }
    });

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

    // send email related code

    const transporter = nodemailer.createTransport({
      host: "smtp-relay.brevo.com",
      port: 587,
      secure: false,
      auth: {
        user: process.env.email,
        pass: process.env.email_pass,
      },
    });

    // ======================voter related apis===========================
    // get all voters by manager's email
    app.get("/voters/:email", async (req, res) => {
      const email = req.params.email;

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
      if (result && election.status === "published") {
        const getElection = await electionCollection.findOne({
          _id: new ObjectId(id),
        });

        const emails = [];

        getElection.voterEmails?.map((e) => emails.push(e.email));

        for (const voter of getElection.voterEmails) {
          try {
            const mailInfo = await transporter.sendMail({
              from: "codecrafters80@gmail.com",
              to: voter.email,
              subject: `Vote Now: ${getElection?.title}`,
              html: `
              <!DOCTYPE html>
              <html lang="en">
              <head>
                  <meta charset="UTF-8">
                  <meta name="viewport" content="width=device-width, initial-scale=1.0">
                  <title>Email Template</title>
                  <style>
                      body {
                          font-family: Arial, sans-serif;
                          margin: 0;
                          padding: 0;
                          border-radius: 15px;
                      }
          
                      @media only screen and (max-width: 576px) {
                          body {
                              width: 100% !important;
                          }
                      }
          
                      @media only screen and (max-width: 376px) {
                          body {
                              width: 100% !important;
                          }
                      }
                  </style>
              </head>
              <body style="margin: 0 auto;">
                  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
                      <tr>
                          <td align="center" style="padding: 20px 0;">
                              <img src="https://i.ibb.co/J2k86ts/logo.png" alt="Company Logo" width="150">
                          </td>
                      </tr>
                      <tr>
                          <td bgcolor="#f0fdf4" style="padding: 40px 20px; color: black;line-height:20px">
                              <h3>You are cordially invited to cast your vote in the upcoming ${getElection?.title} election - ${getElection?.organization}.</h3>
                              <p>Hello,</p>
                              <p style="color: black">We are employing a sophisticated online voting system to ensure accuracy and transparency. You have been allocated a unique voting key, granting you one-time access to this process. Please treat this key with confidentiality and avoid sharing or forwarding this communication.</p>
                              <p>Should you have any queries or wish to share feedback regarding the election, or if you prefer not to receive subsequent voting notifications, please contact ${getElection?.email}</p>

                              <p style="padding-bottom: 10px">you will need to enter the access key and password to vote. Don't share it with anybody</p>
                              <p>Access Key: ${voter.accessKey}</p>
                              <p>Password: ${voter.password}</p>
                              <hr />
          
                              <p>Thank you for your participation.</p>
                          </td>
                      </tr>
                      <tr>
                          <td bgcolor="#f4f4f4" style="text-align: center; padding: 10px 0;">
                              <p>&copy; 2023 Electro Poll. All rights reserved.</p>
                          </td>
                      </tr>
                  </table>
              </body>
              </html>
          `
            });

            console.log("Message sent: %s", mailInfo.messageId);
          } catch (error) {
            console.error("Error sending email:", error);
          }
        }
      }
      res.send(result);
    });

    app.get("/election/:id", async (req, res) => {
      const id = req.params.id;
      const result = await electionCollection.findOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

    // =================get all election per company==============
    app.get("/elections/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });

    // ===============delete election==============
    app.patch("/remove-election/:id", async (req, res) => {
      const id = req.params.id;
      const result = await electionCollection.deleteOne({
        _id: new ObjectId(id),
      });
      res.send(result);
    });

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
      // console.log({ message });
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
  checkStatus();
}, 20000);

async function checkStatus() {
  const currentTime = new Date();

  // Find elections that are 'published' and should now be 'ongoing'
  const toBeOngoing = await electionCollection
    .find({
      status: "published",
      startDate: { $lte: currentTime },
    })
    .toArray();

  // Update these elections to 'ongoing'
  for (let election of toBeOngoing) {
    await electionCollection.updateOne(
      { _id: new ObjectId(election._id) },
      { $set: { status: "ongoing" } }
    );
  }

  const hasAutoDate = await electionCollection.find()

  // Find elections that are 'ongoing' and should now be 'completed'
  const toBeCompleted = await electionCollection
    .find({
      status: "ongoing",
      endDate: { $lte: currentTime }, // use $lte, not $gte
    })
    .toArray();

  // Update these elections to 'completed'
  for (let election of toBeCompleted) {
    await electionCollection.updateOne(
      { _id: new ObjectId(election._id) },
      { $set: { status: "completed" } }
    );
  }
}

app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});
