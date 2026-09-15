const menu = document.querySelector('.products-menu');
const trigger = menu.querySelector('button');
const panel = menu.querySelector('.products-panel');
let timer;
let pointerOpened = false;
let openBeforePointerDown = false;
const setOpen = (open) => {
  clearTimeout(timer);
  trigger.setAttribute('aria-expanded', String(open));
  panel.hidden = !open;
};
menu.addEventListener('pointerenter', (event) => {
  if (event.pointerType === 'mouse') { pointerOpened = panel.hidden; setOpen(true); }
});
menu.addEventListener('pointerleave', (event) => {
  if (event.pointerType === 'mouse' && !menu.contains(document.activeElement)) timer = setTimeout(() => setOpen(false), 160);
});
trigger.addEventListener('focus', () => setOpen(true));
trigger.addEventListener('pointerdown', () => { openBeforePointerDown = !panel.hidden; });
trigger.addEventListener('click', (event) => {
  if (pointerOpened) { pointerOpened = false; setOpen(true); }
  else if (event.detail === 0) setOpen(true);
  else setOpen(!openBeforePointerDown);
});
menu.addEventListener('focusout', (event) => { if (!menu.contains(event.relatedTarget)) setOpen(false); });
document.addEventListener('click', (event) => { if (!menu.contains(event.target)) setOpen(false); });
menu.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') { trigger.focus(); setOpen(false); event.preventDefault(); }
  if (event.key === 'ArrowDown' && event.target === trigger) { setOpen(true); panel.querySelector('a').focus(); event.preventDefault(); }
});
