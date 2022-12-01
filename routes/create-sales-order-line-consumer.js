let express = require("express");
let router = express.Router();
const axios = require("axios");
const client = require("../bin/redis-client");
const amqp = require("amqplib");

const rabbitSettings = {
  protocol: "amqp",
  hostname: process.env.RABBIT_HOSTNAME,
  port: process.env.RABBIT_PORT,
  username: process.env.RABBIT_USERNAME,
  password: process.env.RABBIT_PASSWORD,
  authMechanism: ["PLAIN", "AMQPLAIN", "EXTERNAL"],
  vhost: "/",
};

connect();

async function connect() {
  try {
    const conn = await amqp.connect(rabbitSettings);
    const channel = await conn.createChannel();
    channel.consume("SalesOrderLines", async (msg) => {
      const body = JSON.parse(msg.content.toString());

      channel.ack(msg);

      const tenantUrl = body && body.tenantUrl;
      const clientId = body && body.clientId;
      const clientSecret = body && body.clientSecret;
      const tenant = body && body.tenant;
      const environment = body && body.environment;
      const salesOrder = body && body.salesOrder;
      const salesOrderLine = body && body.salesOrderLine;
      const salesOrderLineIndex = body && body.salesOrderLineIndex;
      const salesOrderLineLength = body && body.salesOrderLineLength;

      if(salesOrderLine.SalesPrice === null){
        salesOrderLine.SalesPrice = 0;
      }

      if (!client.isOpen) client.connect();

      let token = await client.get(environment);

      if (!token) {
        const tokenResponse = await axios
          .post(
            `https://login.microsoftonline.com/${tenantUrl}/oauth2/token`,
            `grant_type=client_credentials&client_id=${clientId}&client_secret=${clientSecret}&resource=${tenant}/`,
            { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
          )
          .catch(async function (error) {
            await channel.assertQueue("SalesOrderTokenErrors");
            if (
              error.response &&
              error.response.data &&
              error.response.data.error &&
              error.response.data.error.innererror &&
              error.response.data.error.innererror.message
            ) {
              await channel.sendToQueue("SalesOrderTokenErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error.response.data.error.innererror
              })));
              throw new Error(error.response.data.error.innererror.message);
            } else if (error.request) {
              await channel.sendToQueue("SalesOrderTokenErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error
              })));
              throw new Error(error.request);
            } else {
              await channel.sendToQueue("SalesOrderTokenErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error
              })));
              throw new Error("Error", error.message);
            }
          });
        token = tokenResponse.data.access_token;
        await client.set(environment, tokenResponse.data.access_token, {
          EX: 3599,
        });
      }
     
      await axios
      .post(
        `${tenant}/data/CDSSalesOrderLinesV2?cross-company=true`,
        {
          SalesOrderNumber: salesOrder.SalesOrderNumber,
          SalesOrderNumberHeader: salesOrder.SalesOrderNumber,
          dataAreaId: salesOrder.dataAreaId,
          ...salesOrderLine,
          OrderedSalesQuantity: salesOrderLine.OrderedSalesQuantity ? salesOrderLine.OrderedSalesQuantity : 0
        },
        { headers: { Authorization: "Bearer " + token } }
      )
      .catch(async function (error) {
        await channel.assertQueue("SalesOrderLinesErrors");
        if (
          error.response &&
          error.response.data &&
          error.response.data.error &&
          error.response.data.error.innererror &&
          error.response.data.error.innererror.message
        ) {
          await channel.sendToQueue("SalesOrderLinesErrors", Buffer.from(JSON.stringify({
            body: body,
            error: error.response.data.error.innererror
          })));
          throw new Error(error.response.data.error.innererror.message);
        } else if (error.request) {
          await channel.sendToQueue("SalesOrderLinesErrors", Buffer.from(JSON.stringify({
            body: body,
            error: error
          })));
          throw new Error(error.request);
        } else {
          await channel.sendToQueue("SalesOrderLinesErrors", Buffer.from(JSON.stringify({
            body: body,
            error: error
          })));
          throw new Error("Error", error.message);
        }
      });

      let _salesOrder;

      if (salesOrder && salesOrderLineIndex === salesOrderLineLength) {
        //Entidad Extendida
        await axios
          .post(
            `${tenant}/api/services/GAB_SalesOrderConfirmationSG/GAB_SalesOrderConfirmationService/confirmSO`,
            {
              _salesId: salesOrder.SalesOrderNumber,
              _dataAreaId: salesOrder.dataAreaId,
            },
            {
              headers: { Authorization: "Bearer " + token },
            }
          )
          .catch(async function (error) {
            await channel.assertQueue("SalesOrderTableErrors");
            if (
              error.response &&
              error.response.data &&
              error.response.data.error &&
              error.response.data.error.innererror &&
              error.response.data.error.innererror.message
            ) {
              await channel.sendToQueue("SalesOrderTableErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error.response.data.error.innererror
              })));
              throw new Error(error.response.data.error.innererror.message);
            } else if (error.request) {
              await channel.sendToQueue("SalesOrderTableErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error
              })));
              throw new Error(error.request);
            } else {
              await channel.sendToQueue("SalesOrderTableErrors", Buffer.from(JSON.stringify({
                body: body,
                error: error
              })));
              throw new Error("Error", error.message);
            }
          });
      }
    });
   
  } catch (error) {
    const conn = await amqp.connect(rabbitSettings);
    const channel = await conn.createChannel();
    
    await channel.assertQueue("SalesOrderLinesErrors");
    await channel.sendToQueue("SalesOrderLinesErrors", Buffer.from(JSON.stringify({
      body: body,
      error: error.message
    })));
  }
}

module.exports = connect;
