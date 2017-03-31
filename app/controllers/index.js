import express from 'express'
import interactiveMessagesController from './interactiveMessagesController'
import authController from './authController'

const router = new express.Router()

router.use(interactiveMessagesController)
router.use(authController)

export default router
