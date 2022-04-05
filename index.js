const express = require('express')
const https = require('https')
const {
    createHmac,
} = require('crypto')

const app = express()
const port = process.env.PORT || 3000

// Configure Express middleware to parse the JSON body and validate the HMAC
app.use(express.json(), validateHmac)

app.post('/', (req, res) => {
    // Send a 200 to tell Terraform Cloud that we recevied the Run Task
    // Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#run-task-request
    res.sendStatus(200)

    // Do some processing on the Run Task request
    // Schema Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#request-body

    // When a user adds a new Run Task to their Terraform Cloud organization, Terraform Cloud will attempt to 
    // validate the Run Task address by sending a payload with dummy data. This condition will have to be accounted for.
    console.log(`Run Task payload\n${JSON.stringify(req.body, null, 2)}`)

    // Send the results back to Terraform Cloud
    return sendCallback(req.body.task_result_callback_url, req.body.access_token, 'passed', "Hello World", "http://example.com/runtask/QxZyl")
})

function validateHmac(req, res, next) {
    const hmacKey = process.env.HMAC_KEY || 'abc123'
    const computedHmac = createHmac('sha512', hmacKey).update(JSON.stringify(req.body)).digest('hex')
    const remoteHmac = req.get('x-tfc-task-signature')
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

function sendCallback(callbackUrl, accessToken, status, message, url) {
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

    // Parse the URL and options for the callback
    callbackUrl = new URL(callbackUrl)
    const options = {
        hostname: callbackUrl.hostname,
        port: 443,
        path: callbackUrl.pathname,
        method: 'PATCH',
        // Documentation - https://www.terraform.io/cloud-docs/api-docs/run-tasks-integration#request-headers-1
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'Authorization': 'Bearer ' + accessToken
        }
    }

    // Send the callback
    const req = https.request(options, res => {
        console.log(`Callback statusCode: ${res.statusCode}`)

        res.on('data', d => {
            process.stdout.write(d)
        })
    })

    req.on('error', error => {
        console.error(error)
    })

    req.write(data)
    req.end()
}

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})