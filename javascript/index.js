const Discord = require("discord.js")
const fs = require('fs')
const java = require("java")
const {execSync} = require('child_process');
const sku = require('./SKUser.js');
const helper = require('./SharedFunctions.js')
const stringFunctions = require('./StringFunctions.js')

console.log("Building java jar...")
execSync('buildImageJar.bat')
java.classpath.push("java/bin/ImageGeneratorPrimary.jar");
console.log("Java jar built.")

const client = new Discord.Client()

// Initialize the jar we imported above and have it load the card images into memory permanently 
java.callStaticMethod( "ImageGeneratorPrimary", "precacheImages", function( err, results ) {
	if( err ) { console.error(err); return; } 
	
	// Read the private token from the disk and uses it to start the bot
	var token = JSON.parse(fs.readFileSync( 'config/token.json' ) ).token
	client.login( token )

} );

// A regex pattern to match variations on the word "Shuffle"
var shuffleRegex = RegExp( "s[a-z]+([a-z])(\1|el|le)[a-z]*" );

// An array of all the people who have typed anything as a KV pair
// IE ["adam" -> skUser1, "eve" -> skUser2]
var userArray = {}
var config = {}

// When the bot logs in
client.on( "ready", () => {
	console.log(`Logged in as ${client.user.tag}!`)

	var rawConfig = JSON.parse(fs.readFileSync('config/config.json'))
	config.acceptablePrefixes = rawConfig.prefixes
	config.commands = [
		{ keys: rawConfig.alias.flip, method: flip },
		{ keys: rawConfig.alias.drive, method: drive },
		{ keys: rawConfig.alias.hero, method: hero },
		{ keys: rawConfig.alias.desperado, method: desperado },
		{ keys: rawConfig.alias.schadenfreude, method: schadenfreude },
		{ keys: rawConfig.alias.boom, method: boom },
		{ keys: rawConfig.alias.pocketJoker, method: pocketJoker },
		{ keys: rawConfig.alias.debugShowDeck, method: debugShowDeck },
		{ keys: rawConfig.alias.showSummary, method: showSummary },
		{ keys: rawConfig.alias.summarizeDeck, method: summarizeDeck },
		{ keys: rawConfig.alias.thonk, method: thonk },
		{ keys: rawConfig.alias.antijoker, method: antijoker }
	]
	config.simpleResponses = rawConfig.simpleResponses
} )

// When the bot recieves any message
client.on( "message", message => {

	// Who sent the message, this is the K in the KV pair above
	var author = message.author
	var messageText = message.content.toLowerCase().trim()

	// Search all the prefixes for one that fits, if found, remove prefix from the message
	var prefixFound = false
	for ( const index in config.acceptablePrefixes ) {
		const prefix = config.acceptablePrefixes[index].toLowerCase()
		if( messageText.startsWith( prefix ) ){
			prefixFound = true
			messageText = messageText.substr( prefix.length ).trim().replace( /\s+/g, " " )
			break
		}
	}
	if( !prefixFound ){
		return
	}
	
	// Initialize new users
	if( !( author in userArray ) ) {
		userArray[author] = new sku.SKUser()
	}

	// Find the command the user typed by looping through the predefined commands and finding an alias that fits
	// Once found, execute the command by calling it's associated function
	for (const commandIndex in config.commands) {
		const command = config.commands[commandIndex]
		for (const keyIndex in command.keys) {
			const key = command.keys[keyIndex].toLowerCase()
			if(messageText.startsWith(key)){
				// Remove command text from message text and pass it in
				messageText = messageText.substr(key.length).trim()
				console.log("Running " + key + " with argument: " + messageText)
				command.method(userArray[message.author], message, messageText)
				return
			}
		}
	}

	// Check for shuffle because it uses regex
	let filteredMessageText = stringFunctions.removeDiacritics( messageText )
	let shuffleResult = filteredMessageText.match( shuffleRegex );
	if( shuffleResult != null ) {
		console.log( "Running " + shuffleResult + " with argument: " + filteredMessageText )

		let formattedMessageText = filteredMessageText
		if( filteredMessageText.endsWith( "e" ) ){
			formattedMessageText += "d"
		} else if ( filteredMessageText.endsWith( "el" ) ){
			formattedMessageText += "'d"
		}

		shuffle( userArray[ message.author ], message, filteredMessageText )
		return
	}

	// If none of the actual commands fit, search through simple responses 
	for (const key in config.simpleResponses) {
		if( messageText.startsWith( key ) ){
			message.channel.send( config.simpleResponses[ key ] )
			return
		}
	}
})

function showSummary(skUser, message, argumentString){
	if(argumentString.length != 0){
		if(argumentString === "true"){
			skUser.showSummary = true
			message.channel.send('You will now see a summary on card flips.')
		}else if (argumentString === "false"){
			skUser.showSummary = false
			console.log(skUser.showSummary)
			message.channel.send('You will no longer see a summary on card flips.')
		}
	} else {
		message.channel.send('What should I set it to?')
	}
}

// Shuffles a user's deck and sends an appropriate message
// Note: 3rd argument is purely the word that is echoed
function shuffle( skUser, message, shuffleName ){
	skUser.reset()
	skUser.shuffle()
	message.channel.send( 'Deck ' + shuffleName )
}

// The main function responsible for showing the flipped cards 
function flip(skUser, message, argumentString){
	if(argumentString.length == 0){
		argumentString = "1"
	}

	var numberString = argumentString.split(" ")[0]

	var number = parseInt(numberString, 10)

	// Check for... special cases
	if(number == 69){
		message.channel.send("nice")
		return
	}
	if(number == 420){
		message.channel.send("blaze it *dab*")
		return
	}
	
	// Make sure it is an integer and not too large
	if(Number.isInteger(parseInt(number, 10)) && number > 0 && number <= 54){
		// Some more logic to prevent huge flips
		if(number <= 15 || argumentString.includes("!")){
			// Make sure there is no open hand
			skUser.discardHand()
			skUser.driveUsed = 0
			skUser.heroPointUsed = false
			// Generate the hand 
			for(var i = 0; i < number; i++){ 
				skUser.deal();
			}

			// Generate summary/image and send it to discord
			postHand(skUser, message.channel)

		} else {
			message.channel.send("Are you sure you want to flip that many? Add a space and an exclamation point after the command to confirm!")
		}
	}else {
		message.channel.send(number + " was not a nice number! >:(") // >:(
	}
}

function drive(skUser, message, argumentString){
	if(argumentString.length == 0){
		argumentString = "1"
	}

	var numberString = argumentString.split(" ")[0]

	var number = parseInt(numberString, 10)

	// Check for... special cases
	if(number == 69){
		message.channel.send("nice")
		return
	}
	if(number == 420){
		message.channel.send("blaze it *dab*")
		return
	}
	
	// Make sure it is an integer and not too large
	if(Number.isInteger(number) && number > 0 && number <= 54){
		driveN(skUser, message, number, false)
	}else {
		message.channel.send(number + " was not a nice number! >:(") // >:(
	}
}

function hero(skUser, message, argumentString){
	if(skUser.heroPointUsed){
		message.channel.send("You already used a hero point this hand!")
	}else{
		driveN(skUser, message, 2, true)	
	}
}

// If the user want's to flip more cards with drive, this is the method that gets called
// It just adds one more card to the user's hand and then regenerates the summary and card image
function driveN(skUser, message, numberOfCards, isHeroPoint){
	if(skUser.lastMessage == null){
		message.channel.send("Please flip some cards before you use drive or hero points.")
	}else{ 
		if(skUser.deck.length - numberOfCards <= 0){
			message.channel.send("There are not enough cards in your deck to flip that many!")
		}else{
			message.delete()
			skUser.lastMessage.delete()
			for(var i = 0; i < numberOfCards; i++){
				skUser.deal()
			}
			if(isHeroPoint){
				skUser.heroPointUsed = true
			}else{
				skUser.driveUsed += numberOfCards
			}

			postHand(skUser, message.channel)
		}
	}
}

function postHand(skUser, channel){
	// Generate the summary string which will be something like "You flipped 1 face card, no jokers, and no criticals."
	var summaryString = skUser.generateSummaryMessage()
	// This is passed to the java image generator code
	var cardString = skUser.hand.join()

	// This calls the java image generation code, and then when it returns we send the summary string and new image to discord
	java.callStaticMethod("ImageGeneratorPrimary", "generateImage", cardString, function(err, results) {
		if(err) { console.error(err); return; } 
		channel
			.send(summaryString, new Discord.MessageAttachment(results))  // Send the summary/image to discord
			.then(newMessage => {skUser.lastMessage = newMessage}); // The `lastMessage` member is used to delete/replace this message if the user uses drive 
	});
}

// Handles the "Desperado" ultimate
function desperado(skUser, message, argumentString){
	if(argumentString.length != 0){
		if(argumentString === "true"){
			skUser.isDesperado = true
			message.channel.send('You are now a desperado!')
		}else if (argumentString === "false"){
			skUser.isDesperado = false
			message.channel.send('You are no longer a desperado!')
		}
	} else {
		message.channel.send('What should I set it to?')
	}
}

// Handles the "Schadenfreude" ultimate 
function schadenfreude(skUser, message, argumentString){
	skUser.schadenfreude(message.channel);
}

// Handles the "Extra Explosions" ultimate 
function boom(skUser, message, argumentString){
	skUser.boom()
	message.channel.send("Jokers and the Queen of Hearts have been shuffled back into the deck, " + skUser.deck.length + " cards remaining.")
}
// Handles the pocket joker mechanic
function pocketJoker(skUser, message, argumentString){
	skUser.pocketJoker()
	message.channel.send("Joker(s) have been shuffled back into the deck, " + skUser.deck.length + " cards remaining.")
}

// Prints the deck for debug
// It is a good idea to disable this if you don't trust your users not to use it
function debugShowDeck(skUser, message, argumentString){

	// Checking the current time makes using this command annoying, which is the point
	var date = new Date()

	if(date.getMinutes() == argumentString){
		var string = "Cards in deck: \n"
		var arrayToPrint = skUser.deck.slice().sort()
		for(var i = 0; i < arrayToPrint.length; i++){
			string += "-" + arrayToPrint[i] + "\n"
		}
		message.channel.send(string)
	}
}

function summarizeDeck(skUser, message, argumentString){
	var jokers = 0
	var faceCards = 0
	var criticals = 0
	for(var i = 0; i < skUser.deck.length; i++){
		var card = skUser.deck[i]
		if(helper.isJoker(card, skUser.isDesperado)){
			jokers += 1
		} else if(helper.isCritical(card, skUser.isDesperado)) {
			criticals += 1
		} else if(helper.isFaceCard(card)) {
			faceCards += 1
		}
	}

	var summaryString = "You have " + skUser.deck.length + " cards remaining in your deck, " + `${faceCards} face, ${jokers} joker, ${criticals} critical.`

	message.channel.send(summaryString)
}

// Gets you thinking 
function thonk(skUser, message, argumentString){
	message.channel.send("", new Discord.MessageAttachment("image/thonk.jpg"))
}

// Gets you thinking 
function antijoker(skUser, message, argumentString){
	message.channel.send("", new Discord.MessageAttachment("image/antijoker.gif"))
}