var methods = {
  isFaceCard(card){
    const faceCardNames = ['Ace', 'Jack', 'Queen', 'King']
    for(var j = 0; j < faceCardNames.length; j++){
      if(card.includes(faceCardNames[j])){
        return true
      }
    }
    return false
  },
  isJoker(card, isDesperado){
    return (card === "Joker") || ((card === "Queen of Diamonds") && isDesperado)  
  },
  isCritical(card, isDesperado){
    return (card === "Queen of Hearts") || ((card === "Ace of Spades") && isDesperado)
  }
}

module.exports = methods;