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
  },
  isAlphaNumeric(str) {
    var code, i, len;
  
    for (i = 0, len = str.length; i < len; i++) {
      code = str.charCodeAt(i);
      if (!(code > 47 && code < 58) && // numeric (0-9)
          !(code > 64 && code < 91) && // upper alpha (A-Z)
          !(code > 96 && code < 123) &&  // lower alpha (a-z)
          !(code == 45 || code == 95)
          ) {
        return false;
      }
    }
    return true;
  }
}

module.exports = methods;