let express = require("express");
let router = express.Router();
const axios = require("axios");
const client = require("../bin/redis-client");

router.post("/", async (req, res) => {
  try {
    const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
    const clientId = req.query.clientId || (req.body && req.body.clientId);
    const clientSecret =
      req.query.clientSecret || (req.body && req.body.clientSecret);
    const tenant = req.query.tenant || (req.body && req.body.tenant);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const salesOrder =
      req.query.salesOrder || (req.body && req.body.salesOrder);
    const email = req.query.email || (req.body && req.body.email);

    if (!tenantUrl || tenantUrl.length === 0)
      throw new Error("tenantUrl is Mandatory");

    if (!clientId || clientId.length === 0)
      throw new Error("clientId is Mandatory");

    if (!clientSecret || clientSecret.length === 0)
      throw new Error("clientSecret is Mandatory");

    if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

    if (!environment || environment.length === 0)
      throw new Error("environment is Mandatory");

    if (!salesOrder || salesOrder.length === 0)
      throw new Error("salesOrder is Mandatory");

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

    let _salesOrder;
   
    if (salesOrder) {
      //Entidad Extendida
      _salesOrder = await axios
        .patch(
          `${tenant}/data/SalesOrderHeadersV2(SalesOrderNumber='${salesOrder.SalesOrderNumber}',dataAreaId='${salesOrder.dataAreaId}')?cross-company=true`,
          salesOrder,
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
            throw new Error(error.request);
          } else {
            throw new Error("Error", error.message);
          }
        });
    }

    _salesOrder =
      _salesOrder && _salesOrder.data === "" ? "Modified" : "Unchanged";
    /*
    if (email) {
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
                ] === "Create RAIC" ||
                  item[
                    "cr5be_notificationevent@OData.Community.Display.V1.FormattedValue"
                  ] === "All Events") &&
                (item[
                  "cr5be_notificationcompany@OData.Community.Display.V1.FormattedValue"
                ] === salesOrder.dataAreaId ||
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

            const emailMessage = `<div><p>Señores</p><p>Cordial saludo;</p><p>Nos permitimos notificarles que el ${moment(
              salesOrder.UtcDrawingDate
            ).format("DD/MM/YYYY")} a las ${moment(
              salesOrder.UtcDrawingDate
            ).format("h:mm:ss a")}, ${email.Responsable && email.Responsable !== "" ? email.Responsable : "se"} ha generado el ${
              _salesOrder.SRF_HSEIdsalesOrder
            } de tipo “${email.TipoReporte}” en ${
              email.Company
            } para su respectiva gestión y cierre.</p><p>Descripción: ${
              salesOrder.Description ? salesOrder.Description : ""
            }</p><p>Alcance: ${
              email.Scope ? email.Scope : ""
            }</p><p>Centro de trabajo: ${email.Zone ? email.Zone : ''}</p><p>Proceso: ${
              email.Process ? email.Process : ""
            }</p><p>Actividad: ${email.Activity ? email.Activity : ''}</p><p>Trabajo: ${
              email.Job ? email.Job : ""
            }</p><p>Gracias</p></div>`;
            
            const teamsMessage = `<div><p>Reporte de actos, incidentes y condiciones inseguras creado</p><br/><p>Nos permitimos notificarles que el ${moment(
              salesOrder.UtcDrawingDate
            ).format("DD/MM/YYYY")} a las ${moment(
              salesOrder.UtcDrawingDate
            ).format("h:mm:ss a")}, ${email.Responsable && email.Responsable !== "" ? email.Responsable : "se"} ha generado el ${
              _salesOrder.SRF_HSEIdsalesOrder
            } de tipo “${email.TipoReporte}” en ${
              email.Company
            } para su respectiva gestión y cierre.</p><br/><p>Descripción: ${
              salesOrder.Description ? salesOrder.Description : ""
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
                  subject: `Reporte de actos, incidentes y condiciones inseguras creado - ${_salesOrder.SRF_HSEIdsalesOrder} ${email.Company}`,
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
      _salesOrder,
    });
  } catch (error) {
    return res.status(500).json({
      result: false,
      message: error.toString(),
    });
  }
});

module.exports = router;
