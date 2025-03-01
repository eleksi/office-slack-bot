Slack Bot
------------------------------

Slack bot for office use.

 * Send a message anonymously
 * Is there anyone at the office
 * Office temperature
 * List free meeting rooms
 * List next meeting room reservations
 * Book a meeting room
 * Cancel a booking made with the SlackBot
 * Suggest a lunch place
 * Suggest a beer place
 * Send an email to a predefined address
 * Show current bitcoin price
 * Show current channel user activity statistics
 * Automatically translate conversation to selected language
 * WebScraping

## Get Started

1) Create new configuration file (_src/configuration.js_)
    * Copy template from configuration file [section](https://github.com/eleksi/office-slack-bot#configuration-file)
1) Create a new App for your Slack workspace
    * Add App's token to configuration's `botToken`
1) Run bot e.g. with [forever](https://github.com/foreverjs/forever), supervisord etc.
    * `$ forever start src/app.js`

## Functionality

Bot sends a reply to the channel or to private chat where the command was sent from.

Sends exceptions and errors to the user defined in the configuration file (`slackAdminUserId`).

#### Anonymous message

Anonyous messages are sent to the home channel defined in the configuration file (`homeChannelId`)

![Anonymous message](docs/anon.jpg "Anonymous message")

#### Anyone at the office

Returns _Office has people_ or _Office is empty_ message, depending if there is currently people at the office.

`GET /api/haspeople/{id}` from [Sensordata API](https://github.com/ttu/sensordata-node-restapi) for all sensors in the configuration file. If any of the requests return true, then there is someone at the office.

#### Get Temperture

Returns lates sensors data for all sensors defined in the configuration file.

`GET /api/data/{id}` from [Sensordata API](https://github.com/ttu/sensordata-node-restapi).

```
{"name":"5krs","temperature":21.25,"humidity":23,"noise":47,"light":124,"time":"11:47 19.01."}
{"name":"6krs","temperature":22.64,"humidity":23,"noise":45,"light":571,"time":"11:47 19.01."}
``` 

#### Free meeting rooms, current events & book a room

Free meeting rooms shows a list of rooms that are free and duration how long they are available. Current events shows a list of next 2 events for each calendar defined in the configuration file. It will hide info from private events. Book a room makes a reservation for the next X minutes if that time is available. Bookings made with the SlackBot can also be cancelled by the same user.

![Book a meeting room](docs/book.jpg "Book a meeting room")

Uses [Google Calendar API](https://developers.google.com/google-apps/calendar/v3/reference/). Meeting room calendars are defined in the configuration file. Booker info from [Slack User Info](https://api.slack.com/methods/users.info).

Requirements:
* Execute Step 1: Turn on the Google Calendar API from [quicksart](https://developers.google.com/google-apps/calendar/quickstart/nodejs). Save file as client_secret.json
* Execute `npm run create_token` to store authentication token to json-file. This file is not in version control
* Both files need to be in the workspace root

#### Suggest a lunch or a beer place 

Get list of restaurants/bars from [Google Places API](https://developers.google.com/places/web-service/search) that are max 500m/800m from the office and return random item from that list. Office location is defined in the configuration file. 

![Suggest a lunch place](docs/lunch.jpg "Suggest a lunch place")

Requirements:
* [Get an API key](https://developers.google.com/places/web-service/get-api-key)

#### Translate service

Automatically translate the conversation to selected language.

![Translate](docs/translate.jpg "Translate")

Requirements:
* [Get API Key file](https://cloud.google.com/translate/docs/quickstart)
* [MongoDB Database](https://github.com/eleksi/office-slack-bot#mongodb-database)

```js
translator: {
    keyPath: '/home/user123/office-slack-bot/translate_secret.json',
    dbStringPath: '/home/my-user/office-slack-bot/db_config.json',
    prefix: ':flag-england: ',
    language: 'en',            
    maxCharacters: 1000,
    // Translated channels are no longer configured here, set up a database instead
    channels: {
        aaaaa: {
            enabled: true
        },
        xxxxx: {
            enabled: true
        }
    }
}
```

Bot adds a channel to the channel list when `translate` command is issued from the channel.


#### Send email

[Nodemailer](https://nodemailer.com/) is used to sen email. Add `mailConfig` to the configuration file. Will send email to defined email address and cc to sender. Add information to the configuration's `emailMessage`.

Bot's source code has an implementation to send an email to the maintenane company.

Requirements:
* If Google is used to send emails, enable less secure apps for the account https://myaccount.google.com/lesssecureapps

#### WebScraping

Uses Cheerio to scrape text from html. Selector is executed with eval it's result is shown to user. Use `helpers\cheerioTester.js` to verify selector.

```js
reddit : {
    url: 'https://www.reddit.com/r/all',
    description: 'Top link from Reddit all',
    selector: `const link = $('#siteTable').find('a').first().attr('href'); link.startsWith('http') ? link : 'https://www.reddit.com' + link;`
}
```

## Files

* src/app.js
  * Slack Botkit related communication
* src/consoleApp.js
  * Console application for testig
* src/bot.js
  * Logic for executing correct functionality
* src/configuration.js
  * __Required__ configuration for the application. Not in version control.
  * Add this file manually
* src/calendarServices.js
  * Google Calendar integration
* src/emailSender.js
  * Email sending functionality
* src/googlePlacesService.js
  * Google Places API integration

## ConsoleApp for testing

Console app wraps the same functionality as BotKit, so it works with same commands and returns same responsens.

```sh
$ npm run console
```

## Configuration file

configuration.js containts tokens, passwords, locations, sensors etc.

If `allowGuestsToUse` is set to _false_, then restricted users will get an error messages when trying to send messages to the bot. 

configuration.js:
```js
'use strict';

module.exports = {
  botToken: 'xxxx',
  homeChannelId: 'xxxx',
  slackAdminUserId: 'xxxx',
  allowGuestsToUse: false,
  apiUserName: 'xxxx',
  apiPassword: 'xxxx',
  apiUrl: 'xxxx',
  locationApiKey: 'xxxx',
  office: { lat: 60.17, lon: 24.94 },
  sensors: [
    { id: 'xxx', name: 'xx' },
    { id: 'xxx', name: 'xx' }
  ],
  meetingRooms: [
    { name: 'xxxx', id: 'xxxx' }
  ],
  translator: {
    keyPath: '/home/my-user/office-slack-bot/translate_secret.json',
    dbStringPath: '/home/my-user/office-slack-bot/db_config.json',
    prefix: ':flag-england: ',
    language: 'en',
    maxCharacters: 1000,
    // Translated channels are no longer configured here, set up a database instead
    channels: { 
      AAAA: {
        enabled: true
      },
      BBBB: {
        enabled: true
      }
    }
  },
  webScraperOptions: {
    reddit: {
      url: 'https://www.reddit.com/r/all',
      description: 'Top link from Reddit all',
      selector: `const link = $('#siteTable').find('a').first().attr('href'); link.startsWith('http') ? link : 'https://www.reddit.com' + link;`
    },
    vincit_kurssi: {
      url: 'https://www.kauppalehti.fi/5/i/porssi/porssikurssit/osake/index.jsp?klid=2073',
      description: 'Vincit stock value',
      selector: `$('.stock_number').text() + "€";`
    },
    hs_top: {
      url: 'https://www.hs.fi/',
      description: 'Most read link from Helsingin Sanomat',
      selector: `'https://www.hs.fi/' + $('.is-most-read-articles-list').find('a').first().attr('href');`
    }
  },
  emailConfig: {
    service: "gmail",
    host: "smtp.gmail.com",
    auth: {
      user: "xxx@gmail.com",
      pass: "xxxxx"
    }
  },
  emailMessage: {
    receiver: 'test@test.com',
    subject: 'Maintenance request',
    template: `
Hi,

{content}

Br,
{senderName}
`
  }
};
```

## MongoDB Database

MongoDB database needs to be set up. Free MongoDB hosting for example [mLab](https://mlab.com/) will do.

1) Set up a cluster
1) Create a new database and a collection. Bot expects both the database and the collection to be named `translate_channels`.
1) Create a database user and whitelist your bot's IP address
1) Get a connection string and insert it into your dbStringPath file e.g. :

```
{
  "connectString": "mongodb+srv://<username>:<password>@<rest-of-connect-string>"
}

```

## Deploying

This readme will cover deploying the bot in [Google Cloud](https://cloud.google.com/) in a Docker container.

1) Create a new project in Google Cloud
1) Enable Container Registry for the Docker image
1) Enable Compute Engine for running the image
1) [Set up Container Registry](https://cloud.google.com/container-registry/docs/quickstart), build a docker image and push it to Container Registry
1) Set up VM Instance (with Container Optimized OS) and use your Docker image as a Container image

## Tests

Test folder contains tests. Some tests require correct Google API keys in the configuration file.

```sh
$ npm test
```

Run test matchin the pattern:

```sh
$ npm run test:g [pattern]
```

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

Licensed under the [MIT](LICENSE) License.
