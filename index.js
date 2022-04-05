const express = require('express')
const https = require('https')
const {
    createHmac,
} = require('crypto')

const app = express()
const port = 3000

// Configure Express middleware to parse the JSON body and validate the HMAC
app.use(express.json(), validateHmac)

app.post('/', (req, res) => {
    // Send a 200 to tell Terraform Cloud that we recevied the Run Task
    res.sendStatus(200)

    // Do some processing on the Run Task request
    console.log(`Run Task payload = ${JSON.stringify(req.body, null, 2)}`)

    // Send the results back to Terraform Cloud
    return sendCallback(req.body.task_result_callback_url, req.body.access_token, 'passed', "Hello World")
})

function validateHmac(req, res, next) {
    const hmacKey = 'abc123'
    const hmac = createHmac('sha512', hmacKey)
    hmac.update(JSON.stringify(req.body))
    const computedHmac = hmac.digest('hex')
    const remoteHmac = req.get('x-tfc-task-signature')
    // If the HMAC validation fails, log the error and send an HTTP Status Code 401, Unauthorized
    if (computedHmac !== remoteHmac) {
        console.log(`HMAC validation failed. 
        Expected ${remoteHmac} 
        Computed ${computedHmac}`)
        return res.sendStatus(401)
    }
    next()
}

function sendCallback(callbackUrl, accessToken, status, msg) {
    // Format the payload for the callback
    const data = JSON.stringify({
        "data": {
            "type": "task-results",
            "attributes": {
                "status": status,
                "message": msg,
                "url": "http://my.supercool.com/runtask"
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
        headers: {
            'Content-Type': 'application/vnd.api+json',
            'Content-Length': data.length,
            'Authorization': 'Bearer ' + accessToken
        }
    }

    // Send the callback
    const req = https.request(options, res => {
        console.log(`statusCode: ${res.statusCode}`)

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