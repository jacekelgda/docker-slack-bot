import express from 'express'
import * as calendarHandler from '../handlers/calendarHandler'

const router = new express.Router()

router.post('/auth', async function (req, res) {
  const googleAuthCode = req.body.code
  try {
    const googleOauthClient = await calendarHandler.exchangeCodeToToken(googleAuthCode)
    res.send('Thanks!')
  } catch (e) {
    console.log('Google auth error', e)
    res.send('Sorry, there was an error')
  }
})

export default router
