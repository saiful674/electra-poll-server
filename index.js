const express = require("express");
const cors = require("cors");
require("dotenv").config();
const xlsx = require("xlsx");
const bodyParser = require("body-parser");
const { SessionsClient } = require("dialogflow");
const path = require("path");


const port = process.env.PORT || 5000;
const app = express();

// midlewire
app.use(cors());
app.use(express.json());
app.use(bodyParser.json());

console.log(process.env.DB_USER);
console.log(process.env.DB_PASS);


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

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();

    const database = client.db("electraPollDB");
    const userCollection = database.collection("users");
    const blogCollection = database.collection("blogs");

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
    const electionCollection = client.db("electraPollDB").collection("elections");

    // ======================voter related apis===========================
    // get all voters by manager's email
    app.get("/voters/:email", async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const query = { email: email };
      const result = await votersCollection.findOne(query);
      res.send(result);
    });

    // add voter api
    app.post("/add-voters", async (req, res) => {
      const voterInfo = req.body;

      const votersList = await votersCollection.findOne({
        email: voterInfo.email,
      });
      const matchingEmail = votersList?.voters.find(
        (voter) => voter.voterEmail === voterInfo.voter.voterEmail
      );

      if (matchingEmail) {
        res.send({ exist: true });
      } else {
        const result = await votersCollection.updateOne(
          { email: voterInfo.email },
          { $push: { voters: voterInfo.voter } },
          { upsert: true }
        );
        res.send(result);
      }
    });

    // delete voter api
    app.patch("/voters/:id", async (req, res) => {
      const id = req.params.id;
      const email = req.body.voterEmail;

      const votersList = await votersCollection.findOne({
        _id: new ObjectId(id),
      });
      const filteredVoters = votersList.voters.filter(
        (voter) => voter.voterEmail !== email
      );
      console.log(filteredVoters);

      const result = await votersCollection.updateOne(
        { _id: new ObjectId(id) },
        { $set: { voters: filteredVoters } }
      );
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
          `,
            });

            console.log("Message sent: %s", mailInfo.messageId);
          } catch (error) {
            console.error("Error sending email:", error);
          }
        }
      }
      res.send(result);
    });

    app.get('/election/:id', async (req, res) => {
      const id = req.params.id
      const result = await electionCollection.findOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // =================get all election per company==============
    app.get("/all-elections/:email", async (req, res) => {
      const { email } = req.params;
      const query = { email: email };
      const result = await electionCollection.find(query).toArray();
      res.send(result);
    });

    app.get("/elections", async (req, res) => {
      const { email } = req.query;
      const { status } = req.query;
      // console.log(status);
      // console.log(email);

      // Query to fetch data for the specified email
      const emailQuery = { email };
      const emailData = await electionCollection.find(emailQuery).toArray();
      // Query to filter emailData based on status
      let filteredData = emailData;
      if (status) {
        filteredData = emailData.filter((item) => item.status === status);
      }

      res.send(filteredData);
    });



    app.put("/election-vote-update/:id", async (req, res) => {
      const id = req.params.id;
      const body = req.body;
      const filter = { _id: new ObjectId(id) };
      console.log(body.value);
      const updateDoc = {
        $set: {
          questions: body.value,
        },
      };
      const result = await electionCollection.updateOne(filter, updateDoc);
      res.send(result);
    });


    // ===============delete election==============
    app.patch('/remove-election/:id', async (req, res) => {
      const id = req.params.id
      const result = await electionCollection.deleteOne({ _id: new ObjectId(id) })
      res.send(result)
    })

    // ===============================website data to exelsheet api start===============
    // Sample election result data
    const electionResults = [
      { candidate: "Candidate A", votes: 150 },
      { candidate: "Candidate B", votes: 200 },
      { candidate: "Candidate C", votes: 255 },
      // ... more data
    ];

    app.get("/download-election-data", (req, res) => {
      // Create a new workbook
      const wb = xlsx.utils.book_new();

      // Add a worksheet with election result data
      const ws = xlsx.utils.json_to_sheet(electionResults);
      xlsx.utils.book_append_sheet(wb, ws, "Election Results");

      // Generate Excel file
      const excelFilePath = "election_results.xls";
      xlsx.writeFile(wb, excelFilePath);

      // Provide file for download
      res.download(excelFilePath, "election_results.xls", (err) => {
        if (err) {
          console.error(err);
          res.status(500).send("Error generating file.");
        }
        // Delete the generated file after download
        // fs.unlinkSync(excelFilePath);
      });
    });

    // ===============blogs==============
    app.get("/blogs", async (req, res) => {
      const result = await blogCollection.find({}).toArray();
      res.send(result);
    });

    app.get("/blog/:id", async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) };
      const result = await blogCollection.find(query).toArray();
      res.send(result);
    });

    // ===============================website data to exelsheet api end===============

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


function adjustForTimezone(baseDate, timezoneString) {
  const offset = parseInt(timezoneString.replace("UTC", ""), 10);
  baseDate.setHours(baseDate.getHours() + offset);
  return baseDate;
}

async function checkStatus() {

  // Find elections that are 'published' and should now be 'ongoing'
  const toBeOngoing = await electionCollection
    .find({
      status: "published",
    })
    .toArray();


  // Update these elections to 'ongoing'
  for (let election of toBeOngoing) {
    let currentTime = new Date(Date.now());
    if (new Date(election.startDate).getTime() <= currentTime.getTime()) {
      await electionCollection.updateOne(
        { _id: new ObjectId(election._id) },
        { $set: { status: "ongoing" } }
      );
    }
  }


  // Find elections that are 'ongoing' and should now be 'completed'
  const toBeCompleted = await electionCollection
    .find({
      status: "ongoing", // use $lte, not $gte
    })
    .toArray();

  // Update these elections to 'completed'
  for (let election of toBeCompleted) {
    let currentTime2 = new Date(Date.now());
    if (new Date(election.endDate).getTime() <= currentTime2.getTime()) {
      await electionCollection.updateOne(
        { _id: new ObjectId(election._id) },
        { $set: { status: "completed" } }
      );
    }
  }
}

app.get("/", (req, res) => {
  res.send("Welcome to ElectraPoll Server");
});

app.listen(port, () => {
  console.log(`ElectraPoll server is running on port: ${port}`);
});

