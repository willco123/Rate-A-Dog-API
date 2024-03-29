Live at: https://rateadog.onrender.com/

# React Api for Rate a Dog

Welcome to the API Documentation for the Rate a Dog! This documentation provides information on various routes used for Rate a Dog

## Features

    User-friendly interface for interacting with the API
    Authentication and authorization mechanisms
    Seemless scrolling mechanism for browsing various dogs
    Table for viewing data aggregations with filtering options

## Getting Started

```bash
git clone https://github.com/willco123/Rate-A-Dog-API
```

Install the dependencies using a package manager such as npm or Yarn:

```bash
npm install
```

## Environment Variables

To customize and configure your application, you can set the following environment variables:

    PORT: The port number on which your application will run (e.g., 3000).
    LOCAL_DB_NAME: Name for the local database
    ATLAS_USER: Your MongoDB Atlas username.
    ATLAS_PASSWORD: Your MongoDB Atlas password.
    ATLAS_CLUSTER: Your MongoDB Atlas cluster name.
    ATLAS_DB_NAME: Chosen mongoDB Atlas database name.
    JWT_SECRET: A secret key used for JSON Web Token (JWT) encryption and decryption.
    REFRESH_TOKEN_EXPIRATION_TIME: The expiration time for the refresh token, in ms.
    ACCESS_TOKEN_EXPIRATION_TIME: The expiration time for the access token, in ms.

Please ensure that you replace the placeholder values with your actual credentials and configuration preferences.

This project makes use of mongoDB, as such you will need an instance of mongoDB available on your local machine. The database will be hosted at mongodb://127.0.0.1/LOCAL_DB_NAME
The ATLAS credentials are only required if the project is set to production.

## Start the development server:

Compile with Typescript.

```bash
tsc
```

Start the server

```bash
npm start
```

## Initialisation

The project makes use of the dog-ceo API. The route POST /admin/storeallbreeds will scrape all the URLs from the dog-ceo API. This amount is relatively large (~200,000 image urls) and the route requires admin privileges to use.
Setting a user to admin status is required manually through the database.

## Routes

Some routes make use of middleware that typically request a valid JWT, the payload contains the userId which is then forwarded in the request body.

### Dogs

1. POST /

Allows a user to rate a URL.

Middleware: Requires an access token.

Request Body:

    url (string): The URL to be saved.
    rating (number): The rating for the URL.

Response:

    Status 200: Successful operation. Returns a success message.

2. POST /url

Retrieves aggregated data for a single URL.

Middleware: Requires an access token.

Request Body:

    url (string): The URL to retrieve data for.

Response:

    Status 200: Successful operation. Returns aggregated data for the URL.

3. POST /all

Retrieves randomly aggregated documents, default is 50.

Request Body:

    sampleSize (number): The number of documents to retrieve.
    authHeader (optional, string): The authorization header containing the access token.

Response:

    Status 200: Successful operation. Returns randomly aggregated documents.

4. POST /all/more

Retrieves more randomly aggregated documents with exclusions.

Request Body:

    sampleSize (number): The number of documents to retrieve.
    authHeader (optional, string): The authorization header containing the access token.
    currentlyLoadedDocuments (array): Array of documents already loaded.

Response:

    Status 200: Successful operation. Returns more randomly aggregated documents.

5. POST /all/sorted

Retrieves all documents sorted based on the provided parameters.

Request Body:

    sortOrder (string): The sort order ("asc" or "desc").
    sortMode (string): The sort mode ("breed", "averageRating", "numberOfRates").
    sampleSize (number): The number of documents to retrieve.
    skipCount (number): The number of documents to skip.
    filteredBreed (optional): The breed to filter by ({ breed: string; subBreed: string | null }).
    authHeader (optional, string): The authorization header containing the access token.

Response:

    Status 200: Successful operation. Returns sorted aggregated documents.

6. POST /user

Retrieves user-specific documents sorted based on the provided parameters.

Middleware: Requires an access token.

Request Body:

    sortOrder (string): The sort order ("asc" or "desc").
    sortMode (string): The sort mode ("breed", "averageRating", "numberOfRates").
    sampleSize (number): The number of documents to retrieve.
    skipCount (number): The number of documents to skip.
    filteredBreed (optional): The breed to filter by ({ breed: string; subBreed: string | null }).

Response:

    Status 200: Successful operation. Returns user-specific sorted aggregated documents.

7. GET /user/maxcount

Retrieves the maximum count of user-specific documents.

Middleware: Requires an access token.

Response:

    Status 200: Successful operation. Returns the maximum count of user-specific documents.

8. GET /maxcount

Retrieves the maximum count of all documents.

Response:

    Status 200: Successful operation. Returns the maximum count of all documents.

9. POST /filtered/maxcount

Retrieves the maximum count of documents filtered by breed.

Request Body:

    filteredBreed ({breed: string; subBreed: string | null}): The breed to filter by.

Response:

    Status 200: Successful operation. Returns the maximum count of filtered documents.

10. POST /user/filtered/maxcount

Retrieves the maximum count of user-specific documents filtered by breed.

Middleware: Requires an access token.

Request Body:

    filteredBreed ({breed: string; subBreed: string | null}): The breed to filter by.

Response:

    Status 200: Successful operation. Returns the maximum count of filtered user-specific documents.

11. GET /table

Retrieves aggregated data for table display.

Response:

    Status 200: Successful operation. Returns aggregated data for table display.

12. GET /user/table

Retrieves user-specific aggregated data for table display.

Middleware: Requires an access token.

Response:

    Status 200: Successful operation. Returns user-specific aggregated data for table display.

13. POST /admin/storeallbreeds

Stores all dog breeds in the database (admin-only).

Middleware: Requires an access token and admin privileges.

Response:

    Status 200: Successful operation. Returns a success message.

### Login

POST /login

This endpoint is used to authenticate a user and generate access and refresh tokens.

Request:

    Method: POST
    Path: /login
    Body parameters:
        username (string): The username of the user.
        password (string): The password of the user.

Response:

    Status: 200 OK
    Headers:
        Authorization (string): The access token.
    Cookies:
        refresh-token (string): The refresh token.
    Body:
        message (string): A success message indicating the user has logged in.

GET /logout

This endpoint is used to log out a user and invalidate the refresh token.

Request:

    Method: GET
    Path: /logout

Response:

    Status: 200 OK
    Headers:
        Authorization (removed)
    Cookies:
        refresh-token (cleared)
    Body:
        message (string): A success message indicating the user has logged out.

GET /refresh

This endpoint is used to refresh the access token when a user refreshes the page.

Request:

    Method: GET
    Path: /refresh
    Headers:
        Authorization (string): The access token.

Response:

    Status: 200 OK
    Body: true (boolean)

### User

POST /register

This endpoint is used to register a new user.

Request:

    Method: POST
    Path: /register
    Body parameters:
        username (string): The username of the new user.
        email (string): The email address of the new user.
        password (string): The password of the new user.

Response:

    Status: 200 OK
    Body: "New User added" (string)

POST /admin/deleteuser

This endpoint is used by an admin user to delete a user.

Request:

    Method: POST
    Path: /admin/deleteuser
    Headers:
        Authorization (string): The access token of the admin user.
    Body parameters:
        userId (string): The ID of the user to be deleted.

Response:

    Status: 200 OK
    Body: "User deleted" (string)

## License

This project is licensed under the MIT License.
