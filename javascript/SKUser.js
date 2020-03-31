const helper = require('./SharedFunctions.js')

class SKUser{
	constructor(){
		this.deck = [];
		this.hand = [];
		this.discard = [];
		this.lastMessage = null;
		this.reset();
		this.shuffle();
		this.isDesperado = false;
		this.showSummary = true;
		this.driveUsed = 0;
	}

	generateSummaryMessage() {

		var jokers = 0
		var faceCards = 0
		var criticals = 0
		for(var i = 0; i < this.hand.length; i++){
			var card = this.hand[i]
			if(helper.isJoker(card, this.isDesperado)){
				jokers += 1
			} else if(helper.isCritical(card, this.isDesperado)) {
				criticals += 1
			} else if(helper.isFaceCard(card)) {
				faceCards += 1
			}
		}

		// Construct a string to send
		var string = ""

		// Make sure the "you flipped" sentance is grammatically correct 
		console.log(this.showSummary)
		if(this.showSummary){
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
			
			if(criticals == 0){
				string += `and no criticals.\n`
			} else if (criticals == 1){
				string += `and 1 critical!\n`
			} else {
				string += `and ${criticals} criticals!!!\n`
			}
			
			
			if(this.deck.length == 1){
				string += "You have 1 card remaining.\n"
			} else {
				string += "You have " + this.deck.length + " cards remaining.\n"
			}
		}

		// Drive is always shown 
		if (this.driveUsed >= 1){
			string += `Used ${this.driveUsed} drive${"!".repeat(this.driveUsed)}\n`
		}

		// Post result
		return string
	}

	// Discard hand, move criticals and jokers into deck, shuffle deck
	boom(){
		this.discardHand()
		var cardsToShuffleBackIn = []
		// Find the cards to move 
		for(var i = 0; i < this.discard.length; i++){
			if(isCritical(this.discard[i], this.desperado) || isJoker(this.discard[i], this.desperado)){
				cardsToShuffleBackIn.push(this.discard[i])
			}
		}
		// Remove those cards from the hand
		for(var i = 0; i < cardsToShuffleBackIn.length; i++){
			const index = this.discard.indexOf(cardsToShuffleBackIn[i]);
			if (index > -1) {
					this.discard.splice(index, 1);
			}
		}
		// Add cards back to deck, and shuffle deck
		if(cardsToShuffleBackIn.length > 0){
			this.deck = this.deck.concat(cardsToShuffleBackIn)
			this.shuffle()
		}
	}

	// Move jokers back into the deck and shuffle deck 
	pocketJoker(){
		var cardsToShuffleBackIn = []
		for(var i = 0; i < this.hand.length; i++){
			if(isJoker(this.hand[i], this.desperado)){
				cardsToShuffleBackIn.push(this.hand[i])
			}
		}
		for(var i = 0; i < cardsToShuffleBackIn.length; i++){
			const index = this.hand.indexOf(cardsToShuffleBackIn[i]);
			if (index > -1) {
				this.hand.splice(index, 1);
			}
		}
		if(cardsToShuffleBackIn.length > 0){
			this.deck = this.deck.concat(cardsToShuffleBackIn)
			this.shuffle()
		}
	}

	// Manually run this if someone gets a joker 
	schadenfreude(channel) {
		this.discardHand()

		// reveal one card
		let card = this.deal();
		
		if (helper.isFaceCard(card) || helper.isJoker(card, this.desperado)){
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

module.exports.SKUser = SKUser;