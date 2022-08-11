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
    const refresh = req.query.refresh || (req.body && req.body.refresh);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const userCompany =
      req.query.userCompany || (req.body && req.body.userCompany);
    const SalesLineDiscountProductGroupCode =
      req.query.SalesLineDiscountProductGroupCode ||
      (req.body && req.body.SalesLineDiscountProductGroupCode);
    const LineDiscountCode =
      req.query.LineDiscountCode || (req.body && req.body.LineDiscountCode);
    const ItemNumber =
      req.query.ItemNumber || (req.body && req.body.ItemNumber);
    const CustomerAccount =
      req.query.CustomerAccount || (req.body && req.body.CustomerAccount);
    const QuantityAmount =
      req.query.QuantityAmount || (req.body && req.body.QuantityAmount);

    if (!tenantUrl || tenantUrl.length === 0)
      throw new Error("tenantUrl is Mandatory");

    if (!clientId || clientId.length === 0)
      throw new Error("clientId is Mandatory");

    if (!clientSecret || clientSecret.length === 0)
      throw new Error("clientSecret is Mandatory");

    if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

    if (!entity || entity.length === 0) throw new Error("entity is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!userCompany || userCompany.length === 0)
      throw new Error("userCompany is Mandatory");

    if (
      !SalesLineDiscountProductGroupCode ||
      SalesLineDiscountProductGroupCode.length === 0
    )
      throw new Error("SalesLineDiscountProductGroupCode is Mandatory");

    if (!LineDiscountCode || LineDiscountCode.length === 0)
      throw new Error("LineDiscountCode is Mandatory");

    if (!ItemNumber || ItemNumber.length === 0)
      throw new Error("ItemNumber is Mandatory");

    if (!CustomerAccount || CustomerAccount.length === 0)
      throw new Error("CustomerAccount is Mandatory");

    if (!QuantityAmount || QuantityAmount.length === 0)
      throw new Error("QuantityAmount is Mandatory");

    if (!client.isOpen) client.connect();

    if (!refresh) {
      const mainReply = await client.get(entity + ItemNumber + CustomerAccount);

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

    const selectEntity2Fields =
      "&$select=relation,Currency,AccountCode,AccountRelation,ItemCode,ItemRelation,UnitId,PriceUnit,QuantityAmountFrom,QuantityAmountTo,Percent1,Amount";

    /*
      console.log(`${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&cross-company=true${selectEntity2Fields}&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and relation eq Microsoft.Dynamics.DataEntities.PriceType'LineDiscSales'
      and (
        ((AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'All' and AccountRelation eq '') or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'Table' and AccountRelation eq '${CustomerAccount}') or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'GroupId' and AccountRelation eq '${LineDiscountCode}')) and
        
        ((ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'All' and ItemRelation eq '') or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'Table' and ItemRelation eq '${ItemNumber}') or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'GroupId' and ItemRelation eq '${SalesLineDiscountProductGroupCode}'))
   
        and (QuantityAmountTo gt ${QuantityAmount} or QuantityAmountTo eq 0) and QuantityAmountFrom lt ${QuantityAmount}
        )`);
      */

    const Entity1 = axios.get(
      `${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&cross-company=true${selectEntity2Fields}&$filter=dataAreaId eq '${userCompany}' and relation eq Microsoft.Dynamics.DataEntities.PriceType'LineDiscSales'
      and (
        ((AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'All' and AccountRelation eq '') or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'Table' and AccountRelation eq '${CustomerAccount}') or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'GroupId' and AccountRelation eq '${LineDiscountCode}')) and
        
        ((ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'All' and ItemRelation eq '') or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'Table' and ItemRelation eq '${ItemNumber}') or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'GroupId' and ItemRelation eq '${SalesLineDiscountProductGroupCode}'))
   
        and (QuantityAmountTo gt ${QuantityAmount} or QuantityAmountTo eq 0) and QuantityAmountFrom lt ${QuantityAmount}
        )`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1])
      .then(
        axios.spread(async (...responses) => {
          const reply = responses[0].data.value;

          await client.set(
            entity + ItemNumber + CustomerAccount,
            JSON.stringify(reply),
            {
              EX: 604800,
            }
          );
          return res.json({
            result: true,
            message: "OK",
            response: reply,
          });
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
