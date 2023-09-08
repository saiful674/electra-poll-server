const request = require("supertest");
const app = require("./index");
const validObjectId = "64f17261a399b5250eab2629";
const xlsx = require("xlsx");
const fs = require("fs");
const { SessionsClient } = require("dialogflow");
const path = require("path");

describe("test", () => {
  let server;
  let createdBlogId;
  beforeAll((done) => {
    server = app.listen(3001, () => {
      console.log("Server started on port 5001");
      done();
    });
  });
  it("should work", () => {
    expect(1).toBe(1);
  });
  it('should return "Welcome to ElectraPoll Server"', async () => {
    const response = await request(app).get("/");

    expect(response.status).toBe(200);
    expect(response.text).toBe("Welcome to ElectraPoll Server");
  }, 6000);
  it("should respond with a list of users", async () => {
    const response = await request(app).get("/all-users");
    expect(response.status).toBe(200);
  });
  it("should respond with a user", async () => {
    const email = "farukul282@gmail.com";
    const response = await request(app).get(`/users/${email}`);
    expect(response.status).toBe(200);
  });
  it("should create a new user", async () => {
    const newUser = {};
    const response = await request(app).post("/users").send(newUser);
    expect(response.status).toBe(200);
  });
  it("should respond with a list of blogs", async () => {
    const response = await request(app).get("/blogs");

    expect(response.status).toBe(200);

    expect(response.body).toBeInstanceOf(Array);
  });
  it("should respond with a single blog by ID", async () => {
    const response = await request(app).get(`/blog/${validObjectId}`);

    expect(response.status).toBe(200);
  });
  it("POST /blog should create a new blog", async () => {
    const newBlog = {};

    const response = await request(app).post("/blog").send(newBlog);

    expect(response.status).toBe(200);

    createdBlogId = response.body._id;
  });
  it("GET /recentBlog should retrieve recent blogs", async () => {
    const response = await request(app).get("/recentBlog");

    expect(response.status).toBe(200);
  });
  it("POST /comment/:id should post a comment on a blog", async () => {
    const newComment = {};

    const response = await request(app)
      .post(`/comment/64f17261a399b5250eab2629`)
      .send(newComment);

    expect(response.status).toBe(200);
  });

  it("should update a user to admin role when a valid id is provided", async () => {
    // Assuming you have a test user document with a known _id in your test database
    const testUserId = "64f02e593a33932a914da93f"; // Replace with a valid _id
    const updatedRole = "admin";

    const response = await request(app)
      .patch(`/users/admin/${testUserId}`)
      .send({ role: updatedRole });
    expect(response.status).toBe(200);

    expect(response.body.modifiedCount).toBe(1);
  });
  it("should update a user to user role when a valid id is provided", async () => {
    const testUserId = "64f02e593a33932a914da93f";
    const updatedRole = "user";

    const response = await request(app)
      .patch(`/users/user/${testUserId}`)
      .send({ role: updatedRole });

    expect(response.status).toBe(200);

    expect(response.body.modifiedCount).toBe(1);
  });

  // it("should update user data when a valid email is provided", async () => {
  //   const emailToUpdate = "marufahmed@gmail.com";
  //   const updatedData = { name: "Maruf Ahmed" };

  //   const response = await request(app)
  //     .patch(`/users/${emailToUpdate}`)
  //     .send(updatedData);

  //   expect(response.status).toBe(200);
  //   expect(response.body.message).toBe("User data updated successfully");
  // });

  it("should return a 404 error when an invalid email is provided", async () => {
    const invalidEmail = "nonexistent@email.com";
    const updatedData = { name: "Updated Name" };

    const response = await request(app)
      .patch(`/users/${invalidEmail}`)
      .send(updatedData);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe("User not found");
  });

  it("should return a voter when a valid email is provided", async () => {
    const validEmail = "nitai@gmail.com";

    const response = await request(app).get(`/voters/${validEmail}`);

    expect(response.status).toBe(200);
  });
  // it("should return 404 when an invalid email is provided", async () => {
  //   const invalidEmail = "nonexistent@gmail.com";

  //   const response = await request(app).get(`/voters/${invalidEmail}`);
  //   console.log(response.status);
  //   console.log(response.body);
  //   expect(response.status).toBe(404);
  // });
  it("should add a voter to an existing user", async () => {
    const user = {
      email: "hrido@gmail.com", // Replace with an existing user's email
    };

    const voter = {
      voterEmail: "newvoter@example.com",
    };

    // Send a POST request to add the voter
    const response = await request(app)
      .post("/add-voters")
      .send({ email: user.email, voter: voter });

    // Assert the response status code (should be 200 if successful)
    expect(response.status).toBe(200);
  });

  it("should not add a duplicate voter", async () => {
    // Define a duplicate voter that already exists
    const duplicateVoterInfo = {
      email: "hrido@gmail.com", // Provide the manager's email
      voter: {
        voterEmail: "newvoter@example.com", // Provide an existing voter's email
        // Add other voter data here
      },
    };

    const response = await request(app)
      .post("/add-voters")
      .send(duplicateVoterInfo);

    expect(response.status).toBe(200);

    expect(response.body).toHaveProperty("exist", true);
  });
  it("should remove a voter from the list", async () => {
    const votersListId = "64e6d8befb8fc33eb0c599d7";
    const voterEmailToRemove = "kamal@1.com";

    const response = await request(app)
      .patch(`/voters/${votersListId}`)
      .send({ voterEmail: voterEmailToRemove });

    // Assert that the API responds with a 200 OK status code
    expect(response.status).toBe(200);
  });

  it("should handle the case when the voter email does not exist in the list", async () => {
    const votersListId = "64e6d8befb8fc33eb0c599d7";
    const nonExistentEmail = "kamal@1.com";

    const response = await request(app)
      .patch(`/voters/${votersListId}`)
      .send({ voterEmail: nonExistentEmail });

    expect(response.status).toBe(200);
  });
  // it("should delete a voters list", async () => {
  //   const votersListIdToDelete = "64f96aaa4f06a995e11f9293"; //

  //   const response = await request(app).delete(
  //     `/voters/${votersListIdToDelete}`
  //   );
  //   expect(response.status).toBe(200);
  // });

  it("should handle the case when the voters list ID does not exist", async () => {
    const nonExistentVotersListId = "64f96aaa4f06a995e11f9293";
    const response = await request(app).delete(
      `/voters/${nonExistentVotersListId}`
    );

    expect(response.status).toBe(200);
  });

  it("should add a new election", async () => {
    const newElection = {
      title: "Sample Election",
      organization: "Sample Organization",
      startDate: "2023-09-10T00:00:00Z",
      endDate: "2023-09-20T00:00:00Z",
    };
    const response = await request(app).post("/add-election").send(newElection);

    expect(response.status).toBe(200);
  });

  it("should update an election and send emails to voters when status is 'published'", async () => {
    const electionId = "64f1a6816c96c3e1082d5959";
    const updatedElection = {
      title: "Updated Election",
      organization: "Updated Organization",
      status: "published",
    };

    const response = await request(app)
      .patch(`/election/${electionId}`)
      .send(updatedElection);

    expect(response.status).toBe(200);
  }, 10000);
  it("should remove an election by ID", async () => {
    const electionIdToRemove = "64f7c6fed83ba1393aa80ee3";
    const response = await request(app).patch(
      `/remove-election/${electionIdToRemove}`
    );

    expect(response.status).toBe(200);
  });
  it("should download election data as an Excel file", async () => {
    const electionId = "64f7beb05730dbd0801d7d7a";
    const response = await request(app).get(
      `/download-election-data/${electionId}`
    );

    expect(response.status).toBe(200);
    expect(response.headers["content-disposition"]).toContain(
      "attachment; filename=question_options_output.xlsx"
    );
    expect(response.headers["content-type"]).toBe(
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );

    const outputFile = path.join(__dirname, "downloaded-election-data.xlsx");
  }, 20000);
  it("should retrieve notifications for a specific email", async () => {
    const validEmail = "hridoy01724281810@gmail.com";
    const response = await request(app).get(`/notifications/${validEmail}`);

    expect(response.status).toBe(200);
  });
  it("should mark a notification as read", async () => {
    const validNotificationId = "64f96fe1c28ae259453aceb4"; //
    const response = await request(app)
      .patch(`/notifications/${validNotificationId}`)
      .send({ isRead: true });

    expect(response.status).toBe(200);
  }, 6000);

  it("should delete a notification", async () => {
    const validNotificationId = "64f9c92a03c0fb7d8aa31e0a";
    const response = await request(app).delete(
      `/notifications/${validNotificationId}`
    );

    expect(response.status).toBe(200);
  });

  afterAll((done) => {
    server.close(() => {
      console.log("Server closed");
      done();
    });
  });
});
