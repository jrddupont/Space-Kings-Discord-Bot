const Discord = require("discord.js")
const fs = require('fs')
const path = require('path');
const java = require("java")
const {execSync} = require('child_process');
const sku = require('./SKUser.js');
const helper = require('./SharedFunctions.js')
const stringFunctions = require('./StringFunctions.js');
const { Console } = require("console");


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
		{ keys: rawConfig.alias.antijoker, method: antijoker },
		{ keys: rawConfig.alias.user, method: user },
		{ keys: rawConfig.alias.move, method: moveFlip }
	]
	config.simpleResponses = rawConfig.simpleResponses
	config.attributes = rawConfig.attributes
	config.skills = rawConfig.skills
} )

// When the bot recieves any message
client.on( "message", message => {

	if(message.author.id == "692557331401015297"){
		return
	}

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
		userArray[author] = new sku.SKUser(config.skills, config.attributes)
		restoreUser(message)
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
	if( filteredMessageText.length < 32 && shuffleResult != null ) {
		console.log( "Running " + shuffleResult + " with argument: " + filteredMessageText )

		let formattedMessageText = messageText
		if( filteredMessageText.endsWith( "e" ) ){
			formattedMessageText += "d!"
		} else if ( filteredMessageText.endsWith( "el" ) ){
			formattedMessageText += "ed!"
		}

		shuffle( userArray[ message.author ], message, formattedMessageText )

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

function user(skUser, message, argumentString){
	var command = argumentString.toLowerCase().trim()
	if(command.length == 0){
		message.channel.send("Available commands: `save`, `list`, `load`, `import`, `export`, `create`, and `set`")
		return
	}
	if(command == "save"){
		saveUserData(skUser, message, false)
		return
	}
	if(command == "list"){
		listUserData(message)
		return
	}
	if(command.startsWith("load")){
		var character = command.split(" ")[1]
		saveUserData(skUser, message, true)
		loadUserData(message, character, false)
		return
	}
	if(command.startsWith("import")){
		var rawCommand = message.content.trim()
		var jsonToImport = rawCommand.substr(rawCommand.indexOf("{")).trim()
		saveUserData(skUser, message, true)
		importCharacter(message, jsonToImport)
		return
	}
	if(command == "export"){
		saveUserData(skUser, message, true)
		exportCharacter(message, skUser)
		return
	}
	if(command.startsWith("create")){
		var character = command.split(" ")[1]
		saveUserData(skUser, message, true)
		var newCharacter = createCharacter(message, character)
		if(newCharacter != null){
			saveUserData(newCharacter, message, true)
		}
		return
	}
	if(command.startsWith("set")){
		var setCommand = command.substr("load".length).trim()
		var updatedCharacter = setUserData(skUser, message, setCommand)
		if(updatedCharacter != null){
			saveUserData(updatedCharacter, message, true)
		}
		return
	}
}

function disambiguateAlias(message, alias) {
	var allSkills = config.attributes.concat(config.skills)
	var disambiguation = allSkills.filter(skill => skill.startsWith(alias))

	if(disambiguation.length == 0){
		message.channel.send("Unknown skill or attribute: " + alias)
		return null
	} else if(disambiguation.length == 1) {
		return disambiguation[0]
	} else if(disambiguation.length > 1) {
		message.channel.send("Ambiguous alias. Could refer to: " + disambiguation.join(", "))
		return null
	}
}

function setUserData(skUser, message, setCommand) {
	console.log(setCommand)
	var splitCommand = setCommand.split(/\s+/)
	var skill = disambiguateAlias(message, splitCommand[0])
	var points = parseInt(splitCommand[1], 10)

	if(skill == null){
		return null
	}
	if(!Number.isInteger(points)){
		message.channel.send("Invalid number of points: " + points)
		return null
	}
	skUser.skills[skill] = points
	message.channel.send("Set " + skill + " to " + points)
	return skUser
}

var currentCharacterFileName = "currentCharacter.txt"
// Synchronous
function restoreUser(message) {
	var userID = message.author.id
	var userPath = path.join('.', 'userdata', userID, currentCharacterFileName)

	try {
		character = fs.readFileSync(userPath, 'utf8');
		return loadUserData(message, character, true)
	} catch (err) {
		console.log("Could not restore character: " + userPath)
		console.log(err)
		return null
	}
}

function isValidCharacterName(character) {
	return character != null && character.length > 0 && character.length < 128 && helper.isAlphaNumeric(character)
}

// Synchronous
function listUserData(message) {
	var userID = message.author.id
	var userPath = path.join('.', 'userdata', userID)
	try {
		var characterNames = fs.readdirSync(userPath).filter(fileName => fileName.endsWith(".json")).map(fileName => fileName.replace(".json", ""))
		message.channel.send("Characters: " + characterNames.join(", "))
	} catch (err) {
		message.channel.send("No characters. ")
		return
	}

}

// Synchronous
function saveUserData(skUser, message, silent) {
	if(skUser.characterName == null){
		if(!silent){
			message.channel.send("Please create a character before trying to save it.")
		}
		return
	}
	var userID = message.author.id
	var userdataJSON = JSON.stringify(skUser)
	var userPath = path.join('.', 'userdata', userID)
	var character = skUser.characterName
	try{
		fs.mkdirSync(userPath, { recursive: true });
		fs.writeFileSync(path.join(userPath, skUser.characterName + ".json"), userdataJSON);
		fs.writeFileSync(path.join(userPath, currentCharacterFileName), character);
		if(!silent){
			message.channel.send("Saved character: " + character)
		}
	} catch (err) {
		console.error(err)
		message.channel.send("Failed to save character.\nSave data: `"+userdataJSON+"`")
	}
}

// Synchronous
function loadUserData(message, character, silent) {
	if(!isValidCharacterName(character)){
		message.channel.send("Invalid character name")
		return null
	}

	var userID = message.author.id
	var userPath = path.join('.', 'userdata', userID)
	var jsonPath = path.join(userPath, character + ".json")
	var jsonString = ""
	var parsedJSON = null
	try {
		jsonString = fs.readFileSync(jsonPath, 'utf8');
	} catch (err) {
		console.log(err)
		message.channel.send("Character not found: " + character)
		return null
	}
	try {
		parsedJSON = JSON.parse(jsonString)
		userArray[message.author] = Object.assign(new sku.SKUser(config.skills, config.attributes), parsedJSON)
	} catch (err) {
		console.log(err)
		message.channel.send("Could not parse json!")
		return null
	}

	userArray[message.author] = Object.assign(new sku.SKUser(config.skills, config.attributes), parsedJSON)

	if(!silent){
		message.channel.send("Loaded " + character)
	}

	try{
		fs.writeFileSync(path.join(userPath, currentCharacterFileName), character);
	} catch (err) {
		console.error(err)
		message.channel.send("Failed to save which character you have selected, this is not a major problem.\nSave data: `" + character + "`")
		return null
	}

	return userArray[message.author]
}

function importCharacter(message, jsonToImport) {
	var parsedJSON = ""
	try{
		parsedJSON = JSON.parse(jsonToImport)
	} catch (err){
		message.channel.send("Invalid JSON")
		return null
	}
	var importedUser = Object.assign(new sku.SKUser(config.skills, config.attributes), parsedJSON)
	var character = importedUser.characterName
	if(!isValidCharacterName(character)){
		message.channel.send("Invalid character name")
		return null
	}

	userArray[message.author] = importedUser
	message.channel.send("Loaded " + character)

	importedUser.reset()
	importedUser.shuffle()
	

	return importedUser
}

function exportCharacter(message, skUser) {
	if(skUser.characterName == null){
		message.channel.send("No character to export, please create one.")
		return null
	}
	message.channel.send("```" + JSON.stringify(skUser) + "```")
}

function createCharacter(message, character) {
	if(!isValidCharacterName(character)){
		message.channel.send("Invalid character name")
		return null
	}
	var author = message.author
	var newUser =  new sku.SKUser(config.skills, config.attributes)
	newUser.characterName = character
	userArray[author] = newUser
	message.channel.send("Successfully created character")
	return newUser
}

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

function sumCardsToFlip(skUser, message, skillsString){
	var elements = skillsString.toLowerCase().trim().split(/\s+/)
	var sum = 0
	for (var i = 0; i < elements.length; i++) {
		var element = elements[i]
		var integer = parseInt(element.replace("+", ""), 10)
		if(Number.isInteger(integer)){
			sum += integer
		} else {
			var disambiguation = disambiguateAlias(message, element)
			if(disambiguation == null){
				return -1337
			} else {
				sum += skUser.skills[disambiguation]
			}
		}
	}
	return sum
}

// The main function responsible for showing the flipped cards 
function flip(skUser, message, argumentString){
	if(argumentString.length == 0){
		argumentString = "1"
	}

	var number = sumCardsToFlip(skUser, message, argumentString)

	// Check for... special cases
	if(number == -1337){
		return
	}
	if(number == 69){
		message.channel.send("nice")
		return
	}
	if(number == 420){
		message.channel.send("blaze it *dab*")
		return
	}
	
	// Make sure it is an integer and not too large
	if(number <= 0){
		message.channel.send("You cannot flip fewer than 1 card")
		return
	} else if (number > 54){
		message.channel.send("You cannot flip more than 54 cards")
		return
	} else {
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

function moveFlip(skUser, message){
	if(skUser.lastMessage == null){
		message.channel.send("Please flip some cards before you try to move the flip.")
	}else{ 
		skUser.lastMessage.delete()
		postHand(skUser, message.channel)
	}
}

function postHand(skUser, channel){
	// Generate the summary string which will be something like "You flipped 1 face card, no jokers, and no criticals."
	var summaryString = skUser.generateSummaryMessage()
	// This is passed to the java image generator code
	var cardString = skUser.hand.join()

	// This calls the java image generation code, and then when it returns we send the summary string and new image to discord
	java.callStaticMethod("ImageGeneratorPrimary", "generateImage", cardString, skUser.isDesperado, function(err, results) {
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

function antijoker(skUser, message, argumentString){
	message.channel.send("", new Discord.MessageAttachment("image/antijoker.gif"))
}