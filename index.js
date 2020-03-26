const Discord = require("discord.js")
const fs = require('fs');

const client = new Discord.Client()

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

var userArray = {}

client.on("message", message => {

  var author = message.author

  var text = message.content
  var acceptablePrefixes = ["`", "!", "'", "Honorable Card Flipper Bot esq., would you kindly "]
  var prefixFound = false
  for (var i = 0; i < acceptablePrefixes.length; i++) {
    if(message.content.startsWith(acceptablePrefixes[i])){
      prefixFound = true
      text = message.content.substr(acceptablePrefixes[i].length).trim().toLowerCase()
      break
    }
  }

  if(!prefixFound){
    return
  }

  if(!(author in userArray)){
    userArray[author] = new Deck()
  }

  if (text === "shuffle") {
    userArray[author].reset()
    userArray[author].shuffle()
    message.channel.send('Deck shuffled!')
  } else if (text === "curse you!") {
    message.channel.send('You deservered it')
  } else if (text.startsWith("flip")) {
    var rawNumber = text.split(" ")[1]
    var number = parseInt(rawNumber, 10)
    if(number == 69 || number == 420){
      message.channel.send("nice")
      return
    }
    if(Number.isInteger(parseInt(number, 10)) && number > 0 && number < 50){
      if(text.includes("!")){
        flipCard(message.channel, author, number)
      } else {
        if(number > 15){
          message.channel.send("Are you sure you want to flip that many? Add a space and an exclamation point after the command to confirm!")
        } else {
          flipCard(message.channel, author, number)
        }
      }
      
    } else {
      message.channel.send(rawNumber + " was not a nice number! >:(")
    }
  }else if (text.startsWith("boom")) {
    userArray[author].boom()
    message.channel.send("Jokers and the Queen of Hearts have been shuffled back into the deck, " + userArray[author].deck.length + " cards remaining.")
  }else if (text.startsWith("show deck")) {
    var string = "Cards in deck: \n"
    var arrayToPrint = userArray[author].deck.slice().sort()
    for(var i = 0; i < arrayToPrint.length; i++){
      string += "-" + arrayToPrint[i] + "\n"
    }
    message.channel.send(string)
  }
})

var token = JSON.parse(fs.readFileSync('token.json')).token
client.login(token)


function flipCard(channel, author, numberOfCards) {
  userArray[author].discardHand()

  var jokers = 0
  var faceCards = 0
  var critical = 0
  for(var i = 0; i < numberOfCards; i++){
    var card = userArray[author].deal();
    if(card === "Joker"){
      jokers += 1
    } else if(card === "Queen of Hearts") {
      critical += 1
    } else {
      const faceCardNames = ['Ace', 'Jack', 'Queen', 'King']
      for(var j = 0; j < faceCardNames.length; j++){
        if(card.includes(faceCardNames[j])){
          faceCards += 1
          break
        }
      }
    }
  }
  var string = "You flipped: \n"
  for(var i = 0; i < userArray[author].hand.length; i++){
    string += "-" + userArray[author].hand[i] + "\n"
  }

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
    string += `and no Queen of Hearts.\n`
  } else if (critical == 1){
    string += `and 1 Queen of Hearts!\n`
  } else {
    string += `and ${critical} Queen of Hearts!!!\n`
  }

  if(userArray[author].deck.length == 1){
    string += "You have 1 card remaining."
  } else {
    string += "You have " + userArray[author].deck.length + " cards remaining."
  }

  

  channel.send(string)
}


class Deck{
  constructor(){
    this.deck = [];
    this.hand = [];
    this.discard = [];
    this.reset();
    this.shuffle();
  }

  boom(channel){
    this.discardHand()
    var cardsToShuffleBackIn = []
    for(var i = 0; i < this.discard.length; i++){
      if(this.discard[i] == "Queen of Hearts" || this.discard[i] == "Joker"){
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

  discardHand(){
    this.discard = this.discard.concat(this.hand)
    this.hand = []
  }

  reset(){
    this.deck = [];
    this.hand = [];
    this.discard = [];

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

  shuffle(){
    const { deck } = this;
    let m = deck.length, i;

    while(m){
      i = Math.floor(Math.random() * m--);

      [deck[m], deck[i]] = [deck[i], deck[m]];
    }

    return this;
  }

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