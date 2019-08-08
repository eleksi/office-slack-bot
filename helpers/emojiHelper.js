emojiPlaceholder = '§smil3y§';
module.exports.removeEmojis = function(message) {
  const emojiRegex = /:([^ :]+):/g;
  const entities = matchEntities(message, emojiRegex);
  let emojis = [];

  for (const [, element] of entities.entries()) {
    emojis.push(element.entity);
    message = message.replace(element.entity, emojiPlaceholder);
  }

  return { msgWithoutEmojis: message, emojis };
};

module.exports.returnEmojis = function(message, emojis) {
  for (const emoji of emojis) {
    message = message.replace(emojiPlaceholder, emoji);
  }

  return message;
};

function matchEntities(text, pattern) {
  const entities = [];
  let match;

  while ((match = pattern.exec(text)) !== null) {
    entities.push({
      entity: match[0],
      id: match[1]
    });
  }

  return entities;
}
