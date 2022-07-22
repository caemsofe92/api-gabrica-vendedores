let express = require("express");
let router = express.Router();
const axios = require("axios");
const client = require("../bin/redis-client");
const moment = require("moment");
const { BlobServiceClient } = require("@azure/storage-blob");

router.post("/", async (req, res) => {
  
    const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
    const clientId = req.query.clientId || (req.body && req.body.clientId);
    const clientSecret =
      req.query.clientSecret || (req.body && req.body.clientSecret);
    const tenant = req.query.tenant || (req.body && req.body.tenant);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const salesOrderLines =
      req.query.salesOrderLines ||
      (req.body && req.body.salesOrderLines);

    if (!tenantUrl || tenantUrl.length === 0)
      throw new Error("tenantUrl is Mandatory");

    if (!clientId || clientId.length === 0)
      throw new Error("clientId is Mandatory");

    if (!clientSecret || clientSecret.length === 0)
      throw new Error("clientSecret is Mandatory");

    if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!client.isOpen) client.connect();

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

    let _salesOrderLines = [];

    if (salesOrderLines && salesOrderLines.length > 0) {
      for (let i = 0; i < salesOrderLines.length; i++) {
        const line = salesOrderLines[i];
        const __salesOrderLines = await axios
          .patch(
            `${tenant}/data/CDSSalesOrderLinesV2(SalesOrderNumber='${line.SalesOrderNumber}',dataAreaId='${line.dataAreaId}',LineCreationSequenceNumber=${line.LineCreationSequenceNumber})?cross-company=true`,
            line,
            {
              headers: { Authorization: "Bearer " + token },
            }
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
              console.log(error);
              throw new Error(error.request);
            } else {
              throw new Error("Error", error.message);
            }
          });
        _salesOrderLines.push(
          __salesOrderLines &&
            __salesOrderLines.data === ""
            ? "Modified"
            : "Unchanged"
        );
      }
    }

    /*
    if (email && unsafeCondition.State === "Close") {
      let tokenDataverse = await client.get(environment + "Dataverse");

      if (!tokenDataverse) {
        const tokenResponse = await axios
          .post(
            `https://login.microsoftonline.com/${tenantUrl}/oauth2/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${email.tenantDataverse}/`,
            {
              headers: {
                "Content-Type": "application/x-www-form-urlencoded",
              },
            }
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
        tokenDataverse = tokenResponse.data.access_token;
        await client.set(environment + "Dataverse", tokenDataverse, {
          EX: 3599,
        });
      }

      const EntityDataverse1 = axios.get(
        `${email.tenantDataverse}/api/data/v9.2/cr5be_hseqnotifications?$select=cr5be_type,cr5be_emailgroupid,cr5be_zone,cr5be_process,cr5be_notificationcompany,statecode,cr5be_scope,cr5be_notificationevent`,
        {
          headers: {
            Authorization: "Bearer " + tokenDataverse,
            Accept: "application/json;odata.metadata=none",
            Prefer:
              "odata.include-annotations=OData.Community.Display.V1.FormattedValue",
          },
        }
      );

      await axios
        .all([EntityDataverse1])
        .then(
          axios.spread(async (...responses) => {
            const hseqNotifications = responses[0].data.value.filter((item) => {
              if (
                (item[
                  "cr5be_notificationevent@OData.Community.Display.V1.FormattedValue"
                ] === "Edit RAIC" ||
                  item[
                    "cr5be_notificationevent@OData.Community.Display.V1.FormattedValue"
                  ] === "All Events") &&
                (item[
                  "cr5be_notificationcompany@OData.Community.Display.V1.FormattedValue"
                ] === unsafeCondition.dataAreaId ||
                  item[
                    "cr5be_notificationcompany@OData.Community.Display.V1.FormattedValue"
                  ] === "All Companies") &&
                item["statecode@OData.Community.Display.V1.FormattedValue"] ===
                  "Active"
              ) {
                if (
                  item[
                    "cr5be_scope@OData.Community.Display.V1.FormattedValue"
                  ] === "All Scopes" ||
                  (item[
                    "cr5be_scope@OData.Community.Display.V1.FormattedValue"
                  ] === "Global" &&
                    eventDetails.Reach === "Global") ||
                  (item[
                    "cr5be_scope@OData.Community.Display.V1.FormattedValue"
                  ] === "Process" &&
                    eventDetails.Reach === "Process" &&
                    item["cr5be_zone"] ===
                      (eventDetails.IdZone ? eventDetails.IdZone : "") &&
                    item["cr5be_process"] ===
                      (eventDetails.IdProcess ? eventDetails.IdProcess : "")) ||
                  (item[
                    "cr5be_scope@OData.Community.Display.V1.FormattedValue"
                  ] === "Zone" &&
                    eventDetails.Reach === "Process" &&
                    item["cr5be_zone"] ===
                      (eventDetails.IdZone ? eventDetails.IdZone : ""))
                ) {
                  return true;
                }
              }
              return false;
            });

            const hseqNotificationEmail = hseqNotifications
              .filter(
                (item) =>
                  item[
                    "cr5be_type@OData.Community.Display.V1.FormattedValue"
                  ] === "Email"
              )
              .map((item) => item["cr5be_emailgroupid"])
              .join(";");
            const hseqNotificationTeams = hseqNotifications
              .filter(
                (item) =>
                  item[
                    "cr5be_type@OData.Community.Display.V1.FormattedValue"
                  ] === "Teams Group"
              )
              .map((item) => item["cr5be_emailgroupid"]);

            const emailMessage = `<div><p>Señores</p><p>Cordial saludo;</p><p>Nos permitimos notificarles que el ${
              unsafeCondition.SRF_HSEIdUnsafeCondition
            } reportado${email.Responsable && email.Responsable !== "" ? " por " + email.Responsable + " " : " "}en ${
              email.Company
            } ha sido cerrado exitosamente.</p><p>Descripción: ${
              unsafeCondition.Description ? unsafeCondition.Description : ""
            }</p><p>Alcance: ${
              email.Scope ? email.Scope : ""
            }</p><p>Centro de trabajo: ${email.Zone ? email.Zone : ''}</p><p>Proceso: ${
              email.Process ? email.Process : ""
            }</p><p>Actividad: ${email.Activity ? email.Activity : ''}</p><p>Trabajo: ${
              email.Job ? email.Job : ""
            }</p><p>Gracias</p></div>`;

            const teamsMessage = `<div><p>Reporte de actos, incidentes y condiciones inseguras cerrado</p><br/><p>Nos permitimos notificarles que el ${
              unsafeCondition.SRF_HSEIdUnsafeCondition
            } reportado${email.Responsable && email.Responsable !== "" ? " por " + email.Responsable + " " : " "}en ${
              email.Company
            } ha sido cerrado exitosamente.</p><br/><p>Descripción: ${
              unsafeCondition.Description ? unsafeCondition.Description : ""
            }</p><p>Alcance: ${
              email.Scope ? email.Scope : ""
            }</p><p>Centro de trabajo: ${email.Zone ? email.Zone : ''}</p><p>Proceso: ${
              email.Process ? email.Process : ""
            }</p><p>Actividad: ${email.Activity ? email.Activity : ''}</p><p>Trabajo: ${
              email.Job ? email.Job : ""
            }</p></div>`;

            await axios
              .post(
                process.env.EMAILNOTIFICATIONURL,
                {
                  recipients:
                    !hseqNotificationEmail || hseqNotificationEmail === ""
                      ? process.env.DEVELOPEREMAIL
                      : hseqNotificationEmail,
                  recipientsGroups: hseqNotificationTeams,
                  emailMessage,
                  teamsMessage,
                  subject: `Reporte de actos, incidentes y condiciones inseguras cerrado - ${unsafeCondition.SRF_HSEIdUnsafeCondition} ${email.Company}`,
                },
                {
                  headers: { "Content-Type": "application/json" },
                }
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
    }
    */

    return res.json({
      result: true,
      message: "OK",
      _salesOrderLines,
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
