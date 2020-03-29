## Installation
First, follow instructions here to get node, discord.js, and discord set up: https://thomlom.dev/create-a-discord-bot-under-15-minutes/   
Second, follow instructions here to get node-java set up: https://github.com/joeferner/node-java    
Third, give your bot a role in discord that includes "Manage Messages" permission   

Make a file under `config/` called `token.json` and put this inside of it, using your token:  

```json
{
    "token": "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
}
```

To start the bot, open a command window in the root directory of the bot and type `npm run dev`.

You should have a working bot now, you can test it by typing `!flip 5` and you should see something like this:  
![flip 5](https://i.imgur.com/qwMVa9f.png "flip 5 result")

## Usage

We did not try to code the entirety of the rules of Space Kings into this bot, just the card flipping rules. All of the rules that relate to flipping cards should have a command, but if we missed one please let us know.   

Command reference:  
| Command          | Description                                                                                                  |
|------------------|--------------------------------------------------------------------------------------------------------------|
| `shuffle`        | Completely rebuilds the deck and shuffles it, good for resetting.                                            |
| `flip n`         | Flips n cards and displays them                                                                              |
| `drive`          | Flips an additional card and adds it to the previous flip, can be used any number of times                   |
| `desperado`      | Changes which cards count as jokers and as criticals to reflect the Desperado ultimate                       |
| `undesperado`    | Undoes the `desperado` command                                                                               |
| `schadenfreude`  | Flips one card and tells you to add a drive if it is a face or a joker, see Schadenfreude ultimate for rules |
| `boom`           | Shuffles criticals and jokers back into the deck, see More Explosions ultimate for rules                     |
| `pocket joker`   | Shuffles jokers back into the deck for the pocket joker rule                                                 |
| `show deck`      | Prints the cards in your deck for debug purposes in a sorted list.                                           |

Notes:   
Flip will warn you if you try to flip more than 15 cards at once, this can be bypassed by adding an exclamation point at the end like this: `!flip 20 !`  
Schadenfreude and Boom are not automatic, they should be used by a player when the situation arises 

## Configuration

Inside the `config/` folder there is a file called `config.json` that can be used to tailor the bot to your needs.   
  
The `prefixes` key controls which characters or strings trigger the bot to activate. For example `!flip 5` and `~flip 5` should both work by default.   
The `alias` key controls what words activates which commands. For example none of us can spell "schadenfreude" so `!schadenfreude` and `!haha nerd` both do the same thing.   
The `simpleResponses` key controls simple responses. For example if someone types `!despacito` then the bot will reply `This is so sad`
