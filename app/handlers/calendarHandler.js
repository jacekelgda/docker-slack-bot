import fs from 'fs'
import readline from 'readline'
import google from 'googleapis'
import googleAuth from 'google-auth-library'

const SCOPES = ['https://www.googleapis.com/auth/calendar.readonly']
const TOKEN_DIR = (process.env.HOME || process.env.HOMEPATH ||
    process.env.USERPROFILE) + '/.credentials/'
const TOKEN_PATH = TOKEN_DIR + 'daily-planner-app.json'

const checkAuth = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        console.log('No token!')
        reject(err)
      } else {
        console.log('ALL ok')
        resolve('OK')
      }
    })
  })
}

const generateAuthUrl = () => {
  return new Promise((resolve, reject) => {
    const oauth2Client = getOauthClient()
    const authUrl = oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: SCOPES
    });

    resolve(authUrl)
  })
}

const getOauthClient = () => {
  const clientSecret = process.env.google_api_client_secret
  const clientId = process.env.google_api_client_id
  const redirectUrl = process.env.google_api_redirect_url
  const auth = new googleAuth()
  return new auth.OAuth2(clientId, clientSecret, redirectUrl)
}

const authorize = (callback) => {
  return new Promise((resolve, reject) => {
    const oauth2Client = getOauthClient()

    fs.readFile(TOKEN_PATH, function(err, token) {
      if (err) {
        getNewToken(oauth2Client).then((token) => {
          resolve(token)
        })
      } else {
        oauth2Client.credentials = JSON.parse(token)
        resolve(oauth2Client)
      }
    })
  })
}

const exchangeCodeToToken = (code) => {
  return new Promise((resolve, reject) => {
    const oauth2Client = getOauthClient()
    oauth2Client.getToken(code, (err, token) => {
      if (err) {
        reject(err)
      }
      oauth2Client.credentials = token
      storeToken(token)
      resolve(oauth2Client)
    })
  })
}

const getNewToken = (oauth2Client, callback) => {
  const authUrl = oauth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES
  });
  console.log('Authorize this app by visiting this url: ', authUrl)
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  })
  return new Promise((resolve, reject) => {
    rl.question('Enter the code from that page here: ', function(code) {
      rl.close()
      oauth2Client.getToken(code, function(err, token) {
        if (err) {
          console.log('Error while trying to retrieve access token', err)
          return
        }
        oauth2Client.credentials = token
        storeToken(token)
        resolve(oauth2Client)
      })
    })
  })
}

const storeToken = (token) => {
  try {
    fs.mkdirSync(TOKEN_DIR)
  } catch (err) {
    if (err.code != 'EEXIST') {
      throw err
    }
  }
  fs.writeFile(TOKEN_PATH, JSON.stringify(token))
  console.log('Token stored to ' + TOKEN_PATH)
}

const listEvents = (auth) => {
  console.log(auth)
  const calendar = google.calendar('v3')
  let timeMin = new Date()
  timeMin.setHours(0,0,0,0)
  let timeMax = new Date()
  timeMax.setHours(23,59,59,999)
  return new Promise((resolve, reject) => {
    calendar.events.list({
      auth: auth,
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime'
    }, function(err, response) {
      if (err) {
        console.log('Google Calendar API error: ' + err)
        return
      }
      var events = response.items
      resolve(events)
    })
  })
}

export {
  authorize,
  listEvents,
  checkAuth,
  generateAuthUrl,
  exchangeCodeToToken
}
