var createError = require("http-errors");
var express = require("express");
var cookieParser = require("cookie-parser");
const compression = require("compression");
const dotenv = require('dotenv');
dotenv.config();

var indexRouter = require("./routes/index");
var getHome = require("./routes/get-home");
var getHomeOffline = require("./routes/get-home-offline");
var getByEntity = require("./routes/get-by-entity");
var checkConnection = require("./routes/check-connection");
var getProductsCategories = require("./routes/get-products-categories");
var getPricesDiscountsCombosInventory = require("./routes/get-prices-discounts-combos-inventory");
var getProductsOffline = require("./routes/get-products-offline");
var getClients = require("./routes/get-clients");
var getLocationAddress = require("./routes/get-location-address");
var getSalesOrders = require("./routes/get-sales-orders");
var createSalesOrder = require("./routes/create-sales-order");
var createSalesOrderLine = require("./routes/create-sales-order-line");
var updateSalesOrderLine = require("./routes/update-sales-order-line");

var app = express();
app.use(compression());
app.use(cookieParser());
app.use(express.json({ limit: '100mb' }));
app.use(express.urlencoded({ limit: '100mb', extended: true }));

app.use("/", indexRouter);
app.use("/get-home", getHome);
app.use("/get-home-offline", getHomeOffline);
app.use("/get-by-entity", getByEntity);
app.use("/check-connection", checkConnection);
app.use("/get-products-categories", getProductsCategories);
app.use("/get-prices-discounts-combos-inventory", getPricesDiscountsCombosInventory);
app.use("/get-products-offline", getProductsOffline);
app.use("/get-clients", getClients);
app.use("/get-location-address", getLocationAddress);
app.use("/get-sales-orders", getSalesOrders);
app.use("/create-sales-order", createSalesOrder);
app.use("/create-sales-order-line", createSalesOrderLine);
app.use("/update-sales-order-line", updateSalesOrderLine);

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
