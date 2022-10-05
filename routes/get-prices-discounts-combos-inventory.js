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

    const currentDate = moment()
      .subtract(5, "hours")
      .format("YYYY-MM-DDTHH:mm:ss-05:00");

    //Entidad Anterior
    const Entity1 = axios.get(
      `${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&$select=relation,Currency,AccountCode,AccountRelation,ItemCode,ItemRelation,UnitId,PriceUnit,QuantityAmountFrom,QuantityAmountTo,Percent1,Amount${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and relation eq Microsoft.Dynamics.DataEntities.PriceType'PriceSales'`,
      { headers: { Authorization: "Bearer " + token } }
    );
    //Entidad Anterior
    const Entity2 = axios.get(
      `${tenant}/data/ComboTables?$format=application/json;odata.metadata=none&$select=ComboId,Description,FromQty,ToQty,FromDate,ToDate,PercentDesc,CampaignId,NumberVariable${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and GABCampaign eq Microsoft.Dynamics.DataEntities.NoYes'Yes'`,
      { headers: { Authorization: "Bearer " + token } }
    );
    //Entidad Anterior - No se Solicito
    const Entity4 = axios.get(
      `${tenant}/data/GABCAMP_Header_Campaign?$format=application/json;odata.metadata=none&$select=CampaignId,GiftDescription,CampaignName${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'${
        groupId ? ` and GroupId eq '*${groupId}*'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    //Entidad Anterior
    const Entity3 = axios.get(
      `${tenant}/data/InventsumsBI?$format=application/json;odata.metadata=none&$select=AvailPhysical,ItemId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'${
        siteId && locationId
          ? ` and InventSiteId eq '${siteId}' and InventLocationId eq '${locationId}' and ClosedQty eq Microsoft.Dynamics.DataEntities.NoYes'No' and InventStatusId eq 'DISPONIBLE'`
          : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2, Entity3, Entity4])
      .then(
        axios.spread(async (...responses) => {
          const GABCAMP_Header_Campaign = responses[3].data.value.map(
            (item) => item.CampaignId
          );

          const ComboTables = responses[1].data.value.filter((item) =>
            GABCAMP_Header_Campaign.includes(item.CampaignId)
          );

          const _InventsumsB = responses[2].data.value;

          let InventsumsBI = [];

          for (let i = 0; i < _InventsumsB.length; i++) {
            const item1 = _InventsumsB[i];
            let inArray = false;

            for (let j = 0; j < InventsumsBI.length; j++) {
              if (item1.ItemId === InventsumsBI[j].ItemId) {
                InventsumsBI[j].AvailPhysical += item1.AvailPhysical;
                inArray = true;
              }
            }

            if (!inArray) {
              InventsumsBI.push(item1);
            }
          }

          const reply = {
            PricedisctablesBI: responses[0].data.value,
            ComboTables,
            InventsumsBI,
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
