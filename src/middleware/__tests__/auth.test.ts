import { authNewUser, login, checkUniqueness } from "../auth";
import * as validators from "../../utils/validators";
import * as userQueries from "../../models/user";
import { NextFunction, Request, Response } from "express";
import bcrypt from "bcrypt";

jest.mock("bcrypt");

jest.mock("../../utils/validators", () => ({
  validateNewUser: jest.fn(() => {
    return { error: false };
  }),
}));

jest.mock("../../models/user", () => ({
  getUser: jest.fn(),
}));

let myMock: jest.SpyInstance;
let mockRequest: Partial<Request> = {
  body: {
    username: jest.fn(),
    email: jest.fn(),
    password: jest.fn(),
  },
};
let mockResponse: Partial<Response> = {
  status: jest.fn().mockImplementation(() => {
    return mockResponse;
  }),
  send: jest.fn().mockImplementation(() => {
    return mockResponse;
  }),
  locals: {
    user: jest.fn(),
  },
};
let nextFunction: NextFunction = jest.fn();

afterEach(() => {
  jest.clearAllMocks();
  jest.restoreAllMocks();
});

describe("AUTH", () => {
  describe("AuthNewUser", () => {
    test("Expect Next to be called", async () => {
      authNewUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(nextFunction).toBeCalled();
    });
    test("Expect Res to be called", async () => {
      myMock = jest
        .spyOn(validators, "validateNewUser")
        .mockImplementation((): any => {
          return { error: { details: [{ message: 0 }] } };
        });

      authNewUser(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
  describe("CheckUniqeness", () => {
    test("Should call next", async () => {
      await checkUniqueness(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(userQueries.getUser).toHaveBeenCalledTimes(2);
      expect(nextFunction).toBeCalled();
    });
    test("Should call res, username taken", async () => {
      myMock = jest
        .spyOn(userQueries, "getUser")
        .mockImplementation((): any => {
          return 1;
        });
      await checkUniqueness(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(userQueries.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    test("Should call res, email taken", async () => {
      myMock = jest
        .spyOn(userQueries, "getUser")
        .mockImplementation((param: any): any => {
          if (param.email) {
            return 1;
          }
          return 0;
        });
      await checkUniqueness(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(userQueries.getUser).toHaveBeenCalledTimes(2);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
  describe("Login", () => {
    test("Should call next", async () => {
      jest.spyOn(userQueries, "getUser").mockImplementation((): any => {
        return 1;
      });
      jest.spyOn(bcrypt, "compare").mockImplementation(() => {
        return 1;
      });
      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(userQueries.getUser).toHaveBeenCalledTimes(1);
      expect(nextFunction).toBeCalled();
    });
    test("Bad password, should hit res.send...", async () => {
      jest.spyOn(userQueries, "getUser").mockImplementation((): any => {
        return 1;
      });
      jest.spyOn(bcrypt, "compare").mockImplementation(() => {
        return 0;
      });
      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(userQueries.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
    test("Bad password, should hit res.send...", async () => {
      jest.spyOn(userQueries, "getUser").mockImplementation((): any => {
        return 0;
      });
      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(userQueries.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(400);
    });
  });
});
