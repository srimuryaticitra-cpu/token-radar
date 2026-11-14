/* Tortoise Radar — the dashboard's whole brain, no network, no framework.
   Reads window.RADAR (written by main.ts from the same board as board.json),
   renders the board, filters and sorts it, and opens a detail view per
   protocol with the farm plan the page itself generates from the row. */
(function () {
  'use strict';
  var D = window.RADAR;
  if (!D) { document.body.innerHTML = '<p style="padding:24px">Radar data missing: run main.ts first.</p>'; return; }

  var params = new URLSearchParams(location.search);
  var $ = function (id) { return document.getElementById(id); };

  function money(n) {
    if (n >= 1e9) return '$' + (n / 1e9).toFixed(2) + 'B';
    if (n >= 1e6) return '$' + (n / 1e6).toFixed(1) + 'M';
    if (n >= 1e3) return '$' + (n / 1e3).toFixed(1) + 'K';
    return '$' + n;
  }
  function pct(v) {
    if (v === null || v === undefined) return '<span class="flat">—</span>';
    var c = v > 0 ? 'up' : v < 0 ? 'down' : 'flat';
    return '<span class="' + c + '">' + (v > 0 ? '+' : '') + v.toFixed(1) + '%</span>';
  }
  function ageText(days) {
    if (days === null || days === undefined) return '—';
    if (days < 30) return days + 'd';
    if (days < 365) return Math.round(days / 30) + 'mo';
    return (days / 365).toFixed(1) + 'y';
  }
  function esc(s) {
    return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ---- header + stats ---- */
  $('snapLine').textContent = 'Snapshot ' + D.as_of + ' · DefiLlama protocols · watchlist floor ' + money(D.floor_usd);
  var watch = D.rows.filter(function (r) { return r.rank <= D.watchlist_size || D.watchlist_size === 0; });
  var med = D.rows.slice().sort(function (a, b) { return a.implied_value_usd - b.implied_value_usd; })[Math.floor(D.rows.length / 2)];
  var cats = {};
  D.rows.forEach(function (r) { cats[r.category || 'Uncategorised'] = (cats[r.category || 'Uncategorised'] || 0) + 1; });
  var topCat = Object.keys(cats).sort(function (a, b) { return cats[b] - cats[a]; })[0];
  $('stats').innerHTML = [
    ['Protocols on the board', D.board_size],
    ['Watchlist (≥ ' + money(D.floor_usd) + ')', D.watchlist_size],
    ['Early finds below the floor', D.early_size],
    ['Median implied value', money(med.implied_value_usd)],
    ['Biggest category', topCat + ' (' + cats[topCat] + ')'],
    ['Already trading (comps)', D.live_size]
  ].map(function (s) { return '<div class="stat"><b>' + esc(s[1]) + '</b><span>' + esc(s[0]) + '</span></div>'; }).join('');

  /* ---- filter controls ---- */
  var catSel = $('cat'), chainSel = $('chain');
  Object.keys(cats).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c + ' (' + cats[c] + ')'; catSel.appendChild(o);
  });
  var chains = {};
  D.rows.forEach(function (r) { r.chains.forEach(function (c) { chains[c] = (chains[c] || 0) + 1; }); });
  Object.keys(chains).sort().forEach(function (c) {
    var o = document.createElement('option'); o.value = c; o.textContent = c + ' (' + chains[c] + ')'; chainSel.appendChild(o);
  });
  if (params.get('q')) $('q').value = params.get('q');
  if (params.get('cat')) catSel.value = params.get('cat');
  if (params.get('chain')) chainSel.value = params.get('chain');
  if (params.get('sort')) $('sort').value = params.get('sort');
  if (params.get('watchlist') === '1') $('watchOnly').checked = true;

  /* ---- farm plan, generated in the page from the row itself ---- */
  function capitalFor(r) {
    if (r.tvl_usd >= 1e9) return 250;
    if (r.tvl_usd >= 1e8) return 150;
    if (r.tvl_usd >= 25e6) return 100;
    return 50;
  }
  function holdFor(r) {
    if (r.age_days === null || r.age_days === undefined) return 45;
    if (r.age_days < 180) return 60;
    if (r.age_days < 365) return 45;
    return 30;
  }
  function actionFor(r, cap, chain) {
    var c = (r.category || '').toLowerCase(), n = r.name;
    if (/lend|cdp|collateral/.test(c)) return 'Supply $' + cap + ' of USDC to ' + n + ' on ' + chain + ' and keep the loan book open.';
    if (/dex|yield|leveraged farm/.test(c)) return 'Provide $' + cap + ' of liquidity to ' + n + '\u2019s main pool on ' + chain + ' and keep the position open.';
    if (/bridge/.test(c)) return 'Bridge $' + cap + ' of USDC into ' + chain + ' through ' + n + ' and use the bridged funds in its app.';
    if (/staking|restak/.test(c)) return 'Stake $' + cap + ' of the chain\u2019s staking asset through ' + n + ' and keep the receipt token.';
    if (/perpetual|derivative/.test(c)) return 'Deposit $' + cap + ' of USDC as margin on ' + n + ' and open one small hedged trade.';
    if (/prediction/.test(c)) return 'Fund $' + cap + ' and take one position in a market on ' + n + '.';
    if (/curator|allocator|vault/.test(c)) return 'Deposit $' + cap + ' into a ' + n + ' vault on ' + chain + ' and keep the shares.';
    if (/stable/.test(c)) return 'Mint or deposit $' + cap + ' of the stable asset through ' + n + ' on ' + chain + '.';
    if (/rwa/.test(c)) return 'Mint $' + cap + ' of the protocol\u2019s yield-bearing asset on ' + chain + ' and hold it.';
    if (/insurance/.test(c)) return 'Buy $' + cap + ' of cover from ' + n + ' on ' + chain + ' and keep the policy live.';
    if (/launchpad/.test(c)) return 'Join one ' + n + ' launch with $' + cap + ' on ' + chain + ' and hold the allocation.';
    return 'Deposit $' + cap + ' of USDC into ' + n + ' on ' + chain + ' and keep the position open.';
  }
  function farmSteps(r) {
    var chain = r.chains[0] || 'its main chain', cap = capitalFor(r), hold = holdFor(r);
    var second = r.chains.length > 1 ? r.chains[1] : null;
    return [
      'Use a fresh wallet that holds only the funds you plan to farm, and keep its seed phrase offline on paper. Cost: under $3 of gas for the first transaction. Time: 5 minutes.',
      actionFor(r, cap, chain) + ' Cost: $' + cap + ' of capital and about $' + (cap >= 150 ? 8 : 4) + ' of gas. Time: 15 minutes to set up.',
      (second === null
        ? 'Do one different on-chain action on ' + chain + ' each week, such as a swap, a borrow or a vote, so the wallet looks used and not scripted.'
        : 'Repeat the same position on ' + second + ' with half the capital, so the farm covers two of the protocol\u2019s chains.') +
        ' Cost: about $2 of gas a week. Time: 10 minutes a week.',
      'Hold the position for at least ' + hold + ' days so the activity is counted in more than one snapshot. Cost: the $' + cap + ' stays in the position. Time: ' + hold + ' days.',
      'Once a month, open the protocol\u2019s own points or rewards page from its own site and check the position is counted. Cost: no fee to check, and never pay anyone to claim. Time: 10 minutes a month.',
      'If the protocol opens a testnet, a quest or a governance vote, take part once with the same wallet. Cost: testnet is free; a vote costs about $1 of gas. Time: 15 minutes when it opens.',
      'Write the wallet, the dates and every transaction in a farm log, and unwind slowly when you leave instead of withdrawing everything at once. Cost: nothing but the log. Time: 5 minutes.'
    ];
  }

  /* ---- board ---- */
  var watchSet = {};
  D.watchlist.forEach(function (s) { watchSet[s] = true; });
  function isWatch(r) { return !!watchSet[r.slug]; }
  function filtered() {
    var q = $('q').value.trim().toLowerCase();
    var cat = catSel.value, chain = chainSel.value, wOnly = $('watchOnly').checked;
    var rows = D.rows.filter(function (r) {
      if (wOnly && !isWatch(r)) return false;
      if (cat && (r.category || 'Uncategorised') !== cat) return false;
      if (chain && r.chains.indexOf(chain) === -1) return false;
      if (q && (r.name.toLowerCase().indexOf(q) === -1 && r.slug.indexOf(q) === -1)) return false;
      return true;
    });
    var s = $('sort').value;
    var by = {
      value: function (a, b) { return b.implied_value_usd - a.implied_value_usd; },
      tvl: function (a, b) { return b.tvl_usd - a.tvl_usd; },
      growth: function (a, b) { return (b.change_7d || 0) - (a.change_7d || 0); },
      age: function (a, b) { return (b.age_days || 0) - (a.age_days || 0); },
      name: function (a, b) { return a.name.localeCompare(b.name); }
    }[s] || byValue;
    function byValue(a, b) { return b.implied_value_usd - a.implied_value_usd; }
    rows.sort(by);
    return rows;
  }
  function render() {
    var rows = filtered();
    $('count').textContent = rows.length + ' of ' + D.rows.length + ' protocols';
    $('rows').innerHTML = rows.map(function (r) {
      var sig = isWatch(r) ? '<span class="pill watch">WATCHLIST</span>' : '<span class="pill early">EARLY</span>';
      return '<tr data-slug="' + esc(r.slug) + '"><td>' + r.rank + '</td>' +
        '<td class="name"><b>' + esc(r.name) + '</b><br><span class="slug">' + esc(r.slug) + '</span></td>' +
        '<td>' + esc(r.category || '—') + '</td><td>' + esc(r.chains.slice(0, 3).join(', ')) + (r.chains.length > 3 ? ' +' + (r.chains.length - 3) : '') + '</td>' +
        '<td class="num">' + money(r.tvl_usd) + '</td><td class="num">' + pct(r.change_7d) + '</td>' +
        '<td class="num">' + ageText(r.age_days) + '</td>' +
        '<td class="num"><b>' + money(r.implied_value_usd) + '</b></td><td>' + sig + '</td></tr>';
    }).join('');
  }
  $('rows').addEventListener('click', function (e) {
    var tr = e.target.closest('tr');
    if (tr) showDetail(tr.getAttribute('data-slug'));
  });
  ['q', 'cat', 'chain', 'sort', 'watchOnly'].forEach(function (id) {
    $(id).addEventListener('input', render);
    $(id).addEventListener('change', render);
  });

  /* ---- detail view ---- */
  function showDetail(slug) {
    var r = null;
    D.rows.forEach(function (x) { if (x.slug === slug) r = x; });
    if (!r) return;
    document.querySelectorAll('#rows tr').forEach(function (tr) { tr.classList.toggle('sel', tr.getAttribute('data-slug') === slug); });
    var steps = farmSteps(r);
    $('detail').innerHTML =
      '<h2>#' + r.rank + ' ' + esc(r.name) + ' ' + (isWatch(r) ? '<span class="pill watch">WATCHLIST</span>' : '<span class="pill early">EARLY FIND</span>') + '</h2>' +
      '<p class="sub">' + esc(r.slug) + ' · ' + esc(r.category || 'Uncategorised') + ' · ' + esc(r.chains.join(', ')) +
      ' · tracked since ' + (r.listed_at || 'unknown') + ' · records no token</p>' +
      '<div class="grid">' +
      '<div class="cell"><b>' + money(r.implied_value_usd) + '</b><span>Implied value</span></div>' +
      '<div class="cell"><b>' + money(r.tvl_usd) + '</b><span>TVL</span></div>' +
      '<div class="cell"><b>' + r.comp_multiple.toFixed(2) + '×</b><span>Comp multiple</span></div>' +
      '<div class="cell"><b>' + r.growth_multiplier.toFixed(2) + '×</b><span>Growth mult.</span></div>' +
      '<div class="cell"><b>' + r.maturity_multiplier.toFixed(2) + '×</b><span>Maturity mult.</span></div>' +
      '<div class="cell"><b>' + r.breadth_multiplier.toFixed(2) + '×</b><span>Breadth mult.</span></div>' +
      '</div>' +
      '<p class="formula">implied = TVL × comp × growth × maturity × breadth = ' +
      money(r.tvl_usd) + ' × ' + r.comp_multiple.toFixed(2) + ' × ' + r.growth_multiplier.toFixed(2) +
      ' × ' + r.maturity_multiplier.toFixed(2) + ' × ' + r.breadth_multiplier.toFixed(2) +
      ' ≈ ' + money(r.implied_value_usd) + '</p>' +
      '<h3>Farm plan — seven slow steps</h3><ol>' +
      steps.map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('') + '</ol>';
    $('detail').scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }

  /* ---- live-token panel ---- */
  $('liveRows').innerHTML = D.live.map(function (p) {
    return '<tr><td class="name"><b>' + esc(p.name) + '</b><br><span class="slug">' + esc(p.slug) + '</span></td>' +
      '<td>' + esc(p.category || '—') + '</td><td class="num">' + money(p.tvl_usd) + '</td>' +
      '<td class="num">' + (p.mcap_usd ? money(p.mcap_usd) : '—') + '</td><td class="num">' + pct(p.change_7d) + '</td></tr>';
  }).join('');

  /* ---- method ---- */
  $('methodText').textContent =
    'Each protocol\u2019s implied value is its TVL times the median market-cap-to-TVL multiple of token-bearing peers in its own category ' +
    '(winsorized to 0.02–1.50; categories with fewer than 3 priced peers use the whole market\u2019s median of 0.20), ' +
    'times a growth multiplier from its 7-day TVL change (clamped −50% to +100%, weight 0.60), ' +
    'times a maturity multiplier from how long it has run with no token (0.70–1.00 over 3 years), ' +
    'times a breadth multiplier for the chains it runs on (+5% per extra chain, up to 6). ' +
    'No protocol name is ever special-cased: the same function scores every row. ' +
    'Wrapped, staked and bridged products and exchanges are left out entirely — a token that already trades is not a launch waiting to happen.';

  render();
  var slug = params.get('slug');
  var hasFilter = params.get('q') || params.get('cat') || params.get('chain') || params.get('watchlist') === '1';
  if (slug) showDetail(slug);
  else if (!hasFilter && D.rows.length) showDetail(D.rows[0].slug);
})();
