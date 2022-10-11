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

    const selectEntity1Fields =
      "&$select=relation,Currency,AccountCode,AccountRelation,ItemCode,ItemRelation,UnitId,PriceUnit,QuantityAmountFrom,QuantityAmountTo,Percent1,Amount";

    /*
      console.log(`${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&cross-company=true${selectEntity1Fields}&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and relation eq Microsoft.Dynamics.DataEntities.PriceType'LineDiscSales'
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
    //Entidad Anterior
    const Entity1 = axios.get(
      `${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&cross-company=true${selectEntity1Fields}&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and relation eq Microsoft.Dynamics.DataEntities.PriceType'LineDiscSales'
      and (
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'All' or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'Table' and AccountRelation eq '${CustomerAccount}') or 
        (AccountCode eq Microsoft.Dynamics.DataEntities.PriceDiscPartyCodeType'GroupId' and AccountRelation eq '${LineDiscountCode}')) and
        
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'All' or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'Table' and ItemRelation eq '${ItemNumber}') or 
        (ItemCode eq Microsoft.Dynamics.DataEntities.PriceDiscProductCodeType'GroupId' and ItemRelation eq '${SalesLineDiscountProductGroupCode}'))
   
        and (QuantityAmountTo gt ${QuantityAmount} or QuantityAmountTo eq 0) and QuantityAmountFrom le ${QuantityAmount}
        )`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const selectEntity2Fields =
    "&$select=DiscountPercentage,FromQty,ToQty,FromDate,ToDate,ItemType,CustomerType,AccountGroup,CodeGroup,Active,CampaignId";
    
    /*
    const Entity2 = axios.get(
      `${tenant}/data/CampaignsJournalDiscounts?$format=application/json;odata.metadata=none&cross-company=true${selectEntity2Fields}&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and Active eq Microsoft.Dynamics.DataEntities.NoYes'Yes'
      and (
        (
        (CustomerType eq Microsoft.Dynamics.DataEntities.GABItemTypes'Table' and AccountGroup eq '${CustomerAccount}') ) and
        
        (
        (ItemType eq Microsoft.Dynamics.DataEntities.GABItemTypes'Table' and CodeGroup eq '${ItemNumber}'))
   
        and (ToQty gt ${QuantityAmount} or ToQty eq 0) and FromQty le ${QuantityAmount}
        )`,
      { headers: { Authorization: "Bearer " + token } }
    );
    */
    
    //Nueva Entidad
    const Entity2 = axios.get(
      `${tenant}/data/CampaignsJournalDiscounts?$format=application/json;odata.metadata=none&cross-company=true${selectEntity2Fields}&$filter=dataAreaId eq '${userCompany}' and ToDate gt ${currentDate} and FromDate lt ${currentDate} and Active eq Microsoft.Dynamics.DataEntities.NoYes'Yes' and (
        (
        (CustomerType eq Microsoft.Dynamics.DataEntities.GABItemTypes'Table' and AccountGroup eq '${CustomerAccount}') ) and
        
        (
        (ItemType eq Microsoft.Dynamics.DataEntities.GABItemTypes'Table' and CodeGroup eq '${ItemNumber}') or 
        (ItemType eq Microsoft.Dynamics.DataEntities.GABItemTypes'Group' and CodeGroup eq '${SalesLineDiscountProductGroupCode}'))
   
        and (ToQty gt ${QuantityAmount} or ToQty eq 0) and FromQty le ${QuantityAmount}
        )`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2])
      .then(
        axios.spread(async (...responses) => {
          const reply = responses[0].data.value;
          const reply2 = responses[1].data.value;

          const maxPercent = isFinite(Math.max.apply(Math, reply.map(function(o) { return o.Percent1; }))) ? Math.max.apply(Math, reply.map(function(o) { return o.Percent1; })) : 0;
          const maxPercent2 = isFinite(Math.max.apply(Math, reply2.map(function(o) { return o.DiscountPercentage; }))) ? Math.max.apply(Math, reply2.map(function(o) { return o.DiscountPercentage; })) : 0;

          await client.set(
            entity + ItemNumber + CustomerAccount,
            JSON.stringify(maxPercent > maxPercent2 ? maxPercent : maxPercent2),
            {
              EX: 604800,
            }
          );
          return res.json({
            result: true,
            message: "OK",
            response: maxPercent > maxPercent2 ? maxPercent : maxPercent2,
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
