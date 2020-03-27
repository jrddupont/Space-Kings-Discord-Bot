const Discord = require("discord.js")
const fs = require('fs');

const client = new Discord.Client()

// Read the private token from the disk and uses it to start the bot
var token = JSON.parse(fs.readFileSync('config/token.json')).token
client.login(token)



// An array of all the people who have typed anything as a KV pair
// IE ["adam" -> deck1, "eve" -> deck2]
var userArray = {}
var config = {}

// When the bot logs in
client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)

  var rawConfig = JSON.parse(fs.readFileSync('config/config.json'))
  config.acceptablePrefixes = rawConfig.prefixes
  config.commands = [
    { keys: rawConfig.alias.shuffle, method: shuffle },
    { keys: rawConfig.alias.flip, method: flip },
    { keys: rawConfig.alias.drive, method: drive },
    { keys: rawConfig.alias.desperado, method: desperado },
    { keys: rawConfig.alias.undesperado, method: undesperado },
    { keys: rawConfig.alias.schadenfreude, method: schadenfreude },
    { keys: rawConfig.alias.boom, method: boom },
    { keys: rawConfig.alias.showDeck, method: showDeck }
  ]
  config.simpleResponses = rawConfig.simpleResponses
})



// When the bot recieves any message
client.on("message", message => {

  // Who sent the message, this is the K in the KV pair above
  var author = message.author
  var text = message.content

  // Search all the prefixes for one that fits, if found, remove prefix from the message
  var prefixFound = false
  for (const index in config.acceptablePrefixes) {
    const prefix = config.acceptablePrefixes[index]
    if(text.startsWith(prefix)){
      prefixFound = true
      text = text.substr(prefix.length).trim().toLowerCase().replace(/\s+/g, " ")
      console.log(text)
      break
    }
  }
  if(!prefixFound){
    return
  }
  
  // Initialize new users
  if(!(author in userArray)){
    userArray[author] = new Deck()
  }

  // Find the command run and call it
  for (const commandIndex in config.commands) {
    const command = config.commands[commandIndex]
    for (const keyIndex in command.keys) {
      const key = command.keys[keyIndex]
      if(text.startsWith(key)){
        command.method(message.author, message, text)
        return
      }
    }
  }

  for (const key in config.simpleResponses) {
    if(text.startsWith(key)){
      message.channel.send(config.simpleResponses[key])
      return
    }
  }
})


function shuffle(author, message, text){
  userArray[author].reset()
  userArray[author].shuffle()
  message.channel.send('Deck shuffled!')
}
function flip(author, message, text){
  if(text === "flip"){
    text = "flip 1"
  }
  // split off the number of cards to flip
  var rawNumber = text.split(" ")[1]
  var number = parseInt(rawNumber, 10)
  // Check for... special cases
  if(number == 69 || number == 420){
    message.channel.send("nice")
    return
  }
  
  // Make sure it is an integer and not too large
  if(Number.isInteger(parseInt(number, 10)) && number > 0 && number <= 54){
    // Some more logic to prevent huge flips
    if(text.includes("!")){
      var textToSend = flipCard(author, number)
      message.channel.send(textToSend).then((newMessage) => {userArray[author].lastMessage = newMessage});
    } else {
      if(number > 15){
        message.channel.send("Are you sure you want to flip that many? Add a space and an exclamation point after the command to confirm!")
      } else {
        var textToSend = flipCard(author, number)
        message.channel.send(textToSend).then((newMessage) => {userArray[author].lastMessage = newMessage});
      }
    }
  }else {
    // >:(
    message.channel.send(rawNumber + " was not a nice number! >:(")
  }
}
function drive(author, message, text){
  if(userArray[author].lastMessage == null){
    message.channel.send("Please flip some cards before you use drive.")
  }else{ 
    if(userArray[author].deck.length == 0){
      message.channel.send("You have no more cards to flip!")
    }else{
      message.delete()
      userArray[author].deal()
      userArray[author].driveUsed += 1
      var textToSend = generateFlipMessage(userArray[author].hand, userArray[author].deck, userArray[author].desperado, userArray[author].driveUsed)
      userArray[author].lastMessage.edit(textToSend)
    }
  }
}
function desperado(author, message, text){
  userArray[author].desperado = true;
  message.channel.send('You are now a desperado!')
}
function undesperado(author, message, text){
  userArray[author].desperado = false;
  message.channel.send('You are no longer a desperado!')
}
function schadenfreude(author, message, text){
  userArray[author].schadenfreude(message.channel);
}
function boom(author, message, text){
  // Handles the "Extra Explosions" ultimate 
  userArray[author].boom()
  message.channel.send("Jokers and the Queen of Hearts have been shuffled back into the deck, " + userArray[author].deck.length + " cards remaining.")
}
function showDeck(author, message, text){
  // Prints the deck for debug
  var string = "Cards in deck: \n"
  var arrayToPrint = userArray[author].deck.slice().sort()
  for(var i = 0; i < arrayToPrint.length; i++){
    string += "-" + arrayToPrint[i] + "\n"
  }
  message.channel.send(string)
}




// Flips n cards
function flipCard(author, numberOfCards) {
  // Make sure there is no open hand
  userArray[author].discardHand()
  userArray[author].driveUsed = 0
  // Generate the hand 
  for(var i = 0; i < numberOfCards; i++){ 
    userArray[author].deal();
  }

  // Deal the cards and also count jokers, face cards, and criticals
  return generateFlipMessage(userArray[author].hand, userArray[author].deck, userArray[author].desperado, userArray[author].driveUsed)
}

function isFaceCard(card){
  const faceCardNames = ['Ace', 'Jack', 'Queen', 'King']
  for(var j = 0; j < faceCardNames.length; j++){
    if(card.includes(faceCardNames[j])){
      return true
    }
  }
  return false
}
function isJoker(card, isDesperado){
  return (card === "Joker") || ((card === "Queen of Diamonds") && isDesperado)  
}
function isCritical(card, isDesperado){
  return (card === "Queen of Hearts") || ((card === "Ace of Spades") && isDesperado)
}


function generateFlipMessage(hand, deck, isDesperado, driveUsed) {

  var jokers = 0
  var faceCards = 0
  var critical = 0
  for(var i = 0; i < hand.length; i++){
    var card = hand[i]
    if(isJoker(card, isDesperado)){
      jokers += 1
    } else if(isCritical(card, isDesperado)) {
      critical += 1
    } else if(isFaceCard(card)) {
      faceCards += 1
    }
  }

  // Construct a string to send
  var string = "You flipped: \n"
  // Add all the flipped cards
  for(var i = 0; i < hand.length; i++){
    string += "-" + hand[i] + "\n"
  }

  // Make sure the "you flipped" sentance is grammatically correct 
  if(faceCards == 0){
    string += `You flipped no face cards, `
  } else if (faceCards == 1){
    string += `You flipped 1 face card, `
  } else {
    string += `You flipped ${faceCards} face cards, `
  }

  if(jokers == 0){
    string += `no jokers, `
  } else if (jokers == 1){
    string += `1 joker, `
  } else {
    string += `${jokers} jokers, `
  }

  if(critical == 0){
    string += `and no criticals.\n`
  } else if (critical == 1){
    string += `and 1 critical!\n`
  } else {
    string += `and ${critical} criticals!!!\n`
  }

  if(deck.length == 1){
    string += "You have 1 card remaining.\n"
  } else {
    string += "You have " + deck.length + " cards remaining.\n"
  }

  if (driveUsed >= 1){
    string += `Used ${driveUsed} drive${"!".repeat(driveUsed)}\n`
  }
  // Post result
  return string
}


// I found this online, edited it a lot 
class Deck{
  constructor(){
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.lastMessage = null;
    this.reset();
    this.shuffle();
    this.desperado = false;
    this.driveUsed = 0;
  }

  // Discard hand, move queen of hearts and jokers into deck, shuffle deck
  boom(channel){
    this.discardHand()
    var cardsToShuffleBackIn = []
    for(var i = 0; i < this.discard.length; i++){
      if(isCritical(this.discard[i], this.desperado) || isJoker(this.discard[i], this.desperado)){
        cardsToShuffleBackIn.push(this.discard[i])
      }
    }
    for(var i = 0; i < cardsToShuffleBackIn.length; i++){
      const index = this.discard.indexOf(cardsToShuffleBackIn[i]);
      if (index > -1) {
        this.discard.splice(index, 1);
      }
    }
    this.deck = this.deck.concat(this.cardsToShuffleBackIn)
    this.shuffle()
    channel.send(cardsToShuffleBackIn)
  }
  
  schadenfreude(channel) {
    this.discardHand()

    // reveal one card
    let card = this.deal();
    
    if (isFaceCard(card) || isJoker(card, this.desperado)){
      channel.send(`You flipped a ${card}, +1 drive`)
      // add back into deck
      this.deck.push(card)
      this.hand = []
      this.shuffle()
    } else {
      channel.send(`You flipped a ${card}, no drive`)
      this.discardHand()
    }
        
  }
  // Move cards from the hand into the discard
  discardHand(){
    this.discard = this.discard.concat(this.hand)
    this.hand = []
  }

  // Totally recreates the deck, but does not shuffle it. 
  reset(){
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.desperado = false;
    this.driveUsed = 0;
    
    const suits = ['Hearts', 'Spades', 'Clubs', 'Diamonds'];
    const values = ['Ace', 2, 3, 4, 5, 6, 7, 8, 9, 10, 'Jack', 'Queen', 'King'];

    for (let suit in suits) {
      for (let value in values) {
        this.deck.push(`${values[value]} of ${suits[suit]}`);
      }
    }
    this.deck.push("Joker");
    this.deck.push("Joker");
  }

  // Yup, this is probably fine
  shuffle(){
    const { deck } = this;
    let m = deck.length, i;

    while(m){
      i = Math.floor(Math.random() * m--);

      [deck[m], deck[i]] = [deck[i], deck[m]];
    }

    return this;
  }

  // Move the top card into the hand and return that card also
  deal(){
    if(this.deck.length < 1){
      this.deck = this.discard
      this.discard = []
      this.shuffle()
    }
    var card = this.deck.pop()
    this.hand.push(card)
    return card;
  }
}