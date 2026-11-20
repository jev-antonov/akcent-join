/* Parent-page tracking: never forward Tally answers or respondent details. */
(() => {
  'use strict';
  const form = document.getElementById('signup-form');
  const consent = document.getElementById('analytics-consent');
  const production = location.hostname === 'join.akcent.live';
  const consentKey = 'akcent.analytics-consent.v1';
  let enabled = false;
  let initialized = false;
  let viewed = false;
  let viewSent = false;
  let pendingSubmission = null;
  const seen = new Set();
  const read = key => { try { return sessionStorage.getItem(key); } catch (_) { return null; } };
  const write = key => { try { sessionStorage.setItem(key, '1'); } catch (_) {} };
  const script = src => {
    const el = document.createElement('script');
    el.async = true;
    el.src = src;
    document.head.appendChild(el);
  };
  // Only known advertising parameters go into the embedded form.
  const embed = new URL(form.dataset.tallySrc);
  const query = new URLSearchParams(location.search);
  for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term', 'campaign_id', 'adset_id', 'ad_id']) {
    if (query.has(key)) embed.searchParams.set(key, query.get(key).slice(0, 200));
  }
  form.dataset.tallySrc = embed.href;

  function trackSubmission(id) {
    if (!enabled) { pendingSubmission = id; return; }
    const key = 'akcent.tally-lead.' + id;
    if (seen.has(id) || read(key)) return;
    seen.add(id);
    write(key);
    window.gtag('event', 'generate_lead', { form_id: 'kdDzb6' });
    window.fbq('track', 'Lead', { content_name: 'Book club signup' }, { eventID: 'tally:' + id });
  }
  function trackView() {
    if (enabled && viewed && !viewSent) {
      viewSent = true;
      window.gtag('event', 'tally_form_view', { form_id: 'kdDzb6' });
    }
  }
  function enable() {
    if (enabled || !production) return;
    enabled = true;
    window['ga-disable-G-E8WK4WWXYW'] = false;
    if (initialized) {
      window.fbq('consent', 'grant');
      trackView();
      if (pendingSubmission) trackSubmission(pendingSubmission);
      return;
    }
    initialized = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag('js', new Date());
    // Keep arbitrary query parameters (including accidental personal data) out of GA.
    const page = new URL(location.origin + location.pathname);
    for (const key of ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term']) {
      if (query.has(key)) page.searchParams.set(key, query.get(key).slice(0, 200));
    }
    window.gtag('config', 'G-E8WK4WWXYW', { page_location: page.href, allow_google_signals: false });
    script('https://www.googletagmanager.com/gtag/js?id=G-E8WK4WWXYW');
    const fbq = window.fbq = function () {
      if (fbq.callMethod) fbq.callMethod.apply(fbq, arguments);
      else fbq.queue.push(arguments);
    };
    fbq.queue = []; fbq.loaded = true; fbq.version = '2.0';
    window._fbq = fbq;
    fbq('init', '940162065122537', {}, { autoConfig: false });
    fbq('set', 'autoConfig', false, '940162065122537');
    fbq('track', 'PageView');
    script('https://connect.facebook.net/en_US/fbevents.js');
    trackView();
    if (pendingSubmission) trackSubmission(pendingSubmission);
  }
  window.addEventListener('message', event => {
    if (event.origin !== 'https://tally.so' || event.source !== form.contentWindow) return;
    let message;
    try { message = typeof event.data === 'string' ? JSON.parse(event.data) : event.data; } catch (_) { return; }
    if (!message || !message.payload || message.payload.formId !== 'kdDzb6') return;
    if (message.event === 'Tally.FormLoaded') { viewed = true; trackView(); }
    if (message.event === 'Tally.FormSubmitted') {
      const id = message.payload.id;
      if (typeof id === 'string' && /^[a-zA-Z0-9_-]{1,100}$/.test(id)) trackSubmission(id);
    }
  });
  function choose(accepted) {
    try { localStorage.setItem(consentKey, JSON.stringify({ accepted, at: Date.now() })); } catch (_) {}
    consent.hidden = true;
    if (accepted) enable();
    else if (enabled) {
      enabled = false;
      pendingSubmission = null;
      window['ga-disable-G-E8WK4WWXYW'] = true;
      window.fbq('consent', 'revoke');
    }
  }
  document.getElementById('analytics-accept').addEventListener('click', () => choose(true));
  document.getElementById('analytics-decline').addEventListener('click', () => choose(false));
  document.getElementById('analytics-settings').addEventListener('click', () => { consent.hidden = false; });
  let saved;
  try { saved = JSON.parse(localStorage.getItem(consentKey)); } catch (_) {}
  if (saved && Date.now() - saved.at < 180 * 86400000) {
    consent.hidden = true;
    if (saved.accepted) enable();
  } else consent.hidden = false;
})();
