var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
const compression = require("compression");
const dotenv = require('dotenv');
dotenv.config();

var indexRouter = require("./routes/index");
var getHome = require("./routes/get-home");
var getByEntity = require("./routes/get-by-entity");
var checkConnection = require("./routes/check-connection");
var getProducts = require("./routes/get-products");
var getClients = require("./routes/get-clients");

var app = express();
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use("/", indexRouter);
app.use("/get-home", getHome);
app.use("/get-by-entity", getByEntity);
app.use("/check-connection", checkConnection);
app.use("/get-products", getProducts);
app.use("/get-clients", getClients);

app.use(function (req, res, next) {
  next(createError(404));
});

app.use(function (err, req, res, next) {
  res.locals.message = err.message;
  res.locals.error = req.app.get("env") === "development" ? err : {};

  res.status(err.status || 500);
  res.json(err);
});

module.exports = app;
