let express = require("express");
let router = express.Router();
const amqp = require('amqplib');

const rabbitSettings = {
    protocol: 'amqp',
    hostname: '20.242.102.13',
    port: 5672,
    username: 'gabricauser',
    password: 'SrfConsultores2020***',
    authMechanism: ['PLAIN','AMQPLAIN','EXTERNAL'],
    vhost: '/'
};

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
    const salesOrderLine =
      req.query.salesOrderLine || (req.body && req.body.salesOrderLine);

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

    if (!salesOrderLine || salesOrderLine.length === 0)
    throw new Error("salesOrderLine is Mandatory");

    const conn = await amqp.connect(rabbitSettings);
    const channel = await conn.createChannel();
    await channel.assertQueue("SalesOrders");
    await channel.sendToQueue("SalesOrders", Buffer.from(JSON.stringify(req.body)));

    return res.json({
      result: true,
      message: "OK",
      _salesOrder:"Proceso completado",
      _salesOrderLine:[],
    });
    
  } catch (error) {
    return res.status(500).json({
      result: false,
      message: error.toString(),
    });
  }
});

module.exports = router;
