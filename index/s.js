
let title = "Once Upon a Time in the Land of the Lost";
//['a','an','the','of','at','by','in','for','to'];
process.env.ES_SUGGEST_SKIP = "a,an,the,of,at,by,in,for,to";
const s = defineSuggestions(title);
console.log(s);

/**
 * Defines an array of suggestions for a video title.
 *
 * Example:
 *  If the title is "Welcome to the Black Parade", we will generate
 *  the following combinations/suggestions...
 *    "Welcome to the Black Parade"
 *    "Black Parade"
 *    "Parade"
 *
 * Note:
 *  We skip common words, and these common words will also be excluded
 *  when the search is performed on the client-side EXCEPT if the
 *  common word is the first word in the search phrase. 
 *  Example: If user searches for 'the' - we will only return titles that begin with 'the'.
 *
 * Explanation...
 *  We define multiple phrases for suggestions to cover all search cases
 *    Input: "Welcome"   // Request: "welcome" // Response: "Welcome to the Black Parade"
 *    Input: "the black" // Request: "black"   // Response: "Welcome to the Black Parade"
 *    Input: "parade"    // Request: "parade"  // Response: "Welcome to the Black Parade"
 *
 * @param {string} title - The full movie title.
 * @return {array} Array holding the combination of suggestion phrases.
 */
function defineSuggestions(title) {
  const suggestions = [];                               // Array to hold all suggestions
  const skip  =  process.env.ES_SUGGEST_SKIP.split(',')  // The skip words 
  const words = title.split(' ');   // Split/explode title into array of each word in title ['The', 'Movie', 'Title']
  // Iterate through each word, starting with 2nd word...
  for (let x=1; x<words.length; x++) {
    let word = words[x];
    // If the word not found in skip word array list...
    if (skip.indexOf(word) === -1) {
      // Iterate through the rest of the words to construct the phrase...
      let phrase = word;
      for (let y=x+1; y<words.length; y++) {
        phrase = phrase +' ' +words[y]; 
      }
      suggestions.push(phrase); // Push full phrase to array
    }
  }
  suggestions.push(title);  // Push the full/original title
  return suggestions;
}
