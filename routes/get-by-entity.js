let express = require("express");
let router = express.Router();
const client = require("../bin/redis-client");
const axios = require("axios");
const { filter } = require("bluebird");

router.post("/", async (req, res) => {
    try {
        const tenantUrl = req.query.tenantUrl || (req.body && req.body.tenantUrl);
        const clientId = req.query.clientId || (req.body && req.body.clientId);
        const clientSecret =
            req.query.clientSecret || (req.body && req.body.clientSecret);
        const tenant = req.query.tenant || (req.body && req.body.tenant);
        const entity = req.query.entity || (req.body && req.body.entity);
        const refresh = req.query.refresh || (req.body && req.body.refresh);
        const userEmail = req.query.userEmail || (req.body && req.body.userEmail);
        const testMode = req.query.testMode || (req.body && req.body.testMode);
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
            const data = await client.get(entity + userEmail);
            if (data)
                return res.json({
                    result: true,
                    message: "OK",
                    response: JSON.parse(data),
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
        
        const filters = req.query.filters || (req.body && req.body.filters) ? req.body.filters : {};
        const filterItems = Object.keys(filters);
        const filterDetail = [];
        if (filterItems.length > 0)
            for (let i = 0; i < filterItems.length; i++)
                if (filters.hasOwnProperty(filterItems[i]))
                    filterDetail.push(filterItems[i] + ' ' + filters[filterItems[i]]);
        const filterDetailString = filterDetail.length > 0 ? '&$filter=' + filterDetail.join(' and ') : '';

        const fieldsList = req.query.fields || (req.body && req.body.fields);
        const fields = fieldsList !== null && fieldsList !== undefined ? '&$select=' + fieldsList.toString() : '';

        let urlRequest = `${tenant}/data/${entity}?$format=application/json;odata.metadata=none&cross-company=true&${fields}${testMode ? "$top=5" : ""}&$count=true`;
        axios.get(
            urlRequest,
            { headers: { Authorization: "Bearer " + token } }
        ).then(response => {
            const data = {
                entity,
                filters,
                filterDetailString,
                fields: fieldsList,
                count: response.data["@odata.count"],
                data: response.data.value
            };

            client.set(entity + userEmail, JSON.stringify(data), {
                EX: 3599,
            });

            return res.json({ result: true, message: "OK", response: data });
        }).catch(e => {
            return res.status(500).json({
                result: false,
                message: e.toString(),
            });
        });




    } catch (error) {
        return res.status(500).json({
            result: false,
            message: error.toString(),
        });
    }
});

module.exports = router;
