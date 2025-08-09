// utils.js
import { quizMeta } from './quizMeta.js';

export function getIcon(type, value) {
  const item = quizMeta[type]?.find(el => el.value === value);
  if (item?.label) {
    const emojiMatch = item.label.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F)/u);
    return emojiMatch ? emojiMatch[0] : "";
  }
  return "";
}

export function normalizeKey(str = '') {
  return str.toLowerCase().replace(/\s+/g, '-');
}

export function showMessage(msg, type = "info") {
  alert(msg); // Simple fallback, replace with nicer UI if desired
}
