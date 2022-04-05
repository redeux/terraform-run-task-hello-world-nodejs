# terraform-run-task-hello-world-nodejs
A Terraform Cloud Run Task Hello World in Node.js

This is a basic implementation of a Terraform Cloud Run Task in Node.js. Run easily with [NGROK](https://ngrok.com/) or in [Heroku](https://www.heroku.com/).

## Getting Started Locally
Make sure you have Node.js v16.x and NPM v8.6. You can find the Node.js and NPM installation instructions [here](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm).

```
node -v
npm -v
```

Install the Run Task server dependencies
```
npm install
```

Start the Run Task server
```
npm start
```
NOTE: By default, the service will start using port `3000` and using an HMAC key of `abc123`. These can be set using the environment variables `PORT` and `HMAC_KEY` respectively.

Start NGROK using the port you specified
```bash
ngrok http $PORT
```
