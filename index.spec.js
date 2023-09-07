const request = require("supertest");
const app = require("./index");
const validObjectId = "64f17261a399b5250eab2629";

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
  });
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

  afterAll((done) => {
    server.close(() => {
      console.log("Server closed");
      done();
    });
  });
});
