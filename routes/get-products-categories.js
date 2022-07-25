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
    const numberOfElements =
      req.query.numberOfElements || (req.body && req.body.numberOfElements);
    const isTest = req.query.isTest || (req.body && req.body.isTest);
    const refresh = req.query.refresh || (req.body && req.body.refresh);
    const userCompany =
      req.query.userCompany || (req.body && req.body.userCompany);
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

    if (!userCompany || userCompany.length === 0)
      throw new Error("userCompany is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!client.isOpen) client.connect();

    if (!refresh) {
      const reply = await client.get(entity + userCompany);
      if (reply)
        return res.json({
          result: true,
          message: "OK",
          response: JSON.parse(reply),
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
      `${tenant}/data/ReleasedProductsV2?$format=application/json;odata.metadata=none&$select=ItemNumber,SalesLineDiscountProductGroupCode,SalesSalesTaxItemGroupCode,InventoryUnitSymbol,dataAreaId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity3 = axios.get(
      `${tenant}/data/InventitemsalessetupsBI?$format=application/json;odata.metadata=none&$select=ItemId,Stopped${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=dataAreaId eq '${userCompany}'`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity4 = axios.get(
      `${tenant}/data/RetailEcoResCategoryHierarchy?$format=application/json;odata.metadata=none&$select=Name,AxRecId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity5 = axios.get(
      `${tenant}/data/RetailEcoResCategory?$format=application/json;odata.metadata=none&$select=EcoResCategory1_Name,CategoryHierarchy,AxRecId${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$filter=Level eq 1`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2, Entity3, Entity4, Entity5])
      .then(
        axios.spread(async (...responses) => {
          let RetailEcoResProductTranslation = responses[0].data.value;
          const ReleasedProductsV2 = responses[1].data.value;
          const InventitemsalessetupsBI = responses[2].data.value;
          const RetailEcoResCategoryHierarchy = responses[3].data.value;
          const RetailEcoResCategory = responses[4].data.value;

          let _EcoresproductcategoriesBI = [];

          for (let i = 0; i < RetailEcoResCategoryHierarchy.length; i++) {
            const _EcoresproductcategoriesBIItem = axios.get(
              `${tenant}/data/EcoresproductcategoriesBI?$format=application/json;odata.metadata=none&$select=CategoryHierarchy,Product,Category${
                isTest && numberOfElements ? "&$top=" + numberOfElements : ""
              }&cross-company=true&$filter=CategoryHierarchy eq ${
                RetailEcoResCategoryHierarchy[i].AxRecId
              }`,
              { headers: { Authorization: "Bearer " + token } }
            );

            _EcoresproductcategoriesBI.push(_EcoresproductcategoriesBIItem);
          }

          await axios
            .all(_EcoresproductcategoriesBI)
            .then(
              axios.spread(async (...responses2) => {
                let EcoresproductcategoriesBI = [];

                for (let i = 0; i < responses2.length; i++) {
                  const element = responses2[i];
                  element.data.value.map((item2) =>
                    EcoresproductcategoriesBI.push(item2)
                  );
                }

                for (
                  let i = 0;
                  i < RetailEcoResProductTranslation.length;
                  i++
                ) {
                  const item1 = RetailEcoResProductTranslation[i];

                  for (let j = 0; j < ReleasedProductsV2.length; j++) {
                    const item2 = ReleasedProductsV2[j];
                    if (
                      item1.EcoResProduct_DisplayProductNumber ===
                      item2.ItemNumber
                    ) {
                      RetailEcoResProductTranslation[i] = {
                        ...RetailEcoResProductTranslation[i],
                        SalesLineDiscountProductGroupCode:
                          item2.SalesLineDiscountProductGroupCode,
                        SalesSalesTaxItemGroupCode:
                          item2.SalesSalesTaxItemGroupCode,
                        InventoryUnitSymbol: item2.InventoryUnitSymbol,
                        dataAreaId: item2.dataAreaId
                      };
                      break;
                    }
                  }

                  for (let j = 0; j < InventitemsalessetupsBI.length; j++) {
                    const item2 = InventitemsalessetupsBI[j];
                    if (
                      item1.EcoResProduct_DisplayProductNumber === item2.ItemId
                    ) {
                      RetailEcoResProductTranslation[i] = {
                        ...RetailEcoResProductTranslation[i],
                        Stopped: item2.Stopped,
                      };
                      break;
                    }
                  }

                  let productCategories = [];

                  for (let j = 0; j < EcoresproductcategoriesBI.length; j++) {
                    const item2 = EcoresproductcategoriesBI[j];
                    if (item1.Product === item2.Product) {
                      productCategories.push({
                        CategoryHierarchy: item2.CategoryHierarchy,
                        Category: item2.Category,
                      });
                    }
                  }

                  RetailEcoResProductTranslation[i] = {
                    ...RetailEcoResProductTranslation[i],
                    productCategories,
                  };
                }

                RetailEcoResProductTranslation.filter(item => item.dataAreaId && (item.dataAreaId).toUpperCase() === (userCompany).toUpperCase());
                
                for (let i = 0; i < RetailEcoResCategoryHierarchy.length; i++) {
                  const item1 = RetailEcoResCategoryHierarchy[i];

                  let values = [];
                  for (let j = 0; j < RetailEcoResCategory.length; j++) {
                    const item2 = RetailEcoResCategory[j];
                    if (item1.AxRecId === item2.CategoryHierarchy) {
                      values.push({
                        EcoResCategory1_Name: item2.EcoResCategory1_Name,
                        AxRecId: item2.AxRecId,
                      });
                    }
                  }
                  RetailEcoResCategoryHierarchy[i] = {
                    ...RetailEcoResCategoryHierarchy[i],
                    values,
                  };
                }

                reply = {
                  RetailEcoResProductTranslation,
                  RetailEcoResCategoryHierarchy,
                };

                await client.set(entity + userCompany, JSON.stringify(reply), {
                  EX: 86400,
                });
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
