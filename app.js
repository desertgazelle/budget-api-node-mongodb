const express = require("express");
const bodyParser = require("body-parser");
const cors = require("cors");
const morgan = require("morgan");
const api = require("./api");
const mongoose = require("mongoose");
const { URL } = require("./local.config");

const app = express();

app.set("port", process.env.PORT || 8081);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use(morgan("dev"));

app.use("/", api);

app.use(function (req, res) {
  const err = new Error("Not Found");
  err.status = 404;
  return res.json(err);
});

// MongoDB connection
mongoose.connect(URL, { useNewUrlParser: true });
const db = mongoose.connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
  console.log("Connected to MongoDB");
  app.server = app.listen(app.get("port"), () => {
    console.log(`API server listening on port ${app.get("port")}`);
  });
});
