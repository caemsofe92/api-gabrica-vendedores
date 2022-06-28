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
      const mainReply = await client.get(entity + userCompany);
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
      `${tenant}/data/SRF_HSEZones?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity2 = axios.get(
      `${tenant}/data/SRF_HSEZonesLineEntity?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity3 = axios.get(
      `${tenant}/data/SRF_HSEProcessLineEntity?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity4 = axios.get(
      `${tenant}/data/SRF_HSEActivities_LineEntity?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity5 = axios.get(
      `${tenant}/data/SRF_HSEImmediateBasicCauses?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity6 = axios.get(
      `${tenant}/data/SRF_HSEObjectDamage?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity7 = axios.get(
      `${tenant}/data/SRF_HSEPropertyType?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity8 = axios.get(
      `${tenant}/data/SRF_HSEHarmLevelsEntity?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity9 = axios.get(
      `${tenant}/data/UnsafeConditionsReports?$format=application/json;odata.metadata=none${
        numberOfElements ? "&$top=" + numberOfElements : ""
      }${offset ? "&$skip=" + offset : ""}&$count=true&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }&$orderby=UtcDrawingDate desc`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity10 = axios.get(
      `${tenant}/data/SRF_HSEEventDetails?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity11 = axios.get(
      `${tenant}/data/SRF_HSEEventCauses?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity12 = axios.get(
      `${tenant}/data/SRF_HSEPotentialEventDamage?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity13 = axios.get(
      `${tenant}/data/SRF_HcmWorkerEntity?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$select=Name,PersonnelNumber,DataArea${
        userCompany ? `&$filter=DataArea eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const Entity14 = axios.get(
      `${tenant}/data/SRF_DocuRef?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$select=OriginalFileName,RefRecId&$filter=${
        userCompany ? `RefCompanyId eq '${userCompany}' and ` : ""
      }RefTableId eq 20371 and TypeId eq 'File' and OriginalFileName eq '*hseqraicimage*'`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const Entity15 = axios.get(
      `${tenant}/data/SRF_HSEImprovementOpportunities?$format=application/json;odata.metadata=none${
        isTest && numberOfElements ? "&$top=" + numberOfElements : ""
      }&cross-company=true&$select=Description,SRF_HSEIdImprovementOpportunities,RefRecId&$filter=${
        userCompany ? `dataAreaId eq '${userCompany}' and ` : ""
      }RefTableId eq 20371`,
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
        Entity11,
        Entity12,
        Entity13,
        Entity14,
        Entity15,
      ])
      .then(
        axios.spread(async (...responses) => {
          const SRF_HcmWorkerEntity = responses[12].data.value;
          let SRF_HSE_WorkerEntity = [];

          for (let i = 0; i < SRF_HcmWorkerEntity.length; i++) {
            const element1 = SRF_HcmWorkerEntity[i];
            let exists = false;

            for (let j = 0; j < SRF_HSE_WorkerEntity.length; j++) {
              const element2 = SRF_HSE_WorkerEntity[j];

              if (
                element2.Name === element1.Name &&
                element2.PersonnelNumber === element1.PersonnelNumber &&
                element2.DataArea === element1.DataArea
              ) {
                exists = true;
                break;
              }
            }

            if (!exists) {
              SRF_HSE_WorkerEntity.push(element1);
            }
          }

          const SRF_HSEUnsafeConditionsReport = responses[8].data.value;
          let _SRF_HSEUnsafeConditionsReportIds = [];
          let _SRF_HSEUnsafeConditionsReportRecIds = [];

          for (let i = 0; i < SRF_HSEUnsafeConditionsReport.length; i++) {
            const item = SRF_HSEUnsafeConditionsReport[i];
            _SRF_HSEUnsafeConditionsReportIds.push(
              item.SRF_HSEIdUnsafeCondition
            );
            _SRF_HSEUnsafeConditionsReportRecIds.push(item.RecId1);
          }
          const SRF_HSEEventDetails = responses[9].data.value.filter((item) =>
            _SRF_HSEUnsafeConditionsReportIds.includes(
              item.SRF_HSEIdUnsafeCondition
            )
          );

          const _SRF_HSEEventDetailsIds = SRF_HSEEventDetails.map(
            (item) => item.RecId1
          );

          const SRF_HSEEventCauses = responses[10].data.value.filter((item) =>
            _SRF_HSEEventDetailsIds.includes(item.RefRecid)
          );

          const SRF_HSEPotentialEventDamage = responses[11].data.value.filter(
            (item) => _SRF_HSEEventDetailsIds.includes(item.RefRecid)
          );

          const SRF_DocuRefRAIC = responses[13].data.value.filter((item) =>
            _SRF_HSEUnsafeConditionsReportRecIds.includes(item.RefRecId)
          );

          const SRF_HSEImprovementOpportunitiesRAIC =
            responses[14].data.value.filter((item) =>
              _SRF_HSEUnsafeConditionsReportRecIds.includes(item.RefRecId)
            );

          const reply = {
            SRF_HSEZones: responses[0].data.value,
            SRF_HSEZonesLineEntity: responses[1].data.value,
            SRF_HSEProcessLineEntity: responses[2].data.value,
            SRF_HSEActivities_LineEntity: responses[3].data.value,
            SRF_HSEImmediateBasicCauses: responses[4].data.value,
            SRF_HSEObjectDamage: responses[5].data.value,
            SRF_HSEPropertyType: responses[6].data.value,
            SRF_HSEHarmLevelsEntity: responses[7].data.value,
            SRF_HSE_WorkerEntity,
            SRF_HSEUnsafeConditionsReportCount:
              responses[8].data["@odata.count"],
            SRF_HSEUnsafeConditionsReport,
            SRF_HSEEventDetails,
            SRF_HSEEventCauses,
            SRF_HSEPotentialEventDamage,
            SRF_DocuRefRAIC,
            SRF_HSEImprovementOpportunitiesRAIC,
          };

          await client.set(entity + userCompany, JSON.stringify(reply), {
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
