const path = require('path');
const sandwich = require('sandwich');
const fs = require('fs');

function fileToArray(file) {
  return (
    fs.readFileSync(path.join(__dirname, '/', file))
      .toString()
      .trim()
      .split('\n')
  );
}

const ADVERBS = fileToArray('adverbs.txt');
const ADJECTIVES = fileToArray('adjectives.txt');
const NOUNS = fileToArray('nouns.txt');
const iterator = sandwich(ADVERBS, ADJECTIVES, NOUNS);

function phrases(count) {
  const matches = {};
  const results = [];
  var length = 0;
  var word;
  while (length < count) {
    word = iterator.random().join('-');
    if (!matches[word]) {
      matches[word] = results.push(word);
      length++;
    }
  }
  return results;
}

phrases.iterator = iterator;
module.exports = phrases;
