import Botkit from 'botkit'
import * as formatter from '../util/formatter'
import * as storageHandler from '../handlers/storageHandler'

if (!process.env.slack_bot_token) {
    console.log('Error: Specify token in environment')
    process.exit(1)
}
const listener = Botkit.slackbot({
    debug: false,
    stats_optout: false
});

const bot = listener.spawn({
    token: process.env.slack_bot_token
}).startRTM()

const user = {user:process.env.slack_user}

const startPrivateConversation = (id) => {
  return new Promise((resolve, reject) => {
    bot.startPrivateConversation(user, (err, convo) => {
      if (err) {
        reject(err)
      }
      convo.ask('Whats your plan for today? [' + id + ']', (message, convo) => {
        resolve(message)
        convo.next()
      })
    })
  })
}

const sendInteractiveMessageAsNewConversation = (list, listId) => {
  bot.startPrivateConversation(user, (err, convo) => {
    askWithInteractiveMessage(list, listId, convo);
  })
}

const askWithInteractiveMessage = (list, listId, convo) => {
  const todoList = formatter.generateList(list)
  convo.ask({
    attachments:[
      {
        title: 'Do you want to publish this list to your journal?',
        text: formatter.formatListToSlackText(todoList),
        callback_id: listId,
        attachment_type: 'default',
        actions: [
          {
            "name":"yes",
            "text": "Yes",
            "value": 1,
            "type": "button",
          },
          {
            "name":"no",
            "text": "No",
            "value": 0,
            "type": "button",
          }
        ]
      }
    ]
  })
}

const sendGeneratedListForApproval = (list, listId, convo) => {
  if (convo) {
    askWithInteractiveMessage(list, listId, convo);
  } else {
    sendInteractiveMessageAsNewConversation(list, listId);
  }
}

const sendMessageToJournal = (callback_id, text) => {
  bot.api.chat.postMessage({
    token: process.env.slack_api_token,
    channel: process.env.slack_test_channel,
    text: formatter.formatJournalListText(text),
    as_user: true
  }, (err,response) => {
    storageHandler.persistJournalMessageDetails(callback_id, response.ts, response.channel)
  })
}

const updateMessageInJournal = (ts, text, channel) => {
  bot.api.chat.update({
    token: process.env.slack_api_token,
    ts: ts,
    channel: channel,
    text: formatter.formatJournalListText(text),
    as_user: true
  }, (err,response) => {
    console.log('update message response', response)
  })
}

export {
  listener,
  startPrivateConversation,
  sendInteractiveMessageAsNewConversation,
  sendGeneratedListForApproval,
  sendMessageToJournal,
  updateMessageInJournal
}
