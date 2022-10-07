import express from "express";

export function setUpMockApp() {
  const app = express();
  app.use(express.json());
  return app;
}

export function createMockUsers() {
  let mockUsers = [
    {
      username: "mockUser1",
      password: "mockPass1",
      email: "mockEmail1@gmail.com",
    },

    {
      username: "mockUser2",
      password: "mockPass2",
      email: "mockEmail2@gmail.com",
    },

    {
      username: "mockUser3",
      password: "mockPass3",
      email: "mockEmail3@gmail.com",
    },
  ];
  return mockUsers;
}

export function createMockDogs() {
  let mockDogs = [
    {
      url: "url1",
      breed: "breed1",
      rating: 5,
      numberOfRates: 1,
    },

    {
      url: "url2",
      breed: "breed2",
      rating: 7.5,
      numberOfRates: 2,
    },

    {
      url: "url3",
      breed: "breed3",
      rating: 2.5,
      numberOfRates: 2,
    },
  ];
  return mockDogs;
}

export function mockGetRouteWithMiddleware(
  app: express.Express,
  middleware: any,
) {
  app.get("/", middleware, (req, res) => {
    res.send("Test");
  });
}
