const path = require("path");

//packages
const express = require("express");
const session = require("express-session");
const mongodbStore = require("connect-mongodb-session");

//obj
const db = require("./data/database");
const demoRoutes = require("./routes/demo");

//Class used for session store
const MongodbStore = mongodbStore(session);

//session store
const sessionStore = new MongodbStore({
  uri: "mongodb://127.0.0.1:27017",
  databaseName: "auth-demo",
  colletion: "sessions",
});

const app = express();

app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

app.use(express.static("public"));
app.use(express.urlencoded({ extended: false }));

//session middleware
app.use(
  session({
    secret: "himitsu~ tehee!",
    resave: false,
    saveUninitialized: false,
    store: sessionStore, //transfer session here
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // one day expiration
    },
  })
);

//custom middleware
app.use(async function (req, res, next) {
  //data from generated session headers
  const user = req.session.user;
  const isAuth = req.session.isAuthenticated;

  //falsey check
  //forward to next middleware
  if (!user || !isAuth) {
    return next();
  }

  const userDoc = await db
    .getDb("auth-demo")
    .collection("users")
    .findOne({ _id: user.id }); //query
  const isAdmin = userDoc.isAdmin; // retrieve admin flag

  //res.locals
  res.locals.isAuth = isAuth;
  res.locals.isAdmin = isAdmin;

  return next(); //below query
});

app.use(demoRoutes); // demo routes import

app.use(function (error, req, res, next) {
  res.render("500");
});

db.connectToDatabase().then(function () {
  app.listen(3000);
});
