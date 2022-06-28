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

    let _mainReply;
    let mainReply;

    if (!refresh) {
      _mainReply = await client.get(entity);
    }

    if (!_mainReply || refresh) {
      const Entity1 = axios.get(
        `${tenant}/data/Workers?$format=application/json;odata.metadata=none&cross-company=true&$select=PartyNumber,PersonnelNumber`,
        { headers: { Authorization: "Bearer " + token } }
      );

      await axios
        .all([Entity1])
        .then(
          axios.spread(async (...responses) => {
            mainReply = responses[0].data.value;

            await client.set(entity, JSON.stringify(mainReply), {
              EX: 86400,
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
    } else {
      mainReply = JSON.parse(_mainReply);
    }

    const Entity1 = axios.get(
      `${tenant}/data/SecurityUserRoles?$format=application/json;odata.metadata=none&cross-company=true&$select=UserId,SecurityRoleName`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity2 = axios.get(
      `${tenant}/data/PersonUsers?$format=application/json;odata.metadata=none&cross-company=true&$filter=UserEmail eq '${userEmail}'&$select=UserId,PersonName,PartyNumber`,
      { headers: { Authorization: "Bearer " + token } }
    );
    const Entity3 = axios.get(
      `${tenant}/data/Companies?$format=application/json;odata.metadata=none&cross-company=true&$select=DataArea,Name`,
      { headers: { Authorization: "Bearer " + token } }
    );

    await axios
      .all([Entity1, Entity2, Entity3])
      .then(
        axios.spread(async (...responses) => {
          const _PersonUsers = responses[1].data.value;
          let PersonUsers = {};
          let HcmWorkers = {};

          if (_PersonUsers.length > 0) {
            PersonUsers = _PersonUsers[0];
            const _HcmWorkers = mainReply.filter(
              (item) =>
                item.PartyNumber === PersonUsers.PartyNumber
            );

            if (_HcmWorkers.length > 0) {
              HcmWorkers = _HcmWorkers[0];
            }
          }

          const userReply = {
            SecurityUserRoles: (responses[0].data.value.filter(item => item.UserId ===  PersonUsers.UserId)).map((Rol) => {
              return { Name: Rol.SecurityRoleName };
            }),
            SRFUserData: {
              UserId: PersonUsers.UserId,
              PersonName: PersonUsers.PersonName,
              PersonnelNumber: HcmWorkers.PersonnelNumber,
              Company: responses[0].data.value[0].company,
            },
            Companies: responses[2].data.value,
          };

          await client.set(entity + userEmail, JSON.stringify(userReply), {
            EX: 3599,
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
          console.log(error);
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
