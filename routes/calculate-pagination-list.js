let express = require("express");
let router = express.Router();
const client = require("../bin/redis-client");
const axios = require("axios");

router.post("/", async (req, res) => {
  try {
    const totalElements =
      req.query.totalElements || (req.body && req.body.totalElements);
    const listSize = req.query.listSize || (req.body && req.body.listSize);

    if (!totalElements || totalElements.length === 0)
      throw new Error("totalElements is Mandatory");

    if (!listSize || listSize.length === 0)
      throw new Error("listSize is Mandatory");

      const response =[];
      for (let i = 1; i <= Math.ceil(totalElements/listSize); i++) {
        response.push(i)
      }
     

    return res.json({ result: true, message: "OK", response });
  } catch (error) {
    return res.status(500).json({ result: false, message: error.toString() });
  }
});

module.exports = router;
