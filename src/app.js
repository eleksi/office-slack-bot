const Botkit = require('botkit');
const Config = require('./configuration');
const myBot = require('./bot');

const controller = Botkit.slackbot({
  debug: false
});

const botInstance = controller.spawn({
  token: Config.botToken
});

function start_rtm() {
  botInstance.startRTM(function(err, bot, payload) {
    if (err) {
      console.log('Failed to start RTM');
      return setTimeout(start_rtm, 60000);
    }
    console.log('RTM started!');
  });
}

start_rtm();

const userConfig = {
  user: Config.slackAdminUserId
};

controller.on(['direct_message', 'direct_mention'], (bot, message) => {
  bot.api.users.info({ user: message.user }, (error, response) => {
    if (Config.allowGuestsToUse || (!response.user.is_restricted && !response.user.is_ultra_restricted)) {
      const caller = { name: response.user.real_name, email: response.user.profile.email, channel: message.channel };
      myBot.handle(message.text, caller).then(resp => {
        if (!resp) return;

        if (resp.channel) bot.say({ text: resp.text, channel: resp.channel });
        else if (resp.confirm) handleConfirmConversation(bot, message.user, resp);
        else bot.replyInThread(message, resp);
      });
    } else {
      bot.replyInThread(message, 'No rights to chat with Bot');
    }
  });
});

controller.hears(['.'], ['ambient'], async (bot, msg) => {
  const response = await myBot.translate(msg.channel, msg.text);
  if (response) {
    bot.replyInThread(msg, response);
  }
});

const handleConfirmConversation = (bot, user, confirmResponse) => {
  bot.startPrivateConversation({ user }, (err, convo) => {
    convo.ask(confirmResponse.text, [
      {
        pattern: 'yes',
        callback: (response, conv) => {
          confirmResponse.action().then(result => {
            conv.say(result);
            conv.next();
          });
        }
      },
      {
        pattern: 'no',
        callback: (response, conv) => {
          conv.say('Ok, rejected');
          conv.next();
        }
      },
      {
        default: true,
        callback: (response, conv) => {
          conv.repeat();
          conv.next();
        }
      }
    ]);
  });
};

controller.on('rtm_close', () => {
  start_rtm();
});

myBot.setNotifyFunc(output => {
  botInstance.startPrivateConversation(userConfig, (err, conversation) => {
    conversation.say(output);
  });
});

process.on('uncaughtException', exception => {
  console.log(exception);
  botInstance.startPrivateConversation(userConfig, (err, conversation) => {
    conversation.say(exception.stack);
    // Wait before exit so bot has time to send the last message
    setTimeout(() => process.exit(), 5000);
  });
});

process.on('unhandledRejection', (reason, p) => {
  console.log('Unhandled Rejection at: Promise', p, 'reason:', reason);
  botInstance.startPrivateConversation(userConfig, (err, conversation) => {
    conversation.say(`Unhandled Rejection at Promise ${reason.message}`);
  });
});
