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
panel.addEventListener('click', (event) => { if (event.target.closest('a')) setOpen(false); });

// Fit the complete opening only when the text leaves room for a useful image.
const opening = document.querySelector('.opening');
if (opening) {
  const header = document.querySelector('.site-header');
  const hero = opening.querySelector('.hero');
  let frame;
  const fitOpening = () => {
    const viewportHeight = document.documentElement.clientHeight;
    const headerBottom = header.getBoundingClientRect().bottom + window.scrollY;
    const style = getComputedStyle(opening);
    const spacing = ['--opening-top', '--opening-gap', '--opening-bottom'].reduce((total, name) => total + parseFloat(style.getPropertyValue(name)), 0);
    const available = Math.floor(viewportHeight - headerBottom - hero.getBoundingClientRect().height - spacing);
    const fits = window.innerWidth >= 1024 && viewportHeight >= 760 && available >= 220;
    opening.classList.toggle('is-fitted', fits);
    if (fits) {
      opening.style.setProperty('--opening-height', `${Math.ceil(viewportHeight - headerBottom)}px`);
      opening.style.setProperty('--illustration-height', `${Math.min(available, (opening.clientWidth + 20) / 2)}px`);
    } else {
      opening.style.removeProperty('--opening-height');
      opening.style.removeProperty('--illustration-height');
    }
  };
  const scheduleFit = () => { cancelAnimationFrame(frame); frame = requestAnimationFrame(fitOpening); };
  const observer = new ResizeObserver(scheduleFit);
  observer.observe(header);
  observer.observe(hero);
  window.addEventListener('resize', scheduleFit);
  document.fonts.ready.then(scheduleFit);
  fitOpening();
}
