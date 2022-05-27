import express, { Express } from "express";
import bodyParser from "body-parser";
import { connect, connection, ConnectOptions } from "mongoose";
import cors from "cors";
import morgan from "morgan";
import api from "./api";
import URL from "./local.config";
import { Server } from "http";

const app: Express = express();

app.set("port", process.env.PORT || 8081);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.use(cors());

app.use(morgan("dev"));

app.use("/", api);

app.use(function (req, res) {
  const err: Error = new Error("Not Found");
  res.status(404);
  return res.json(err);
});

// MongoDB connection
connect(URL, { useNewUrlParser: true } as ConnectOptions);
const db = connection;
db.on("error", console.error.bind(console, "connection error"));
db.once("open", () => {
  console.log("Connected to MongoDB");
  app.listen(app.get("port"), () => {
    console.log(`API server listening on port ${app.get("port")}`);
  });
});
