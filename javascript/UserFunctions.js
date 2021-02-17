module.exports = {user, disambiguateAlias, setUserData, restoreUser, isValidCharacterName, listUserData, saveUserData, loadUserData, importCharacter, exportCharacter, createCharacter, deleteCharacter};

const fs = require('fs')
const path = require('path');
const helper = require('./SharedFunctions.js')
const index = require('./index.js')
const sku = require('./SKUser.js');

var currentCharacterFileName = "currentCharacter.txt"
var config = index.getConfig()
var userArray = index.getUserArray()

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
        var stripIndex = rawCommand.indexOf("{")
        if(stripIndex == -1){
            message.channel.send("Usage: `user import <json string>`")
            return
        }
		var jsonToImport = rawCommand.substr(stripIndex).trim()
		saveUserData(skUser, message, true)
        var importedCharacter = importCharacter(message, jsonToImport)
        if(importedCharacter != null){
			saveUserData(importedCharacter, message, true)
		}
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
	if(command.startsWith("delete")){
		var character = command.split(" ")[1]
		saveUserData(skUser, message, true)
		deleteCharacter(message, character)
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
	if(setCommand.trim().length < 1){
		message.channel.send("Usage: `user set <skill/attribute> <number>`")
		return null
	}
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
	if(character.trim().length < 1){
		message.channel.send("Usage: `user load <character name>`")
		return null
	}
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

function characterExists(message, character){
    var userID = message.author.id
    var userPath = path.join('.', 'userdata', userID)
    var characterNames
    try {
		characterNames = fs.readdirSync(userPath).filter(fileName => fileName.endsWith(".json")).map(fileName => fileName.replace(".json", ""))
    } catch (err) {
        return false
    }
    return characterNames.includes(character)
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
    if(characterExists(message, character)){
        message.channel.send("Character already exist: " + character)
        return
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
    var deepCopy = JSON.parse(JSON.stringify(skUser))
    delete deepCopy.hand
    delete deepCopy.deck
    delete deepCopy.discard
    delete deepCopy.lastMessage
    delete deepCopy.driveUsed
    delete deepCopy.heroPointUsed
	message.channel.send("```" + JSON.stringify(deepCopy) + "```")
}

function createCharacter(message, character) {
	if(!character || character.trim().length < 1){
		message.channel.send("Usage: `user create <character name>`")
		return null
	}
	if(!isValidCharacterName(character)){
		message.channel.send("Invalid character name")
		return null
	}
    if(characterExists(message, character)){
        message.channel.send("Character already exist: " + character)
        return null
    }

	var author = message.author
	var newUser = new sku.SKUser(config.skills, config.attributes)
	newUser.characterName = character
	userArray[author] = newUser
	message.channel.send("Successfully created character")
	return newUser
}

function deleteCharacter(message, character) {
	if(!character || character.trim().length < 1){
		message.channel.send("Usage: `user delete <character name>`")
		return null
	}
	if(!isValidCharacterName(character)){
		message.channel.send("Invalid character name")
		return null
    }
    if(!characterExists(message, character)){
        message.channel.send("Character does not exist")
		return null
    }
	var userID = message.author.id
	var userPath = path.join('.', 'userdata', userID, character + ".json")
    var currentCharacterPath = path.join('.', 'userdata', userID, currentCharacterFileName)
    try {
        fs.unlinkSync(currentCharacterPath)
	} catch(err) { }
	try {
        fs.unlinkSync(userPath)
        
		message.channel.send("Successfully deleted: " + character)
	} catch(err) {
        console.log(err)
        message.channel.send("Failed to delete: " + character)
        return null
	}

    userArray[message.author] = new sku.SKUser(config.skills, config.attributes)
    
}