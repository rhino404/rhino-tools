export function showCorrectEffect(element) {
  element.classList.add('correct-effect');
  setTimeout(() => element.classList.remove('correct-effect'), 600);
}

export function showIncorrectEffect(element) {
  element.classList.add('incorrect-effect');
  setTimeout(() => element.classList.remove('incorrect-effect'), 600);
}