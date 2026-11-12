export const $ = (id) => document.getElementById(id);

// el('span', 'card-name', { textContent: hero.name }, ...children)
export function el(tag, className = '', props = {}, ...children) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  Object.assign(node, props);
  node.append(...children);
  return node;
}

export function createActionButton(text, className, onClick, disabled = false) {
  const button = el('button', className, { textContent: text, disabled });
  button.addEventListener('click', onClick);
  return button;
}

// Replaces the contents of `main` with an error message.
export function showLoadError(main = document.querySelector('main')) {
  main.textContent = '';
  main.appendChild(el('p', '', { textContent: 'Error loading hero data', style: 'color: #e74c3c;' }));
}
