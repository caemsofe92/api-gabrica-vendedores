let express = require("express");
let router = express.Router();
const axios = require("axios");
const client = require("../bin/redis-client");
const moment = require("moment");
const { BlobServiceClient } = require("@azure/storage-blob");

router.post("/", async (req, res) => {
  try {
    const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
    const clientId = req.query.clientId || (req.body && req.body.clientId);
    const clientSecret =
      req.query.clientSecret || (req.body && req.body.clientSecret);
    const tenant = req.query.tenant || (req.body && req.body.tenant);
    const environment =
      req.query.environment || (req.body && req.body.environment);
    const unsafeCondition =
      req.query.unsafeCondition || (req.body && req.body.unsafeCondition);
    const improvementOpportunity =
      req.query.improvementOpportunity ||
      (req.body && req.body.improvementOpportunity);
    const eventDetails =
      req.query.eventDetails || (req.body && req.body.eventDetails);
    const deleteEventCauses =
      req.query.deleteEventCauses || (req.body && req.body.deleteEventCauses);
    const eventCauses =
      req.query.eventCauses || (req.body && req.body.eventCauses);
    const deletePotentialEventDamage =
      req.query.deletePotentialEventDamage ||
      (req.body && req.body.deletePotentialEventDamage);
    const potentialEventDamage =
      req.query.potentialEventDamage ||
      (req.body && req.body.potentialEventDamage);
    const evidences = req.query.evidences || (req.body && req.body.evidences);
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

    let _improvementOpportunity;

    if (
      unsafeCondition &&
      unsafeCondition.SRF_HSEIdImprovementOpportunities.length === 0 &&
      improvementOpportunity &&
      improvementOpportunity.length > 0
    ) {
      _improvementOpportunity = await axios
        .post(
          `${tenant}/api/services/SRF_HSEDocuRefServicesGroup/SRF_HSEDocuRefServices/createOpportunities`,
          {
            _description: improvementOpportunity,
            _dataAreaId: unsafeCondition.dataAreaId,
            _idOrigin: unsafeCondition.SRF_HSEIdUnsafeCondition,
            _detectionDate: unsafeCondition.UtcDrawingDate,
            _refRecId: unsafeCondition.RecId1,
            _state: 0,
            _hcmEmploymentType: 0,
            _origin: 8,
            _tableID: 20371,
          },
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
      _improvementOpportunity = _improvementOpportunity.data
        ? {
            SRF_HSEIdImprovementOpportunities: _improvementOpportunity.data,
            Description: improvementOpportunity,
            RefRecId: unsafeCondition.RecId1,
          }
        : null;
    }

    let _unsafeCondition;

    if (unsafeCondition) {
      _unsafeCondition = await axios
        .patch(
          `${tenant}/data/UnsafeConditionsReports(dataAreaId='${unsafeCondition.dataAreaId}',SRF_HSEIdUnsafeCondition='${unsafeCondition.SRF_HSEIdUnsafeCondition}')?cross-company=true`,
          {
            ...unsafeCondition,
            RecId1: undefined,
            SRF_HSEIdImprovementOpportunities:
              _improvementOpportunity &&
              _improvementOpportunity.SRF_HSEIdImprovementOpportunities &&
              unsafeCondition.SRF_HSEIdImprovementOpportunities.length === 0
                ? _improvementOpportunity.SRF_HSEIdImprovementOpportunities
                : unsafeCondition.SRF_HSEIdImprovementOpportunities,
            Responsible: unsafeCondition.Responsible.toString(),
          },
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

    _unsafeCondition =
      _unsafeCondition && _unsafeCondition.data === ""
        ? "Modified"
        : "Unchanged";

    let _eventDetails;

    if (eventDetails) {
      _eventDetails = await axios
        .patch(
          `${tenant}/data/SRF_HSEEventDetails(RecId1=${eventDetails.RecId1},dataAreaId='${eventDetails.dataAreaId}',SRF_HSEIdUnsafeCondition='${eventDetails.SRF_HSEIdUnsafeCondition}')?cross-company=true`,
          {
            ...eventDetails,
            RecId1: undefined,
            EventDate2: moment(eventDetails.EventDate2).add(5, "hours"),
          },
          {
            headers: { Authorization: "Bearer " + token, "If-Match": "*" },
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

    _eventDetails =
      _eventDetails && _eventDetails.data === "" ? "Modified" : "Unchanged";

    let _deleteEventCauses = [];

    if (deleteEventCauses && deleteEventCauses.length > 0) {
      for (let i = 0; i < deleteEventCauses.length; i++) {
        const deleteCause = deleteEventCauses[i];
        const __deleteEventCauses = await axios
          .delete(
            `${tenant}/data/SRF_HSEEventCauses(RecId1=${deleteCause.RecId1},dataAreaId='${eventDetails.dataAreaId}',SRF_HSEIdUnsafeCondition='${eventDetails.SRF_HSEIdUnsafeCondition}',IdCausal='${deleteCause.IdCausal}')?cross-company=true`,
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
        _deleteEventCauses.push(
          __deleteEventCauses && __deleteEventCauses.data === ""
            ? "Deleted"
            : "Unchanged"
        );
      }
    }

    let _eventCauses = [];

    if (eventCauses && eventCauses.length > 0) {
      for (let i = 0; i < eventCauses.length; i++) {
        const cause = eventCauses[i];
        const causeResponse = await axios
          .post(
            `${tenant}/data/SRF_HSEEventCauses?cross-company=true&$format=application/json;odata.metadata=none`,
            {
              ...cause,
              RecId1: undefined,
              dataAreaId: eventDetails.dataAreaId,
              SRF_HSEIdUnsafeCondition: eventDetails.SRF_HSEIdUnsafeCondition,
              RefRecid: eventDetails.RecId1,
            },
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
        _eventCauses.push(causeResponse.data);
      }
    }

    let _deletePotentialEventDamage = [];

    if (deletePotentialEventDamage && deletePotentialEventDamage.length > 0) {
      for (let i = 0; i < deletePotentialEventDamage.length; i++) {
        const damage = deletePotentialEventDamage[i];
        const __deletePotentialEventDamage = await axios
          .delete(
            `${tenant}/data/SRF_HSEPotentialEventDamage(RecId1=${damage.RecId1},dataAreaId='${eventDetails.dataAreaId}')?cross-company=true`,
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
        _deletePotentialEventDamage.push(
          __deletePotentialEventDamage &&
            __deletePotentialEventDamage.data === ""
            ? "Deleted"
            : "Unchanged"
        );
      }
    }

    let _potentialEventDamage = [];

    if (potentialEventDamage && potentialEventDamage.length > 0) {
      for (let i = 0; i < potentialEventDamage.length; i++) {
        const damage = potentialEventDamage[i];
        const damageResponse = await axios
          .post(
            `${tenant}/data/SRF_HSEPotentialEventDamage?cross-company=true&$format=application/json;odata.metadata=none`,
            {
              ...damage,
              RecId1: undefined,
              dataAreaId: eventDetails.dataAreaId,
              SRF_HSEIdUnsafeCondition: eventDetails.SRF_HSEIdUnsafeCondition,
              RefRecid: eventDetails.RecId1,
            },
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
        _potentialEventDamage.push(damageResponse.data);
      }
    }

    let _evidences = [];

    if (evidences) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.BLOBSTORAGECONNECTIONSTRING
      );

      const containerClient = blobServiceClient.getContainerClient(
        process.env.BLOBSTORAGERAICPATH
      );

      for (let i = 0; i < evidences.length; i++) {
        const element = evidences[i];

        if (element.imagePath.length > 0) {
          const path = JSON.parse(element.imagePath).toString();

          const matches = path.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

          const buffer = new Buffer.from(matches[2], "base64");

          const imageType = matches[1];

          const name =
            unsafeCondition.RecId1 +
            moment().format().toString() +
            "hseqraicimage." +
            imageType.split("/")[1];

          const blockBlobClient = containerClient.getBlockBlobClient(name);

          const responseImage = await blockBlobClient.upload(
            buffer,
            buffer.byteLength
          );

          const imageRequest = {
            _DataareaId: unsafeCondition.dataAreaId,
            _AccesInformation: `${process.env.BLOBSTORAGEURL}/${process.env.BLOBSTORAGERAICPATH}/${name}`,
            _name: name,
            _TableId: 20371,
            _RefRecId: unsafeCondition.RecId1,
            _FileType: imageType.split("/")[1],
          };

          if (responseImage) {
            await axios
              .post(
                `${tenant}/api/services/SRF_HSEDocuRefServicesGroup/SRF_HSEDocuRefServices/FillDocuRef`,
                imageRequest,
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

            _evidences.push({
              RefRecId: unsafeCondition.RecId1,
              OriginalFileName: name,
            });
          }
        }
      }
    }

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

    return res.json({
      result: true,
      message: "OK",
      _unsafeCondition,
      _improvementOpportunity,
      _eventDetails,
      _deleteEventCauses,
      _eventCauses,
      _deletePotentialEventDamage,
      _potentialEventDamage,
      _evidences,
    });
  } catch (error) {
    return res.status(500).json({
      result: false,
      message: error.toString(),
    });
  }
});

module.exports = router;
