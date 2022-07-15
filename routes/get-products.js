let express = require("express");
let router = express.Router();
const client = require("../bin/redis-client");
const axios = require("axios");

router.post("/", async (req, res) => {
  try {
    const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
    const clientId = req.query.clientId || (req.body && req.body.clientId);
    const clientSecret =
      req.query.clientSecret || (req.body && req.body.clientSecret);
    const tenant = req.query.tenant || (req.body && req.body.tenant);
    const entity = req.query.entity || (req.body && req.body.entity);
    const offset = req.query.offset || (req.body && req.body.offset);
    const numberOfElements =
      req.query.numberOfElements || (req.body && req.body.numberOfElements);
    const isTest = req.query.isTest || (req.body && req.body.isTest);
    const refresh = req.query.refresh || (req.body && req.body.refresh);
    const company =
      req.query.company || (req.body && req.body.company);
    const environment =
      req.query.environment || (req.body && req.body.environment);

    if (!tenantUrl || tenantUrl.length === 0)
      throw new Error("tenantUrl is Mandatory");

    if (!clientId || clientId.length === 0)
      throw new Error("clientId is Mandatory");

    if (!clientSecret || clientSecret.length === 0)
      throw new Error("clientSecret is Mandatory");

    if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

    if (!entity || entity.length === 0) throw new Error("entity is Mandatory");

    if (!company || company.length === 0)
      throw new Error("company is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!client.isOpen) client.connect();

    if (!refresh) {
      const mainReply = await client.get(entity + company);
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

    const Entity1 = axios.get(
      `${tenant}/data/RetailEcoResProductTranslation?$format=application/json;odata.metadata=none&$select=EcoResProduct_DisplayProductNumber,Product,Name${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const Entity2 = axios.get(
      `${tenant}/data/ReleasedProductsV2?$format=application/json;odata.metadata=none&$select=ItemNumber,SalesLineDiscountProductGroupCode,SalesSalesTaxItemGroupCode,InventoryUnitSymbol${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        company ? `&$filter=dataAreaId eq '${company}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity3 = axios.get(
      `${tenant}/data/InventitemsalessetupsBI?$format=application/json;odata.metadata=none&$select=ItemId,Stopped${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        company ? `&$filter=dataAreaId eq '${company}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity4 = axios.get(
      `${tenant}/data/RetailEcoResCategoryHierarchy?$format=application/json;odata.metadata=none&$select=Name,AxRecId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity5 = axios.get(
      `${tenant}/data/EcoresproductcategoriesBI?$format=application/json;odata.metadata=none&$select=Product,Category${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity6 = axios.get(
      `${tenant}/data/ProductCategories?$format=application/json;odata.metadata=none&$select=CategoryRecordId,ProductCategoryHierarchyName,CategoryName${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity7 = axios.get(
      `${tenant}/data/RetailEcoResCategory?$format=application/json;odata.metadata=none&$select=Name,CategoryHierarchy,EcoResCategory1_Name,Level${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity8 = axios.get(
      `${tenant}/data/PricedisctablesBI?$format=application/json;odata.metadata=none&$select=relation,Currency,AccountCode,AccountRelation,ItemCode,ItemRelation,UnitId,PriceUnit,FromDate,ToDate,QuantityAmountFrom,QuantityAmountTo,Percent1,Amount${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        company ? `&$filter=dataAreaId eq '${company}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity9 = axios.get(
      `${tenant}/data/UnitOfMeasureTranslations?$format=application/json;odata.metadata=none&$select=UnitSymbol,TranslatedDescription${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity10 = axios.get(
      `${tenant}/data/ComboTables?$format=application/json;odata.metadata=none&$select=ComboId,Description,FromQty,ToQty,FromDate,ToDate,PercentDesc,GroupId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        company ? `&$filter=dataAreaId eq '${company}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    ); 
    const Entity11 = axios.get(
      `${tenant}/data/InventsumsBI?$format=application/json;odata.metadata=none&$select=OnOrder,InventStatusId,ClosedQty,InventSiteId,InventLocationId,AvailOrdered,Ordered,ItemId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        company ? `&$filter=dataAreaId eq '${company}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([
        Entity1,
        Entity2,
        Entity3,
        Entity4,
        Entity5,
        Entity6,
        Entity7,
        Entity8,
        Entity9,
        Entity10,
        Entity11
      ])
      .then(
        axios.spread(async (...responses) => {
          //263754 14.03 s 4.17 MB
          const reply = {
            RetailEcoResProductTranslation: responses[0].data.value, //9738 3.90s 214.68 KB            
            ReleasedProductsV2: responses[1].data.value, //6272 4.05s 143.95 KB
            InventitemsalessetupsBI: responses[2].data.value, //4184 2.29s 38.02 KB
            RetailEcoResCategoryHierarchy: responses[3].data.value, //112 1098ms 1.47 KB            
            EcoresproductcategoriesBI: responses[4].data.value, //40008 8.82s 439.81 KB
            ProductCategories: responses[5].data.value, //5538 3.38s 115.14 KB
            RetailEcoResCategory: responses[6].data.value, //12926 4.16s 201.59 KB
            PricedisctablesBI: responses[7].data.value, //62248 10.92s 1.12 MB
            UnitOfMeasureTranslations: responses[8].data.value, //172 1196ms 2.73 KB
            ComboTables: responses[9].data.value, //22608 6.78s 442.54 KB
            InventsumsBI: responses[10].data.value //100008 12.89s 1.49 MB
          };

          await client.set(entity + company, JSON.stringify(reply), {
            EX: 86400,
          });
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
