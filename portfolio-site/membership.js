/* Public locked gallery. No creator sign-in, uploader, or payment verification code runs in this page. */
(() => {
  'use strict';
  const grid = document.getElementById('member-gallery-grid');
  const status = document.getElementById('member-empty');
  const collectionMeta = document.getElementById('member-collection-meta');
  if (!grid || !status) return;
  const galleryEndpoint = 'https://badbunny-membership-api.onrender.com/api/gallery';
  const API = 'https://badbunny-membership-api.onrender.com';
  let checkoutReady = false;
  let checkoutMode = 'sandbox';
  const money = cents => new Intl.NumberFormat('en-CA',{style:'currency',currency:'CAD'}).format(cents/100);
  function makeCard(item, items=[]) {
    grid.replaceChildren();
    if (!item || typeof item !== 'object') return;
    const video = typeof item.type === 'string' && item.type.startsWith('video/');
    const title = typeof item.title === 'string' ? item.title : 'Private creative drop';
    const description = typeof item.description === 'string' ? item.description : '';
    const priceCents = Number.isSafeInteger(item.priceCents) && item.priceCents >= 100 ? item.priceCents : null;
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
    detail.textContent = description || 'Original work from the private collection. Choose the piece that speaks to you.';
    const price = document.createElement('div');
    price.className = 'member-item-price';
    price.textContent = priceCents===null ? 'Price available soon' : money(priceCents) + ' CAD';
    const pay = document.createElement('button');
    pay.type = 'button';
    pay.className = 'member-cta member-media-pay';
    pay.textContent = 'PAY WITH PAYPAL ↗';
    pay.disabled = !checkoutReady || priceCents===null || !item.id;
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
      'Checkout is paused for now. Explore the collection and return when live payments open';
    const actions = document.createElement('div');
    actions.className = 'member-media-tools';
    actions.append(pay, note);
    card.append(stage, heading, detail, price, actions);
    if (items.length > 1) {
      const picker = document.createElement('div');
      picker.className = 'member-release-picker';
      const label = document.createElement('label');
      label.htmlFor = 'member-release-select';
      label.textContent = 'CHOOSE A RELEASE';
      const select = document.createElement('select');
      select.id = 'member-release-select';
      select.setAttribute('aria-label', 'Choose a private gallery release');
      items.forEach((release,index) => {
        const option = document.createElement('option');
        option.value = String(index);
        option.textContent = typeof release?.title === 'string' ? release.title : 'Private release ' + (index + 1);
        option.selected = release === item;
        select.append(option);
      });
      select.addEventListener('change', () => makeCard(items[Number(select.value)], items));
      picker.append(label,select);
      card.insertBefore(picker,heading);
    }
    grid.append(card);
  }
  async function loadGallery() {
    status.textContent = 'Checking which pieces are available…';
    try {
      const check = await fetch(API+'/api/paypal/health', {headers:{Accept:'application/json'},signal:AbortSignal.timeout(15000)});
      if (check.ok) {
        const result = await check.json();
        checkoutReady = result.connected===true && result.enabled===true;
        checkoutMode = result.mode==='live'?'live':'sandbox';
      }
    } catch { checkoutReady = false; }
    status.textContent = 'Opening the collection…';
    try {
      const response = await fetch(galleryEndpoint, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error('Gallery unavailable');
      const payload = await response.json();
      const items = Array.isArray(payload.items) ? payload.items : [];
      if (!items.length) {
        if (collectionMeta) collectionMeta.textContent = 'The collection is taking shape · New pieces will appear here when published';
        status.textContent = 'The first private releases are being prepared. Explore the preview while the gallery is being curated.';
        return;
      }
      const validPrices = items.map(item=>item?.priceCents).filter(n=>Number.isSafeInteger(n)&&n>=100);
      if (collectionMeta) {
        const count = items.length + (items.length===1?' piece':' pieces');
        const range = validPrices.length===items.length
          ? Math.min(...validPrices)===Math.max(...validPrices)
            ? ' · ' + money(validPrices[0]) + ' CAD'
            : ' · ' + money(Math.min(...validPrices)) + '–' + money(Math.max(...validPrices)) + ' CAD'
          : ' · CAD prices shown per item when available';
        collectionMeta.textContent = count + range + ' · One-time access, no subscription';
      }
      status.textContent = checkoutReady
        ? (checkoutMode==='sandbox' ? 'Preview mode · Payments are simulated, and no private media is unlocked.' : 'Choose a piece below to open secure one-time checkout.')
        : 'Browse below. Checkout is paused while payment setup is completed.';
      makeCard(items[0], items);
    } catch {
      if (collectionMeta) collectionMeta.textContent = 'Collection details are temporarily unavailable';
      status.textContent = 'The collection could not load right now. Enjoy the preview and check back for available pieces and prices.';
    }
  }
  void loadGallery();
})();
