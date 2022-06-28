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
    const refresh = req.query.refresh || (req.body && req.body.refresh);
    const userCompany =
      req.query.userCompany || (req.body && req.body.userCompany);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const search = req.query.search || (req.body && req.body.search);
    const sort = req.query.sort || (req.body && req.body.sort);

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
      `${tenant}/data/SRF_HSEApprovalLineEntity?$format=application/json;odata.metadata=none&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity2 = axios.get(
      `${tenant}/data/SRF_HSEDiagnosticEntity?$format=application/json;odata.metadata=none${
        numberOfElements ? "&$top=" + numberOfElements : ""
      }${
        offset ? "&$skip=" + offset : ""
      }&$count=true&cross-company=true&$filter=(State eq Microsoft.Dynamics.DataEntities.SRF_HSEDiagnosticState'Execute' or State eq Microsoft.Dynamics.DataEntities.SRF_HSEDiagnosticState'InProcess')${
        userCompany ? ` and dataAreaId eq '${userCompany}'` : ""
      }${
        search ? ` and SRF_HSEIdDiagnostic eq '*${search}*'` : ""
      }&$orderby=SRF_HSEIdDiagnostic ${sort ? sort : "desc"}`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const Entity3 = axios.get(
      `${tenant}/data/SRF_HSEDiagnosticLine?$format=application/json;odata.metadata=none&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity4 = axios.get(
      `${tenant}/data/SRF_HSEComplianceEvidencesEntity?$format=application/json;odata.metadata=none&cross-company=true${
        userCompany ? `&$filter=dataAreaId eq '${userCompany}'` : ""
      }`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity5 = axios.get(
      `${tenant}/data/SRF_HSEImprovementOpportunities?$format=application/json;odata.metadata=none&cross-company=true&$select=Description,SRF_HSEIdImprovementOpportunities,RefRecId&$filter=${
        userCompany ? `dataAreaId eq '${userCompany}' and ` : ""
      }RefTableId eq 17070`,
      { headers: { Authorization: "Bearer " + token } }
    );

    const Entity6 = axios.get(
      `${tenant}/data/SRF_DocuRef?$format=application/json;odata.metadata=none&cross-company=true&$select=OriginalFileName,RefRecId&$filter=${
        userCompany ? `RefCompanyId eq '${userCompany}' and ` : ""
      }RefTableId eq 17070 and TypeId eq 'File' and OriginalFileName eq '*hseqdiagnosticimage*'`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2, Entity3, Entity4, Entity5, Entity6])
      .then(
        axios.spread(async (...responses) => {
          const SRF_HSEDiagnosticEntity = responses[1].data.value;

          let SRF_HSEDiagnosticIds = responses[1].data.value.map(
            (item) => item.RecId1
          );
          const _SRF_HSEDiagnosticLine = responses[2].data;
          const SRF_HSEApprovalLineEntity = responses[0].data.value;
          let SRF_HSEDiagnosticLineIds = [];
          let SRF_HSEDiagnosticLine = _SRF_HSEDiagnosticLine.value.filter(
            (item) => SRF_HSEDiagnosticIds.includes(item.RefRecId)
          );
          SRF_HSEDiagnosticLine = SRF_HSEDiagnosticLine.map((item) => {
            const approvalList = SRF_HSEApprovalLineEntity.filter(
              (approvalElement) =>
                approvalElement.IdApproval === item.IdApproval &&
                approvalElement.dataAreaId === item.dataAreaId
            ).map((approvalElement) => approvalElement.Score);
            SRF_HSEDiagnosticLineIds.push(item.RecId1);
            return {
              ...item,
              MaxScore: Math.max(...approvalList),
              MinScore: Math.min(...approvalList),
            };
          });

          const SRF_HSEImprovementOpportunitiesDiagnostic =
            responses[4].data.value.filter((item) =>
              SRF_HSEDiagnosticLineIds.includes(item.RefRecId)
            );

          const SRF_DocuRefDiagnostic = responses[5].data.value.filter((item) =>
            SRF_HSEDiagnosticLineIds.includes(item.RefRecId)
          );

          const reply = {
            SRF_HSEApprovalLineEntity,
            SRF_HSEComplianceEvidencesEntity: responses[3].data.value,
            SRF_HSEDiagnosticEntityCount: responses[1].data["@odata.count"],
            SRF_HSEDiagnosticEntity,
            SRF_HSEDiagnosticLine,
            SRF_HSEImprovementOpportunitiesDiagnostic,
            SRF_DocuRefDiagnostic,
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
    return res.status(500).json({
      result: false,
      message: error.toString(),
    });
  }
});

module.exports = router;
