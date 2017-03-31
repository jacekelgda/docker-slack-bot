import * as chatHandler from './handlers/chatHandler'
import * as storageHandler from './handlers/storageHandler'
import * as calendarHandler from './handlers/calendarHandler'
import * as formatter from './util/formatter'
import * as textInterpreter from './util/textInterpreter'
import router from './controllers'

import bodyParser from 'body-parser'
import localtunnel from 'localtunnel'
import express from 'express'

const app = express()

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())
app.use('/api', router);

chatHandler.listener.on('direct_message', async function(bot, message) {
  const currentListId = await storageHandler.getCurrentListId()
  const updatedList = await storageHandler.persistTasksFromMessageToList(currentListId, message)
  const currentListTasks = await storageHandler.fetchCurrentList()

  chatHandler.sendGeneratedListForApproval(currentListTasks, currentListId)
})

chatHandler.listener.on('ambient', (bot, message) => {
  const task = textInterpreter.lookForCompletedTask(message.text)
  if (task !== null) {
    checkDoneTask(task)
  }
})

async function startPlanningNewDay() {
  const listId = Date.now()

  const auth = await calendarHandler.authorize()
  const calendarEvents = await calendarHandler.listEvents(auth)
  const responseMessage = await chatHandler.startPrivateConversation(listId)

  const events = formatter.processCalendarEvents(calendarEvents)
  const tasks = formatter.processMessage(responseMessage)

  const newList = await storageHandler.createNewTasksList(listId, events.concat(tasks))
  const currentList = await storageHandler.fetchList(listId)

  chatHandler.sendInteractiveMessageAsNewConversation(currentList, listId)
}

async function checkDoneTask(task) {
  let currentListTasks = await storageHandler.fetchCurrentList()
  currentListTasks.forEach(async function(item, index) {
    if (item.name == task) {
      const currentListId = await storageHandler.getCurrentListId()
      item.achieved = true
      storageHandler.markTaskAchieved(currentListId, index, item)
      currentListTasks = await storageHandler.fetchCurrentList()
      let list = formatter.generateList(currentListTasks)
      list = formatter.formatListToSlackText(list)
      let listMeta = await storageHandler.getListMetadata(currentListId)
      if (listMeta.ts && listMeta.channel) {
        chatHandler.updateMessageInJournal(listMeta.ts, list, listMeta.channel)
      }
    }
  })
}

//startPlanningNewDay()

var port = process.env.PORT || 3000
app.listen(port)

app.get('/', async function (req, res) {
  try {
    const isAuthorized = await calendarHandler.checkAuth()
    res.send('All good!')
  } catch (e) {
    const authUrl = await calendarHandler.generateAuthUrl()
    const html = `<a href="${authUrl}">Authenticate application with google api</a>
    <form action="/api/auth" method="post">
       Enter code:
       <input type="text" name="code" placeholder="Code ..." />
       <br>
       <button type="submit">Submit</button>
    </form>`
    res.send(html)
  }
})

// if (!process.env.is_prod) {
//   const opts = { subdomain:process.env.localtunnel_subdomain }
//   const tunnel = localtunnel(port, opts, (err, tunnel) => {
//       console.log('localtunnel url:', tunnel.url)
//   })
// }
