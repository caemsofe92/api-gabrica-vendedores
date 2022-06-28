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
    const diagnostic =
      req.query.diagnostic || (req.body && req.body.diagnostic);
    const diagnosticLine =
      req.query.diagnosticLine || (req.body && req.body.diagnosticLine);
    const improvementOpportunities =
      req.query.improvementOpportunities ||
      (req.body && req.body.improvementOpportunities);
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

    let _diagnostic;

    if (diagnostic) {
      _diagnostic = await axios
        .patch(
          `${tenant}/data/DiagnosticNews(RecIdGen=${diagnostic.RecIdGen},dataAreaId='${diagnostic.dataAreaId}')?cross-company=true`,
          {
            ...diagnostic,
            ExecutionDate: moment(diagnostic.ExecutionDate).add(5, "hours"),
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

    _diagnostic =
      _diagnostic && _diagnostic.data === "" ? "Modified" : "Unchanged";

    let _diagnosticLine = [];

    let _improvementOpportunities = [];

    if (diagnosticLine && diagnosticLine.length > 0) {
      for (let i = 0; i < diagnosticLine.length; i++) {
        const line = diagnosticLine[i];
        let opportunityResponse = {};

        if (
          line.SRF_HSEIdImprovementOpportunities.length === 0 &&
          improvementOpportunities &&
          improvementOpportunities.length > 0
        ) {
          for (let i = 0; i < improvementOpportunities.length; i++) {
            const opportunity = improvementOpportunities[i];
            if (opportunity.RefRecId === line.RecId1) {
              opportunityResponse = await axios
                .post(
                  `${tenant}/api/services/SRF_HSEDocuRefServicesGroup/SRF_HSEDocuRefServices/createOpportunities`,
                  {
                    _description: opportunity.Description,
                    _refRecId: opportunity.RefRecId,
                    _dataAreaId: diagnostic.dataAreaId,
                    _idOrigin: diagnostic.SRF_HSEIdDiagnostic,
                    _detectionDate: moment(diagnostic.ExecutionDate).add(
                      5,
                      "hours"
                    ),
                    _state: 0,
                    _hcmEmploymentType: 0,
                    _origin: 1,
                    _tableID: 17070,
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
                    throw new Error(
                      error.response.data.error.innererror.message
                    );
                  } else if (error.request) {
                    throw new Error(error.request);
                  } else {
                    throw new Error("Error", error.message);
                  }
                });
              _improvementOpportunities.push({
                SRF_HSEIdImprovementOpportunities: opportunityResponse.data,
                Description: opportunity.Description,
                RefRecId: opportunity.RefRecId,
              });
              break;
            }
          }
        }

        const __diagnosticLine = await axios
          .patch(
            `${tenant}/data/SRF_HSEDiagnosticLine(dataAreaId='${diagnostic.dataAreaId}',SRF_HSEIdDiagnostic='${diagnostic.SRF_HSEIdDiagnostic}',RecId1=${line.RecId1},Line=${line.Line})?cross-company=true`,
            {
              ...line,
              RecId1: undefined,
              SRF_HSEIdImprovementOpportunities:
                line.SRF_HSEIdImprovementOpportunities.length === 0 &&
                opportunityResponse.data &&
                opportunityResponse.data.length > 0
                  ? opportunityResponse.data
                  : line.SRF_HSEIdImprovementOpportunities,
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
            } else if (
              error.response &&
              error.response.data &&
              error.response.data.Message
            ) {
              throw new Error(error.response.data.Message);
            } else {
              throw new Error("Error", error.message);
            }
          });
        _diagnosticLine.push(
          __diagnosticLine && __diagnosticLine.data === ""
            ? "Modified"
            : "Unchanged"
        );
      }
    }

    let _evidences = [];

    if (evidences) {
      const blobServiceClient = BlobServiceClient.fromConnectionString(
        process.env.BLOBSTORAGECONNECTIONSTRING
      );

      const containerClient = blobServiceClient.getContainerClient(
        process.env.BLOBSTORAGEDIAGNOSTICPATH
      );

      for (let i = 0; i < evidences.length; i++) {
        const element = evidences[i];

        if (element.imagePath.length > 0) {
          const path = JSON.parse(element.imagePath).toString();

          const matches = path.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);

          const buffer = new Buffer.from(matches[2], "base64");

          const imageType = matches[1];

          const name =
            element.refRecId +
            moment().format().toString() +
            "hseqdiagnosticimage." +
            imageType.split("/")[1];

          const blockBlobClient = containerClient.getBlockBlobClient(name);

          const responseImage = await blockBlobClient.upload(
            buffer,
            buffer.byteLength
          );

          const imageRequest = {
            _DataareaId: diagnostic.dataAreaId,
            _AccesInformation: `${process.env.BLOBSTORAGEURL}/${process.env.BLOBSTORAGEDIAGNOSTICPATH}/${name}`,
            _name: name,
            _TableId: 17070,
            _RefRecId: element.refRecId,
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
              RefRecId: element.refRecId,
              OriginalFileName: name,
            });
          }
        }
      }
    }

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
                ] === "Edit Diagnostic" ||
                  item[
                    "cr5be_notificationevent@OData.Community.Display.V1.FormattedValue"
                  ] === "All Events") &&
                (item[
                  "cr5be_notificationcompany@OData.Community.Display.V1.FormattedValue"
                ] === diagnostic.dataAreaId ||
                  item[
                    "cr5be_notificationcompany@OData.Community.Display.V1.FormattedValue"
                  ] === "All Companies") &&
                item["statecode@OData.Community.Display.V1.FormattedValue"] ===
                  "Active"
              ) {
                return true;
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

            const emailMessage = `<div><p>Señores</p><p>Cordial saludo;</p><p>Nos permitimos notificarles que la inspección ${diagnostic.SRF_HSEIdDiagnostic} de tipo ${email.TipoDiagnostico}, ha sido ejecutada exitosamente por ${email.Responsable} en ${email.Company}.</p><p>Gracias</p></div>`;

            const teamsMessage = `<div><p>Inspección ejecutada</p><p>Nos permitimos notificarles que la inspección ${diagnostic.SRF_HSEIdDiagnostic} de tipo ${email.TipoDiagnostico}, ha sido ejecutada exitosamente por ${email.Responsable} en ${email.Company}.</p></div>`;

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
                  subject: `Inspección ejecutada - ${diagnostic.SRF_HSEIdDiagnostic} ${email.Company}`,
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
      _diagnostic,
      _diagnosticLine,
      _improvementOpportunities,
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
