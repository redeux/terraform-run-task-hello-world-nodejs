import express from "express"
import fetch from "node-fetch"
import {
    createHmac
} from "crypto"

const app = express()
const port = process.env.PORT || 3000

// Configure Express middleware to parse the JSON body and validate the HMAC
app.use(express.json(), validateHmac)

app.post('/', async (req, res) => {
    // console.log(`Run Task payload\n${JSON.stringify(req.body, null, 2)}`)

    // Send a 200 to tell Terraform Cloud that we recevied the Run Task
    // Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#run-task-request
    res.sendStatus(200)

    // When a user adds a new Run Task to their Terraform Cloud organization, Terraform Cloud will attempt to 
    // validate the Run Task address and HMAC by sending a payload with dummy data. This condition will have to be accounted for.
    if (req.body.access_token !== "test-token") {
        // Do some processing on the Run Task request
        // Schema Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#request-body
        const {
            plan_json_api_url,
            access_token,
            organization_name,
            workspace_id,
            run_id,
            task_result_callback_url
        } = req.body
        const planJson = await getPlan(plan_json_api_url, access_token)
        console.log(`Plan ouput for ${organization_name}/${workspace_id}/${run_id}\n${JSON.stringify(planJson, null, 2)}`)

        // Send the results back to Terraform Cloud
        await sendCallback(task_result_callback_url, access_token, 'passed', 'Hello World', 'http://example.com/runtask/QxZyl')
    }
})

async function validateHmac(req, res, next) {
    const hmacKey = process.env.HMAC_KEY || 'abc123'
    const computedHmac = createHmac('sha512', hmacKey).update(JSON.stringify(req.body)).digest('hex')
    const remoteHmac = await req.get('x-tfc-task-signature')
    // If the HMAC validation fails, log the error and send an HTTP Status Code 401, Unauthorized
    // Currently undocumented but 401 is the expected response for an invalid HMAC
    if (computedHmac !== remoteHmac) {
        console.log(`HMAC validation failed. 
        Expected ${remoteHmac} 
        Computed ${computedHmac}`)
        return res.sendStatus(401)
    }
    next()
}

async function sendCallback(callbackUrl, accessToken, status, message, url) {
    // Format the payload for the callback
    // Schema Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#request-body-1
    const data = JSON.stringify({
        "data": {
            "type": "task-results",
            "attributes": {
                status,
                message,
                url,
            }
        }
    })

    const options = {
        method: 'PATCH',
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'Authorization': 'Bearer ' + accessToken
        },
        body: data
    }

    await fetch(callbackUrl, options)
}

async function getPlan(url, accessToken) {
    const options = {
        method: 'GET',
        headers: {
            'Authorization': 'Bearer ' + accessToken
        }
    }

    // The first URL returns a 307 Temporary Redirect with the address of the JSON formatted Terraform Plan
    // Documentation - https://www.terraform.io/cloud-docs/api-docs/plans#retrieve-the-json-execution-plan
    // The fetch API follows the redirect by default
    const plan = await fetch(url, options)
    return plan.json()

}

app.listen(port, () => {
    console.log(`Terraform Run Task Hello World app listening on port ${port}`)
})