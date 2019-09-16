# swapperbot
A bot to automate shift swapping and makeups for Peer Instructors at The Hive ECE Makerspace @ Georgia Tech.

## Prerequisites

* An OS that can run Node.js (I've tested this on Windows 10, Raspbian, and macOS so far without fail).
* Node.js ([download here](https://nodejs.org/en/download/))

## Setup
1. Install Node.js, if you haven't already.
2. Clone this repository to your local machine.
3. Open a terminal window and navigate to the repository directory.
4. Execute the command
```
npm install
```
**Note:** The bot currently runs on an older version of Botkit (0.7), so confirm that version is installed with `npm list botkit`. If something other than `botkit@0.7.4` is listed, execute `npm install botkit@0.7.4`.
5. There are certain files needed that I have purposefully excluded from this repository because they contain sensitive information such as client IDs and API keys. Reach out to me if you are looking to set up this bot on your local machine and need these files.

## Running
```
npm start
```
will automatically open the necessary localtunnel domain (unless the bot is already online) and bring the bot online. You must leave the terminal window open in order for the bot to stay online!

## Exposed Ports
The only port that is used is `8765`, which is used for the localtunnel instance. This allows for API calls to be received and responded to.
