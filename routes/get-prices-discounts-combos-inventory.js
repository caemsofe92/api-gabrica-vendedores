let express = require("express");
let router = express.Router();
const client = require("../bin/redis-client");
const axios = require("axios");
const moment = require("moment");
require("moment/locale/es");

router.post("/", async (req, res) => {
  try {
    const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
    const clientId = req.query.clientId || (req.body && req.body.clientId);
    const clientSecret =
      req.query.clientSecret || (req.body && req.body.clientSecret);
    const tenant = req.query.tenant || (req.body && req.body.tenant);
    const entity = req.query.entity || (req.body && req.body.entity);
    const numberOfElements =
      req.query.numberOfElements || (req.body && req.body.numberOfElements);
    const isTest = req.query.isTest || (req.body && req.body.isTest);
    const refresh = req.query.refresh || (req.body && req.body.refresh);
    const userCompany =
      req.query.userCompany || (req.body && req.body.userCompany);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const siteId = req.query.siteId || (req.body && req.body.siteId);
    const locationId =
      req.query.locationId || (req.body && req.body.locationId);
    const groupId = req.query.groupId || (req.body && req.body.groupId);

    if (!tenantUrl || tenantUrl.length === 0)
      throw new Error("tenantUrl is Mandatory");

    if (!clientId || clientId.length === 0)
      throw new Error("clientId is Mandatory");

    if (!clientSecret || clientSecret.length === 0)
      throw new Error("clientSecret is Mandatory");

    if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

    if (!entity || entity.length === 0) throw new Error("entity is Mandatory");

    if (!userCompany || userCompany.length === 0)
      throw new Error("userCompany is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!client.isOpen) client.connect();

    if (!refresh) {
      const mainReply = await client.get(
        entity + userCompany + siteId + locationId + groupId
      );
      if (mainReply)
        return res.json({
          result: true,
          message: "OK",
          response: JSON.parse(mainReply),
        });
    }

    let token = await client.get(environment);

    if (!token) {
      const tokenResponse = await axios
        .post(
          `https://login.microsoftonline.com/${tenantUrl}/oauth2/token`,
          `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${tenant}/`,
          { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
        )
        .catch(function (error) {
          if (
            error.response &&
            error.response.data &&
            error.response.data.error &&
            error.response.data.error.innererror &&
            error.response.data.error.innererror.message
          ) {
            throw new Error(error.response.data.error.innererror.message);
          } else if (error.request) {
            throw new Error(error.request);
          } else {
            throw new Error("Error", error.message);
          }
        });
      token = tokenResponse.data.access_token;
      await client.set(environment, tokenResponse.data.access_token, {
        EX: 3599,
      });
    }

    const currentDate = moment().format();

    const Entity1 = axios.get(
      `${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&$select=relation,Currency,AccountCode,AccountRelation,ItemCode,ItemRelation,UnitId,PriceUnit,QuantityAmountFrom,QuantityAmountTo,Percent1,Amount${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate}`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity2 = axios.get(
      `${tenant}/data/ComboTables?$format=application/json;odata.metadata=none&$select=ComboId,Description,FromQty,ToQty,FromDate,ToDate,PercentDesc,GroupId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'${
        groupId ? ` and GroupId eq '${groupId}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity3 = axios.get(
      `${tenant}/data/InventsumsBI?$format=application/json;odata.metadata=none&$select=OnOrder,InventStatusId,AvailOrdered,Ordered,ItemId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'${
        siteId && locationId
          ? ` and InventSiteId eq '${siteId}' and InventLocationId eq '${locationId}' and ClosedQty eq Microsoft.Dynamics.DataEntities.NoYes'No'`
          : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2, Entity3])
      .then(
        axios.spread(async (...responses) => {
          //1. 263754 14.03s 4.17 MB
          //2. 207504 10.59s 3.33 MB
          //3. 194379 10.31s 3.07 MB
          //4. 158249 8.00s 2.37 MB
          //5. 137879 6.99s 1.98 MB

          const reply = {
            PricedisctablesBI: responses[0].data.value, //62248 10.92s 1.12 MB - 2
            ComboTables: responses[1].data.value, //22608 6.78s 442.54 KB - 3
            ComboLines: [
              {
                ItemId: "",
                ItemName: "",
                Qty: 1,
                Required: false,
                ComboId: "",
              },
            ],
            InventsumsBI: responses[2].data.value, //100008 12.89s 1.49 MB - 1
          };

          await client.set(
            entity + userCompany + siteId + locationId + groupId,
            JSON.stringify(reply),
            {
              EX: 86400,
            }
          );
          return res.json({ result: true, message: "OK", response: reply });
        })
      )
      .catch(function (error) {
        if (
          error.response &&
          error.response.data &&
          error.response.data.error &&
          error.response.data.error.innererror &&
          error.response.data.error.innererror.message
        ) {
          throw new Error(error.response.data.error.innererror.message);
        } else if (error.request) {
          throw new Error(error.request);
        } else {
          throw new Error("Error", error.message);
        }
      });
  } catch (error) {
    return res.status(500).json({ result: false, message: error.toString() });
  }
});

module.exports = router;
