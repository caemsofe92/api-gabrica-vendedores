var express = require("express");
var router = express.Router();

router.get("/", function (req, res, next) {
  res.send("Gabrica Vendedores API");
});

module.exports = router;
