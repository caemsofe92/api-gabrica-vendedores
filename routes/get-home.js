let express = require("express");
let router = express.Router();
const client = require("../bin/redis-client");
const axios = require("axios");

router.post("/", async (req, res) => {
  const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
  const clientId = req.query.clientId || (req.body && req.body.clientId);
  const clientSecret =
    req.query.clientSecret || (req.body && req.body.clientSecret);
  const tenant = req.query.tenant || (req.body && req.body.tenant);
  const entity = req.query.entity || (req.body && req.body.entity);
  const refresh = req.query.refresh || (req.body && req.body.refresh);
  const numberOfElements =
    req.query.numberOfElements || (req.body && req.body.numberOfElements);
  const isTest = req.query.isTest || (req.body && req.body.isTest);
  const userEmail = req.query.userEmail || (req.body && req.body.userEmail);
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

  if (!userEmail || userEmail.length === 0)
    throw new Error("userEmail is Mandatory");

  if (!environment || environment.length === 0)
    throw new Error("environment is Mandatory");

  if (!client.isOpen) client.connect();

  if (!refresh) {
    const userReply = await client.get(entity + userEmail);
    if (userReply)
      return res.json({
        result: true,
        message: "OK",
        response: JSON.parse(userReply),
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

  let mainReply;

  const Entity1 = axios.get(
    `${tenant}/data/SystemUsers?$format=application/json;odata.metadata=none&cross-company=true&$filter=Email eq '${userEmail}'&$select=UserID,Company,UserInfo_language,Enabled,UserName`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity2 = axios.get(
    `${tenant}/data/Workers?$format=application/json;odata.metadata=none&cross-company=true&$filter=IdentityEmail eq '${userEmail}'&$select=PersonnelNumber,Name`,
    { headers: { Authorization: "Bearer " + token } }
  );

  await axios
    .all([Entity1, Entity2])
    .then(
      axios.spread(async (...responses) => {
        mainReply = {
          SystemUser: responses[0].data.value[0],
          Worker: responses[1].data.value[0],
        };
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

  const Entity3 = axios.get(
    `${tenant}/data/SecurityUserRoles?$format=application/json;odata.metadata=none&cross-company=true&$filter=UserId eq '${mainReply.SystemUser.UserID}'&$select=SecurityRoleName`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity4 = axios.get(
    `${tenant}/data/SmmsalesunitmembersBI?$format=application/json;odata.metadata=none&cross-company=true&$filter=Identification eq '${mainReply.Worker.PersonnelNumber}'&$select=SalesUnitId,SalesPersonWorker,MemberId,ParentId,SalesManager`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity5 = axios.get(
    `${tenant}/data/Companies?$format=application/json;odata.metadata=none&cross-company=true&$select=DataArea,Name`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity6 = axios.get(
    `${tenant}/data/RetailEcoResProductTranslation?$format=application/json;odata.metadata=none&$select=EcoResProduct_DisplayProductNumber,Product,Name${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity7 = axios.get(
    `${tenant}/data/ReleasedProductsV2?$format=application/json;odata.metadata=none&$select=ItemNumber,SalesLineDiscountProductGroupCode,SalesSalesTaxItemGroupCode,InventoryUnitSymbol${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true${
      mainReply.SystemUser && mainReply.SystemUser.Company
        ? mainReply.SystemUser.Company
        : null
        ? `&$filter=dataAreaId eq '${
            mainReply.SystemUser && mainReply.SystemUser.Company
              ? mainReply.SystemUser.Company
              : null
          }'`
        : ""
    }`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity8 = axios.get(
    `${tenant}/data/InventitemsalessetupsBI?$format=application/json;odata.metadata=none&$select=ItemId,Stopped${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true${
      mainReply.SystemUser && mainReply.SystemUser.Company
        ? mainReply.SystemUser.Company
        : null
        ? `&$filter=dataAreaId eq '${
            mainReply.SystemUser && mainReply.SystemUser.Company
              ? mainReply.SystemUser.Company
              : null
          }'`
        : ""
    }`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity9 = axios.get(
    `${tenant}/data/RetailEcoResCategoryHierarchy?$format=application/json;odata.metadata=none&$select=Name,AxRecId${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true`,
    { headers: { Authorization: "Bearer " + token } }
  );

  const Entity10 = axios.get(
    `${tenant}/data/RetailEcoResCategory?$format=application/json;odata.metadata=none&$select=EcoResCategory1_Name,CategoryHierarchy,AxRecId${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true&$filter=Level eq 1`,
    { headers: { Authorization: "Bearer " + token } }
  );
  const Entity11 = axios.get(
    `${tenant}/data/UnitOfMeasureTranslations?$format=application/json;odata.metadata=none&$select=UnitSymbol,TranslatedDescription${
      isTest && numberOfElements ? "&$top=" + numberOfElements : ""
    }&cross-company=true`,
    { headers: { Authorization: "Bearer " + token } }
  );

  let userReply;

  await axios
    .all([
      Entity3,
      Entity4,
      Entity5,
      Entity6,
      Entity7,
      Entity8,
      Entity9,
      Entity10,
      Entity11,
    ])
    .then(
      axios.spread(async (...responses) => {
        const Roles = responses[0].data.value.map((Rol) => {
          return { Name: Rol.SecurityRoleName };
        });
        const SalesUnitMember = responses[1].data.value[0];
        const Companies = responses[2].data.value;

        let RetailEcoResProductTranslation = responses[3].data.value;
        const ReleasedProductsV2 = responses[4].data.value;
        const InventitemsalessetupsBI = responses[5].data.value;
        const RetailEcoResCategoryHierarchy = responses[6].data.value;
        const RetailEcoResCategory = responses[7].data.value;
        const UnitOfMeasureTranslations = responses[8].data.value;

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

              for (let i = 0; i < RetailEcoResProductTranslation.length; i++) {
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
                      Category: item2.Category
                      });
                  }
                }

                RetailEcoResProductTranslation[i] = {
                  ...RetailEcoResProductTranslation[i],
                  productCategories,
                };
              }

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

              userReply = {
                Companies,
                Roles,
                RetailEcoResProductTranslation,
                RetailEcoResCategoryHierarchy,
                UnitOfMeasureTranslations,
                UserId:
                  mainReply.SystemUser && mainReply.SystemUser.UserID
                    ? mainReply.SystemUser.UserID
                    : null,
                Company:
                  mainReply.SystemUser && mainReply.SystemUser.Company
                    ? mainReply.SystemUser.Company
                    : null,
                Language:
                  mainReply.SystemUser && mainReply.SystemUser.UserInfo_language
                    ? mainReply.SystemUser.UserInfo_language
                    : null,
                Enabled:
                  mainReply.SystemUser && mainReply.SystemUser.Enabled
                    ? mainReply.SystemUser.Enabled
                    : null,
                UserName:
                  mainReply.SystemUser && mainReply.SystemUser.UserName
                    ? mainReply.SystemUser.UserName
                    : null,
                PersonnelNumber:
                  mainReply.Worker && mainReply.Worker.PersonnelNumber
                    ? mainReply.Worker.PersonnelNumber
                    : null,
                PersonName:
                  mainReply.Worker && mainReply.Worker.Name
                    ? mainReply.Worker.Name
                    : null,
                SalesUnitId:
                  SalesUnitMember && SalesUnitMember.SalesUnitId
                    ? SalesUnitMember.SalesUnitId
                    : null,
                SalesPersonWorker:
                  SalesUnitMember && SalesUnitMember.SalesPersonWorker
                    ? SalesUnitMember.SalesPersonWorker
                    : null,
                MemberId:
                  SalesUnitMember && SalesUnitMember.MemberId
                    ? SalesUnitMember.MemberId
                    : null,
                ParentId:
                  SalesUnitMember && SalesUnitMember.ParentId
                    ? SalesUnitMember.ParentId
                    : null,
                SalesManager:
                  SalesUnitMember && SalesUnitMember.SalesManager
                    ? SalesUnitMember.SalesManager
                    : null,
              };
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

  const selectEntityFields =
    "&$select=PartyNumber,CustomerAccount,PaymentTerms,PartyType,NameAlias,OrganizationName,SalesTaxGroup,LineDiscountCode";
  const Entity13 = axios.get(
    `${tenant}/data/GAB_Customers?$format=application/json;odata.metadata=none&cross-company=true&$count=true&$filter=SalesDistrict eq '${userReply.SalesUnitId}' and dataAreaId eq '${userReply.Company}'${selectEntityFields}`,
    { headers: { Authorization: "Bearer " + token } }
  );

  const selectEntity2Fields =
    "&$select=PartyNumber,Description,Address,IsPrimary,DMGBInventSiteId_PE,DMGBInventLocationId_PE";

  await axios
    .all([Entity13])
    .then(
      axios.spread(async (...responses) => {
        const GAB_Customers = responses[0].data.value;

        let PartyLocationPostalAddressesV2 = [];

        for (let i = 0; i < GAB_Customers.length; i++) {
          const PartyLocationPostalAddressesV2Item = axios.get(
            `${tenant}/data/PartyLocationPostalAddressesV2?$format=application/json;odata.metadata=none&cross-company=true&$filter=PartyNumber eq '${GAB_Customers[i].PartyNumber}'${selectEntity2Fields}`,
            { headers: { Authorization: "Bearer " + token } }
          );

          PartyLocationPostalAddressesV2.push(
            PartyLocationPostalAddressesV2Item
          );
        }

        await axios
          .all(PartyLocationPostalAddressesV2)
          .then(
            axios.spread(async (...responses2) => {
              let PartyLocationPostalAddresses = [];
              for (let i = 0; i < responses2.length; i++) {
                const element = responses2[i];
                element.data.value.map((item2) =>
                  PartyLocationPostalAddresses.push(item2)
                );
              }

              const customersReply = {
                ...userReply,
                GAB_Customers: responses[0].data.value,
                GAB_CustomersCount: responses[0].data["@odata.count"],
                PartyLocationPostalAddressesV2: PartyLocationPostalAddresses,
              };

              await client.set(
                entity + userEmail,
                JSON.stringify(customersReply),
                {
                  EX: 84600,
                }
              );

              return res.json({
                result: true,
                message: "OK",
                response: customersReply,
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

  try {
  } catch (error) {
    return res.status(500).json({
      result: false,
      message: error.toString(),
    });
  }
});

module.exports = router;
