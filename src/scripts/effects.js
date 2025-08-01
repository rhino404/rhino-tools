export function showCorrectEffect(element) {
  element.style.background = '#d4edda';
  element.style.transition = 'background 0.4s';
  setTimeout(() => {
    element.style.background = '';
  }, 600);
}


export function showIncorrectEffect(element) {
  element.style.background = '#f8d7da';
  element.style.transition = 'background 10s';
  setTimeout(() => {
    element.style.background = '';
  }, 10000);
}