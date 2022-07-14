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

  await axios
    .all([Entity3, Entity4, Entity5])
    .then(
      axios.spread(async (...responses) => {
        const Roles = responses[0].data.value.map((Rol) => {
          return { Name: Rol.SecurityRoleName };
        });
        const SalesUnitMember = responses[1].data.value[0];
        const Companies = responses[2].data.value;
        const userReply = {
          Companies,
          Roles,
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

        await client.set(entity + userEmail, JSON.stringify(userReply), {
          EX: 84600,
        });

        return res.json({ result: true, message: "OK", response: userReply });
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
