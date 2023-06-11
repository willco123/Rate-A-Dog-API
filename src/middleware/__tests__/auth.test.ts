import {
  authNewUser,
  login,
  checkUniqueness,
  checkAccessToken,
  checkRefreshToken,
  decodeToken,
  isAdmin,
} from "../auth";
import * as auth from "../auth";

import * as validators from "../../utils/validators";
import * as dbUser from "../../models/user";
import * as tokenConfig from "../../utils/token-config";
import { NextFunction, Request, Response } from "express";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { token } from "morgan";

jest.mock("bcrypt");

const currentDate = new Date();
const futureDate = new Date();
const expiredDate = new Date();

futureDate.setFullYear(currentDate.getFullYear() + 20);
expiredDate.setFullYear(currentDate.getFullYear() - 20);

jest.mock("jsonwebtoken");
let jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
  return {
    userPayload: "decodedToken",
    expiration: futureDate.getTime(),
  };
});

jest.mock("../../utils/token-config", () => ({
  generateAccessToken: jest.fn().mockImplementation(() => {
    return "accessToken";
  }),
  generateRefreshToken: jest.fn().mockImplementation(() => {
    return "refreshToken";
  }),
}));

jest.mock("../../utils/validators", () => ({
  validateNewUser: jest.fn(() => {
    return { error: false };
  }),
}));

jest.mock("../../models/user", () => ({
  getUser: jest.fn(),
  getToken: jest.fn().mockResolvedValue("refreshToken"),
  deleteToken: jest.fn(),
}));

let myMock: jest.SpyInstance;
let checkRefreshTokenSpy: jest.SpyInstance;
let getUserSpy: jest.SpyInstance;
let mockRequest: Partial<Request> = {
  body: {
    username: jest.fn(),
    email: jest.fn(),
    password: jest.fn(),
    userId: jest.fn(),
  },
};
let mockResponse: Partial<Response> = {
  clearCookie: jest.fn().mockImplementation(() => {
    return mockResponse;
  }),
  setHeader: jest.fn().mockImplementation(() => {
    return mockResponse;
  }),
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
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
  describe("CheckUniqeness", () => {
    test("Should call next", async () => {
      await checkUniqueness(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(dbUser.getUser).toHaveBeenCalledTimes(2);
      expect(nextFunction).toBeCalled();
    });
    test("Should call res, username taken", async () => {
      myMock = jest.spyOn(dbUser, "getUser").mockImplementation((): any => {
        return 1;
      });
      await checkUniqueness(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(dbUser.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    test("Should call res, email taken", async () => {
      myMock = jest
        .spyOn(dbUser, "getUser")
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
      expect(dbUser.getUser).toHaveBeenCalledTimes(2);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
  describe("Login", () => {
    test("Should call next", async () => {
      jest.spyOn(dbUser, "getUser").mockImplementation((): any => {
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
      expect(dbUser.getUser).toHaveBeenCalledTimes(1);
      expect(tokenConfig.generateAccessToken).toBeCalled();
      expect(tokenConfig.generateRefreshToken).toBeCalled();
      expect(nextFunction).toBeCalled();
    });
    test("Bad password, should hit res.send...", async () => {
      jest.spyOn(dbUser, "getUser").mockImplementation((): any => {
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
      expect(dbUser.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
    test("Bad password, should hit res.send...", async () => {
      jest.spyOn(dbUser, "getUser").mockImplementation((): any => {
        return 0;
      });
      await login(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(dbUser.getUser).toHaveBeenCalledTimes(1);
      expect(mockResponse.send).toBeCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(401);
    });
  });
  describe("checkAccessToken", () => {
    beforeEach(() => {
      checkRefreshTokenSpy = jest
        .spyOn(auth, "checkRefreshToken")
        .mockImplementation((): any => {
          return 0;
        });
    });
    afterEach(() => {
      checkRefreshTokenSpy.mockRestore();
      jwtVerifySpy.mockRestore();
    });
    it("Should call next", async () => {
      mockRequest.headers = { authorization: "accessToken" };
      await checkAccessToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(jwtVerifySpy).toBeCalled();
      expect(checkRefreshToken).not.toBeCalled();
      expect(nextFunction).toBeCalled();
    });
    it("Should call checkRefreshToken", async () => {
      mockRequest.headers = { authorization: undefined };
      await checkAccessToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(checkRefreshToken).toBeCalled();
      expect(nextFunction).not.toBeCalled();
    });
    it("Should call checkRefreshToken", async () => {
      mockRequest.headers = { authorization: "accessToken" };
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        return {
          userPayload: "decodedToken",
          expiration: expiredDate.getTime(),
        };
      });
      await checkAccessToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(checkRefreshToken).toBeCalled();
      expect(nextFunction).not.toBeCalled();
    });
    it("Should throw and call res", async () => {
      mockRequest.headers = { authorization: "accessToken" };
      checkRefreshTokenSpy = jest
        .spyOn(auth, "checkRefreshToken")
        .mockImplementation((): any => {
          throw new Error("invalid signature");
        });
      await checkAccessToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );

      expect(mockResponse.status).toHaveBeenCalledWith(400);
      expect(mockResponse.clearCookie).toHaveBeenCalledWith("refresh-token");
      expect(mockResponse.send).toHaveBeenCalledWith("Bad Token");
      expect(nextFunction).not.toBeCalled();
      checkRefreshTokenSpy.mockRestore();
    });
  });
  describe("checkRefreshToken", () => {
    beforeEach(() => {
      mockRequest.cookies = { ["refresh-token"]: "refreshToken" };
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        return {
          userPayload: "decodedToken",
          expiration: futureDate.getTime(),
        };
      });
    });

    it("should call next", async () => {
      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(nextFunction).toBeCalled();
    });
    it("should res.send unauthorized", async () => {
      mockRequest.cookies = { ["refresh-token"]: undefined };

      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toBeCalledWith(401);
      expect(mockResponse.send).toBeCalledWith("Unauthorized, please log in");
    });
    it("should res.send unauthorized, expired token", async () => {
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        return {
          userPayload: "decodedToken",
          expiration: expiredDate.getTime(),
        };
      });
      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.send).toBeCalledWith("Unauthorized, please log in");
      expect(mockResponse.status).toBeCalledWith(401);
      expect(dbUser.deleteToken).toBeCalled();
      jwtVerifySpy.mockClear();
    });
    it("should res.send No user found, please register", async () => {
      const getTokenSpy = jest
        .spyOn(dbUser, "getToken")
        .mockResolvedValue(null);

      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.send).toBeCalledWith(
        "No user found, please register",
      );
      expect(mockResponse.status).toBeCalledWith(401);
    });
    it("should res.send Unauthorized", async () => {
      const getTokenSpy = jest
        .spyOn(dbUser, "getToken")
        .mockResolvedValue(undefined);
      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.send).toBeCalledWith("Unauthorized");
      expect(mockResponse.status).toBeCalledWith(401);
    });
    it("should res.send Unauthorized", async () => {
      let getTokenSpy = jest
        .spyOn(dbUser, "getToken")
        .mockResolvedValue("random");
      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.send).toBeCalledWith("Unauthorized");
      expect(mockResponse.status).toBeCalledWith(401);
      getTokenSpy = jest
        .spyOn(dbUser, "getToken")
        .mockResolvedValue("refreshToken");
    });
    it("should res.send Unauthorized", async () => {
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation((): any => {
        throw new Error("invalid signature");
      });
      await checkRefreshToken(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.send).toBeCalledWith("Bad Token");
      expect(mockResponse.clearCookie).toBeCalledWith("refresh-token");
      expect(mockResponse.status).toBeCalledWith(400);
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        return {
          userPayload: "decodedToken",
          expiration: futureDate.getTime(),
        };
      });
    });
  });
  describe("decode token", () => {
    test("Should return decoded token", () => {
      const decodedToken = decodeToken("mytoken");
      expect(decodedToken).toEqual("decodedToken");
    });
    test("Should return undef", () => {
      jwtVerifySpy = jest.spyOn(jwt, "verify").mockImplementation(() => {
        return {
          userPayload: "decodedToken",
          expiration: expiredDate.getTime(),
        };
      });
      const decodedToken = decodeToken("mytoken");
      expect(decodedToken).toEqual(undefined);
    });
  });
  describe("isAdmin", () => {
    afterAll(() => {
      getUserSpy.mockRestore();
    });
    it("should call next", async () => {
      getUserSpy = jest
        .spyOn(dbUser, "getUser")
        .mockImplementation(() => Promise.resolve<any>({ rank: "admin" }));
      await isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(nextFunction).toBeCalled();
    });
    it("should call res with unauth", async () => {
      getUserSpy = jest.spyOn(dbUser, "getUser").mockResolvedValue(null);
      await isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toBeCalledWith(401);
      expect(mockResponse.send).toBeCalledWith("Unauthorized");
    });
    it("should call res with unauth", async () => {
      getUserSpy = jest
        .spyOn(dbUser, "getUser")
        .mockImplementation(() => Promise.resolve<any>({ rank: "user" }));
      await isAdmin(
        mockRequest as Request,
        mockResponse as Response,
        nextFunction,
      );
      expect(mockResponse.status).toBeCalledWith(401);
      expect(mockResponse.send).toBeCalledWith("Unauthorized");
    });
  });
});
