/**
 * A Bot for Slack!
 */

 /**
 * Specify environment variable location
 */
const dotenv = require('dotenv');
dotenv.config();

/**
 * Open a localtunnel instance for the bot
 */
var subdomain = process.env.BETA == "yes" ? "swapperbot-beta" : "swapperbot";
const { exec } = require('child_process');
exec('lt --port 8765 --subdomain ' + subdomain, (err, stdout, stderr) => {
  if (err) {
    // node couldn't execute the command
    console.log("error starting localtunnel instance!")
    return;
  }
  console.log(`stdout: ${stdout}`);
  console.log(`stderr: ${stderr}`);
});

/**
 * Set up Moment
 */
var moment = require('moment');

/**
 * Set up Google Sheets API
 */
const fs = require('fs');
const readline = require('readline');
const {google} = require('googleapis');

// If modifying these scopes, delete token.json.
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets'];
// The file token.json stores the user's access and refresh tokens, and is
// created automatically when the authorization flow completes for the first
// time.
const TOKEN_PATH = 'token.json';

// // Load client secrets from a local file.
// fs.readFile('credentials.json', (err, content) => {
//   if (err) return console.log('Error loading client secret file:', err);
//   // Authorize a client with credentials, then call the Google Sheets API.
//   authorize(JSON.parse(content), listMajors);
// });

/**
 * Create an OAuth2 client with the given credentials, and then execute the
 * given callback function.
 * @param {Object} credentials The authorization client credentials.
 * @param {function} callback The callback to call with the authorized client.
 */
function authorize(credentials, callback) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client);
  });
}

/**
 * Similar to the above function, but passes on the bot and message arguments
 * as well.
 * @param {*} credentials 
 * @param {*} callback 
 * @param {*} bot 
 * @param {*} message 
 */
function authorizeForBot(credentials, callback, bot, message) {
  const {client_secret, client_id, redirect_uris} = credentials.installed;
  const oAuth2Client = new google.auth.OAuth2(
      client_id, client_secret, redirect_uris[0]);

  // Check if we have previously stored a token.
  fs.readFile(TOKEN_PATH, (err, token) => {
    if (err) return getNewToken(oAuth2Client, callback);
    oAuth2Client.setCredentials(JSON.parse(token));
    callback(oAuth2Client, bot, message);
  });
}

/**
 * Get and store new token after prompting for user authorization, and then
 * execute the given callback with the authorized OAuth2 client.
 * @param {google.auth.OAuth2} oAuth2Client The OAuth2 client to get token for.
 * @param {getEventsCallback} callback The callback for the authorized client.
 */
function getNewToken(oAuth2Client, callback) {
  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });
  console.log('Authorize this app by visiting this url:', authUrl);
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });
  rl.question('Enter the code from that page here: ', (code) => {
    rl.close();
    oAuth2Client.getToken(code, (err, token) => {
      if (err) return console.error('Error while trying to retrieve access token', err);
      oAuth2Client.setCredentials(token);
      // Store the token to disk for later program executions
      fs.writeFile(TOKEN_PATH, JSON.stringify(token), (err) => {
        if (err) return console.error(err);
        console.log('Token stored to', TOKEN_PATH);
      });
      callback(oAuth2Client);
    });
  });
}

/**
 * Prints the names and majors of students in a sample spreadsheet:
 * @see https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit
 * @param {google.auth.OAuth2} auth The authenticated Google OAuth client.
 */
function listMajors(auth) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms',
    range: 'Class Data!A2:E',
  }, (err, res) => {
    if (err) return console.log('The API returned an error: ' + err);
    const rows = res.data.values;
    if (rows.length) {
      console.log('Name, Major:');
      // Print columns A and E, which correspond to indices 0 and 4.
      rows.map((row) => {
        console.log(`${row[0]}, ${row[4]}`);
      });
    } else {
      console.log('No data found.');
    }
  });
}

/**
 * Define a function for initiating a conversation on installation
 * With custom integrations, we don't have a way to find out who installed us, so we can't message them :(
 */

function onInstallation(bot, installer) {
    if (installer) {
        bot.startPrivateConversation({user: installer}, function (err, convo) {
            if (err) {
                console.log(err);
            } else {
                convo.say('I am a bot that has just joined your team');
                convo.say('You must now /invite me to a channel so that I can be of use!');
            }
        });
    }
}


/**
 * Configure the persistence options
 */

var config = {};
if (process.env.MONGOLAB_URI) {
    var BotkitStorage = require('botkit-storage-mongo');
    config = {
        storage: BotkitStorage({mongoUri: process.env.MONGOLAB_URI}),
    };
} else {
    config = {
        json_file_store: ((process.env.TOKEN)?'./db_slack_bot_ci/':'./db_slack_bot_a/'), //use a different name if an app or CI
    };
}

/**
 * Are being run as an app or a custom integration? The initialization will differ, depending
 */

if (process.env.TOKEN || process.env.SLACK_TOKEN) {
    //Treat this as a custom integration
    var customIntegration = require('./lib/custom_integrations');
    var token = (process.env.TOKEN) ? process.env.TOKEN : process.env.SLACK_TOKEN;
    var controller = customIntegration.configure(token, config, onInstallation);
} else if (process.env.CLIENT_ID && process.env.CLIENT_SECRET && process.env.PORT) {
    //Treat this as an app
    var app = require('./lib/apps');
    var controller = app.configure(process.env.PORT, process.env.CLIENT_ID, process.env.CLIENT_SECRET, config, onInstallation);
} else {
    console.log('Error: If this is a custom integration, please specify TOKEN in the environment. If this is an app, please specify CLIENTID, CLIENTSECRET, and PORT in the environment');
    process.exit(1);
}


/**
 * A demonstration for how to handle websocket events. In this case, just log when we have and have not
 * been disconnected from the websocket. In the future, it would be super awesome to be able to specify
 * a reconnect policy, and do reconnections automatically. In the meantime, we aren't going to attempt reconnects,
 * WHICH IS A B0RKED WAY TO HANDLE BEING DISCONNECTED. So we need to fix this.
 *
 * TODO: fixed b0rked reconnect behavior
 */
// Handle events related to the websocket connection to Slack
controller.on('rtm_open', function (bot) {
    console.log('** The RTM api just connected!');
});

controller.on('rtm_close', function (bot) {
    console.log('** The RTM api just closed');
    // you may want to attempt to re-open
});


/**
 * Core bot logic
 */

controller.on('bot_channel_join', function (bot, message) {
    bot.reply(message, "Hello! To check who's on shift at any given time, type \"Who's on shift?\"");
});

controller.hears('hello', 'direct_message', function (bot, message) {
    bot.reply(message, 'Hello!');
});

controller.on('direct_mention', function (bot, message) {
    bot.reply(message, "REEEEEE PING");
})

function whosOnShift(auth, bot, message) {
  const sheets = google.sheets({version: 'v4', auth});
  const now = new Date();
  const dateString = moment().format('[It is] LT [on] dddd, MMMM Do. ');
  console.log(dateString);
  const isWeekend = now.getDay() == 0 || now.getDay() == 6;
  const isBefore = now.getHours() < 9;
  const isAfter = (now.getHours() == 18 && now.getMinutes() >= 30) || now.getHours() >= 19;
  const isClosed = isWeekend || isBefore || isAfter;
  if (isClosed) {
    bot.reply(message, dateString + "We are closed, so no one is on shift!");
  } else {
    var range;
    switch (now.getDay()) {
      case 1:
        console.log("It is Monday");
        range = 'C6:P24';
        break;
      case 2:
        console.log("It is Tuesday");
        range = 'C27:P45';
        break;
      case 3:
        console.log("It is Wednesday");
        range = 'C48:P66';
        break;
      case 4:
        console.log("It is Thursday");
        range = 'C69:P87';
        break;
      case 5:
        console.log("It is Friday");
        range = 'C90:P108';
        break;
      default:
        bot.reply(message, "Error retrieving shift data!");
        break;
    }
    sheets.spreadsheets.values.get({
      spreadsheetId: '1Ed60EmThivWsRZY6XvLaTKYk9fQNjL5bejx7u0kSrEQ',
      range: 'Fall 2019 Shift Signup!' + range,
    }, (err, res) => {
      if (err) bot.reply(message, 'The API returned an error: ' + err);
      const rows = res.data.values;
      var row = (now.getHours() - 9) * 2 + Math.floor(now.getMinutes() / 30);
      if (rows.length) {
        var onShiftArr = rows[row].filter(name => name != "" && name != "8");
        switch(onShiftArr.length) {
          case 0:
            bot.reply(message, 'No PIs are on shift!');
            break;
          case 1:
            console.log(onShiftArr[0] + ' is on shift!');
            bot.reply(message, dateString + onShiftArr[0] + ' is on shift!');
            break;
          default:
            onShiftArr[onShiftArr.length - 1] = 'and ' + onShiftArr[onShiftArr.length - 1];
            const onShift = onShiftArr.join(', ');
            console.log(onShift + ' are on shift!');
            bot.reply(message, dateString + onShift + ' are on shift!');
        }
      } else {
        bot.reply(message, 'No data found.');
      }
    });
  }
}

function smash(auth, bot, message) {
  const sheets = google.sheets({version: 'v4', auth});
  sheets.spreadsheets.values.get({
    spreadsheetId: '1op3yxM_aSzV88jGjsX9RpvcjB9qW9xx6dym7RCO93zk',
    range: 'Smash Ladder!A1:AZ1',
  }, (err, res) => {
    if (err) bot.reply(message, 'The API returned an error: ' + err);
    const rows = res.data.values;
    var row = rows[0];
    const winner = message.text.substring(0,message.text.indexOf(" smashed "));
    const loser = message.text.substring(message.text.indexOf(" smashed ") + 9);
    if (rows.length) {
      const winnerIndex = row.findIndex(name => {return name == winner});
      const loserIndex = row.findIndex(name => {return name == loser});
      if (winnerIndex == -1 || loserIndex == -1) {
        bot.reply(message, 'Did not find one of the players!' + row);
        return;
      } else if (winnerIndex < loserIndex) {
        bot.reply(message, winner + " is already ranked above " + loser + "!");
        return;
      } else {
        row[loserIndex] = winner;
        row[winnerIndex] = loser;
        sheets.spreadsheets.values.update({
          spreadsheetId: '1op3yxM_aSzV88jGjsX9RpvcjB9qW9xx6dym7RCO93zk',
          range: 'Smash Ladder!A1:AZ1',
          values: row,
        })
        bot.reply(message, 'Congratulations ' + winner + '! Your positions have been swapped.');
      }
    } else {
      bot.reply(message, 'No data found.');
    }
  });
}

controller.hears("who\’*\'*\‘*s on shift", ['direct_message', 'direct_mention', 'ambient'], function (bot, message) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorizeForBot(JSON.parse(content), whosOnShift, bot, message);
  });
})

controller.hears("^.*smashed.*$", ['direct_message', 'direct_mention', 'ambient'], function (bot, message) {
  fs.readFile('credentials.json', (err, content) => {
    if (err) return console.log('Error loading client secret file:', err);
    // Authorize a client with credentials, then call the Google Sheets API.
    authorizeForBot(JSON.parse(content), smash, bot, message);
  });
})


/**
 * AN example of what could be:
 * Any un-handled direct mention gets a reaction and a pat response!
 */
//controller.on('direct_message,mention,direct_mention', function (bot, message) {
//    bot.api.reactions.add({
//        timestamp: message.ts,
//        channel: message.channel,
//        name: 'robot_face',
//    }, function (err) {
//        if (err) {
//            console.log(err)
//        }
//        bot.reply(message, 'I heard you loud and clear boss.');
//    });
//});
