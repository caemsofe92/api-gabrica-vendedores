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
        const refresh = req.query.refresh || (req.body && req.body.refresh);
        const environment =
            req.query.environment || (req.body && req.body.environment);
        const testMode = req.query.testMode || (req.body && req.body.testMode);
        const userEmail = req.query.userEmail || (req.body && req.body.userEmail);

        const customer = req.query.customer || (req.body && req.body.customer);

        if (!tenantUrl || tenantUrl.length === 0)
            throw new Error("tenantUrl is Mandatory");

        if (!clientId || clientId.length === 0)
            throw new Error("clientId is Mandatory");

        if (!clientSecret || clientSecret.length === 0)
            throw new Error("clientSecret is Mandatory");

        if (!tenant || tenant.length === 0) throw new Error("tenant is Mandatory");

        if (!entity || entity.length === 0) throw new Error("entity is Mandatory");

        if (!environment || environment.length === 0)
            throw new Error("environment is Mandatory");

        if (!userEmail || userEmail.length === 0)
            throw new Error("userEmail is Mandatory");

        if (!customer || customer.length === 0)
            throw new Error("customer is Mandatory");

        if (!client.isOpen) client.connect();

        if (!refresh) {
            const mainReply = await client.get(entity + userEmail);
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

        const selectEntity1Fields = "&$select=SalesOrderNumber,dataAreaId,DefaultShippingWarehouseId,DefaultShippingSiteId,OrderingCustomerAccountNumber,CurrencyCode,DeliveryAddressDescription,DeliveryAddressCountryRegionId";
        const Entity1 = axios.get(
            `${tenant}/data/SalesOrderHeadersV2?$format=application/json;odata.metadata=none&cross-company=true&$count=true&$filter=OrderingCustomerAccountNumber eq '${customer}'${selectEntity1Fields}${testMode ? "&$top=5" : ""}`,
            { headers: { Authorization: "Bearer " + token } }
        );

        const selectEntity2Fields = "&$select=SalesOrderNumber,SalesUnitSymbol,OrderedInventoryStatusId,ShippingSiteId,DeliveryAddressLocationId,DeliveryTermsId,LineDescription,ShippingWarehouseId,OrderedSalesQuantity,LineAmount,SalesPriceQuantity,SalesPrice,ProductName,DeliveryAddressStreet,DeliveryAddressCountryRegionId,DeliveryAddressDescription,ProductNumber,SalesProductCategoryHierarchyName,SalesProductCategoryName,SalesOrderNumberHeader,CurrencyCode";

        await axios
            .all([Entity1])
            .then(
                axios.spread(async (...responses) => {

                    const SalesOrderHeaders = responses[0].data.value;
                    const SalesOrdersCount = responses[0].data["@odata.count"];
                    
                    let SalesOrderLinesGet = [];

                    for (let i = 0; i < SalesOrderHeaders.length; i++) {
                        const SalesOrderLinesItem = axios.get(
                            `${tenant}/data/CDSSalesOrderLinesV2?$format=application/json;odata.metadata=none&cross-company=true&$filter=SalesOrderNumber eq '${SalesOrderHeaders[i].SalesOrderNumber}'${selectEntity2Fields}`,
                            { headers: { Authorization: "Bearer " + token } }
                        );

                        SalesOrderLinesGet.push(
                            SalesOrderLinesItem
                        );
                    }

                    await axios
                        .all(SalesOrderLinesGet)
                        .then(
                            axios.spread(async (...responses2) => {
                                let SalesOrdersLines = [];
                                for (let i = 0; i < responses2.length; i++) {
                                    const element = responses2[i];
                                    element.data.value.map((item2) =>
                                        SalesOrdersLines.push(item2)
                                    );
                                }

                                const salesOrdersReply = {
                                    SalesOrders: SalesOrderHeaders,
                                    SalesOrdersCount,
                                    SalesOrdersLines,
                                    SalesOrdersLinesCount: SalesOrdersLines.length
                                };

                                await client.set(
                                    entity + userEmail,
                                    JSON.stringify(salesOrdersReply),
                                    {
                                        EX: 84600,
                                    }
                                );

                                return res.json({
                                    result: true,
                                    message: "OK",
                                    response: salesOrdersReply,
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
