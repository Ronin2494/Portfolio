/* Public locked gallery. No creator sign-in, uploader, or payment verification code runs in this page. */
(() => {
  'use strict';
  const grid = document.getElementById('member-gallery-grid');
  const status = document.getElementById('member-empty');
  if (!grid || !status) return;
  const galleryEndpoint = 'https://badbunny-membership-api.onrender.com/api/gallery';
  const API = 'https://badbunny-membership-api.onrender.com';
  let checkoutReady = false;
  let checkoutMode = 'sandbox';
  const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
  function makeCard(item) {
    if (!item || typeof item !== 'object') return;
    const video = typeof item.type === 'string' && item.type.startsWith('video/');
    const title = typeof item.title === 'string' ? item.title : 'Private creative drop';
    const description = typeof item.description === 'string' ? item.description : '';
    const priceCents = Number.isSafeInteger(item.priceCents) && item.priceCents >= 100 ? item.priceCents : 1000;
    const card = document.createElement('article');
    card.className = 'member-media-card';
    const stage = document.createElement('div');
    stage.className = 'member-media-stage member-media-locked';
    const lock = document.createElement('span');
    lock.className = 'member-media-lock-label';
    lock.textContent = video ? '🔒 PRIVATE VIDEO' : '🔒 PRIVATE PHOTO';
    stage.append(lock);
    const heading = document.createElement('h4');
    heading.textContent = title;
    const detail = document.createElement('p');
    detail.textContent = description || 'Exclusive media. Content is hidden until access is verified.';
    const price = document.createElement('div');
    price.className = 'member-item-price';
    price.textContent = money(priceCents) + ' CAD';
    const pay = document.createElement('button');
    pay.type = 'button';
    pay.className = 'member-cta member-media-pay';
    pay.textContent = 'PAY WITH PAYPAL ↗';
    pay.disabled = !checkoutReady;
    pay.setAttribute('aria-label', 'Checkout with PayPal for ' + title + ' (one-time payment)');
    pay.addEventListener('click', async () => {
      pay.disabled = true;
      pay.textContent = 'CREATING SECURE CHECKOUT…';
      try {
        const response = await fetch(API+'/api/paypal/orders', {
          method:'POST',headers:{Accept:'application/json','Content-Type':'application/json'},
          body:JSON.stringify({mediaId:item.id}),signal:AbortSignal.timeout(25000)
        });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'PayPal checkout unavailable.');
        const destination = new URL(data.approvalUrl);
        if (destination.protocol !== 'https:' || !['www.paypal.com','www.sandbox.paypal.com'].includes(destination.hostname)) {
          throw new Error('PayPal returned an invalid checkout destination.');
        }
        window.location.assign(destination.href);
      } catch(error) {
        note.textContent = error.message;
        pay.textContent = 'RETRY PAYPAL CHECKOUT ↗';
        pay.disabled = false;
      }
    });
    const note = document.createElement('span');
    note.className = 'member-pay-note';
    note.textContent = checkoutReady ?
      (checkoutMode==='sandbox' ? 'SANDBOX TEST — no real charge or content unlock' : 'Secure one-time PayPal checkout · CAD') :
      'PayPal checkout is currently disabled; browse the gallery while testing is completed';
    const actions = document.createElement('div');
    actions.className = 'member-media-tools';
    actions.append(pay, note);
    card.append(stage, heading, detail, price, actions);
    grid.append(card);
  }
  async function loadGallery() {
    status.textContent = 'Checking secure checkout…';
    try {
      const check = await fetch(API+'/api/paypal/health', {headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      if (check.ok) {
        const result = await check.json();
        checkoutReady = result.connected===true && result.enabled===true;
        checkoutMode = result.mode==='live'?'live':'sandbox';
      }
    } catch { checkoutReady = false; }
    status.textContent = 'Loading gallery…';
    try {
      const response = await fetch(galleryEndpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Gallery unavailable');
      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      grid.replaceChildren();
      if (!items.length) {
        status.textContent = 'No photos or videos have been published yet. The gallery will fill as new content is added.';
        return;
      }
      status.textContent = '';
      items.forEach(makeCard);
    } catch {
      status.textContent = 'Gallery items are unavailable at the moment. Please check back shortly.';
    }
  }
  void loadGallery();
})();
