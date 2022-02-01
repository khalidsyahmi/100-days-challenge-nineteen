const express = require("express");

const db = require("../data/database");
//hash
const bcrypt = require("bcryptjs");
const router = express.Router();

router.get("/", function (req, res) {
  res.render("welcome");
});

router.get("/signup", function (req, res) {
  //let = to share session across routes
  let sessionInputData = req.session.inputData; //extract input into a variable

  //if user enters correctly, that value is wiped
  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: "",
      confirmEmail: "",
      password: "",
    };
  }
  req.session.inputData = null;

  res.render("signup", { inputData: sessionInputData }); // retain form fill
});

router.get("/login", function (req, res) {
  let sessionInputData = req.session.inputData;

  if (!sessionInputData) {
    sessionInputData = {
      hasError: false,
      email: "",
      // confirmEmail: "",
      password: "",
    };
  }
  req.session.inputData = null;

  res.render("login", { inputData: sessionInputData });
});

//Creating new Account
router.post("/signup", async function (req, res) {
  const userData = req.body;
  //bodies
  const enteredEmail = userData.email;
  const enteredConfirmEmail = userData["confirm-email"];
  const enteredPassword = userData.password;

  //validation blank
  if (
    !enteredEmail ||
    !enteredConfirmEmail ||
    !enteredPassword ||
    enteredPassword.trim().length < 6 || // did not work??
    enteredEmail !== enteredConfirmEmail ||
    !enteredEmail.includes("@")
  ) {
    //keeping failed data if the user messes up
    //in if(){} because it failed
    req.session.inputData = {
      hasError: true,
      message: "Invalid account creation!-Please reenter the correct data",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      console.log("Incorrect or prohibited inputs");
      res.redirect("/signup");
    });
    return; //forcing only one response
  }

  //validation already created user
  const existingUser = await db
    .getDb("auth-demo")
    .collection("users")
    .findOne({ email: enteredEmail });
  //blocking already created user
  //truthy
  if (existingUser) {
    //console.log("Email already exists");
    req.session.inputData = {
      hasError: true,
      message: "User email already used!",
      email: enteredEmail,
      confirmEmail: enteredConfirmEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      res.redirect("/signup");
    });
    return;
  }

  //hashing
  const hashedPassword = await bcrypt.hash(enteredPassword, 12);

  //user Object
  const user = {
    email: enteredEmail,
    password: hashedPassword,
  };

  await db.getDb("auth-demo").collection("users").insertOne(user);
  res.redirect("/login");
});

// Logging in with created account
router.post("/login", async function (req, res) {
  const userData = req.body;
  //bodies
  const enteredEmail = userData.email;
  const enteredPassword = userData.password;

  const existingUser = await db
    .getDb("auth-demo")
    .collection("users")
    .findOne({ email: enteredEmail });

  //check mail
  if (!existingUser) {
    //console.log("could not login! email not exist");
    req.session.inputData = {
      hasError: true,
      message: "Credentials are incorrect! please enter again",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      res.redirect("/login");
    });
    return;
  }

  //password property in users collection
  const equalPassword = await bcrypt.compare(
    enteredPassword,
    existingUser.password
  );

  //check password
  if (!equalPassword) {
    //console.log("could not login! wrong password...");
    req.session.inputData = {
      hasError: true,
      message: "Invalid password!",
      email: enteredEmail,
      password: enteredPassword,
    };
    req.session.save(function () {
      res.redirect("/login");
    });
    return;
  }

  //Generate session
  req.session.user = {
    id: existingUser._id,
    email: existingUser.email,
  };
  req.session.isAuthenticated = true; // additional flag
  //save session before redirect()
  req.session.save(function () {
    console.log("user is authenticated");
    res.redirect("/admin");
  });
});

router.get("/admin", async function (req, res) {
  if (!req.session.isAuthenticated) {
    // !req.session.user
    return res.status(401).render("401");
  }

  const user = await db
    .getDb("auth-demo")
    .collection("users")
    .findOne({ _id: req.session.user.id });

  if (!user || !user.isAdmin) {
    return res.status(403).render("403");
  }

  res.render("admin");
});

router.get("/profile", function (req, res) {
  if (!req.session.isAuthenticated) {
    return res.status(401).render("401");
  }
  res.render("profile");
});

router.post("/logout", function (req, res) {
  req.session.user = null;
  req.session.isAuthenticated = false;
  res.redirect("/");
});

module.exports = router;
