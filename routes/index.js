var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  res.send("Gabrica Vendedores API Version 1.0");
});

module.exports = router;
