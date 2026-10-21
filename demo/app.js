(function () {
  'use strict';
  var C = [
    ['Mumbai', 30, 'Haze', 66, 6, 10, 'warm'], ['Pune', 27, 'Partly cloudy', 58, 9, 20, 'warm'],
    ['Delhi', 34, 'Sunny', 40, 11, 0, 'warm'], ['Dubai', 39, 'Clear sky', 35, 14, 0, 'warm'],
    ['Singapore', 31, 'Thunderstorm', 82, 12, 85, 'storm'], ['Manila', 29, 'Heavy rain', 90, 22, 95, 'storm'],
    ['Miami', 30, 'Thunderstorm', 78, 18, 70, 'storm'], ['Mumbai Monsoon', 27, 'Heavy rain', 94, 20, 90, 'storm'],
    ['Oslo', -3, 'Light snow', 80, 8, 60, 'cold'], ['Reykjavik', -1, 'Snow showers', 85, 25, 70, 'cold'],
    ['Antarctica', -34, 'Overcast clouds', 98, 13, 5, 'cold'], ['Toronto', 2, 'Cloudy', 70, 16, 30, 'cold'],
    ['Lagos', 32, 'Humid', 79, 10, 40, 'warm'], ['Sydney', 22, 'Sunny', 55, 15, 5, 'warm'], ['London', 12, 'Drizzle', 82, 14, 65, 'storm']
  ].map(function (r) { return { name: r[0], c: r[1], cond: r[2], hum: r[3], wind: r[4], rain: r[5], mood: r[6] }; });
  var GRAD = { warm: 'linear-gradient(160deg,#7a1d0a,#2a0a05)', storm: 'linear-gradient(160deg,#1a2a55,#0a0f24)', cold: 'linear-gradient(160deg,#2c5a7a,#0b1a28)' };
  var ICON = { warm: '☀️', storm: '⛈️', cold: '❄️' };
  var $ = function (s) { return document.querySelector(s); };
  var unit = 'C', cur = C[0], mylist = [];
  try { mylist = JSON.parse(localStorage.getItem('stratus-list') || '[]'); } catch (e) { mylist = []; }

  function t(c) { return unit === 'C' ? Math.round(c) : Math.round(c * 9 / 5 + 32); }
  function find(n) { n = n.trim().toLowerCase(); return C.filter(function (x) { return x.name.toLowerCase() === n; })[0]; }
  function sky(mood) {
    var el = $('#sky'); el.innerHTML = '';
    el.style.setProperty('--sky', GRAD[mood]);
    el.style.setProperty('--glow', mood === 'warm' ? '#ffb34766' : '#7aa7ff44');
    el.className = 'sky' + (mood === 'cold' ? ' snow' : '');
    if (mood === 'warm' || matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    for (var i = 0; i < 40; i++) {
      var d = document.createElement('i');
      d.style.left = (i * 2.5) + '%'; d.style.animationDuration = (1.4 + (i % 5) * .5) + 's'; d.style.animationDelay = (-(i % 7) * .4) + 's';
      el.appendChild(d);
    }
  }
  function hero(c) {
    cur = c;
    $('#hCity').textContent = c.name; $('#hTemp').textContent = t(c.c); $('#hUnit').textContent = '°' + unit;
    $('#hCond').textContent = c.cond; $('#hHum').textContent = c.hum + '%';
    $('#hWind').textContent = (unit === 'C' ? c.wind + ' km/h' : Math.round(c.wind * .62) + ' mph'); $('#hRain').textContent = c.rain + '%';
    $('#listBtn').textContent = mylist.indexOf(c.name) > -1 ? '✓ In my list' : '+ My list';
    sky(c.mood);
  }
  function card(c) {
    var b = document.createElement('button'); b.type = 'button'; b.className = 'card'; b.style.setProperty('--bg', GRAD[c.mood]);
    b.innerHTML = '<em></em><b></b><span></span><span class="more"></span>';
    b.querySelector('em').textContent = t(c.c) + '°';
    b.querySelector('b').textContent = c.name;
    b.children[2].textContent = ICON[c.mood] + ' ' + c.cond;
    b.querySelector('.more').textContent = 'Humidity ' + c.hum + '% · Rain ' + c.rain + '%';
    b.addEventListener('click', function () { hero(c); $('#nf').hidden = true; window.scrollTo({ top: 0 }); });
    return b;
  }
  function fill(id, list) { var r = $(id); r.innerHTML = ''; list.forEach(function (c) { r.appendChild(card(c)); }); }
  function render() {
    fill('#railTrending', C.filter(function (c) { return ['Mumbai', 'Pune', 'Delhi', 'Dubai', 'Sydney', 'Lagos'].indexOf(c.name) > -1; }));
    fill('#railStorm', C.filter(function (c) { return c.mood === 'storm'; }));
    fill('#railCold', C.filter(function (c) { return c.mood === 'cold'; }));
    fill('#railList', C.filter(function (c) { return mylist.indexOf(c.name) > -1; }));
    $('#emptyList').hidden = mylist.length > 0;
  }
  $('#notfound').id = 'nf';
  $('#cities').innerHTML = C.map(function (c) { return '<option value="' + c.name + '">'; }).join('');

  $('#searchForm').addEventListener('submit', function (e) {
    e.preventDefault();
    var c = find($('#q').value);
    if (c) { $('#nf').hidden = true; hero(c); } else { $('#nf').hidden = false; $('#nf').scrollIntoView({ block: 'center' }); }
  });
  document.querySelectorAll('.unit button').forEach(function (b) {
    b.addEventListener('click', function () {
      unit = b.dataset.u;
      document.querySelectorAll('.unit button').forEach(function (x) { x.setAttribute('aria-pressed', String(x === b)); });
      hero(cur); render();
    });
  });
  $('#listBtn').addEventListener('click', function () {
    var i = mylist.indexOf(cur.name);
    if (i > -1) mylist.splice(i, 1); else mylist.push(cur.name);
    try { localStorage.setItem('stratus-list', JSON.stringify(mylist)); } catch (e) {}
    hero(cur); render();
  });
  $('#playBtn').addEventListener('click', function () {
    var names = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'], seed = cur.name.length;
    $('#dTitle').textContent = '5-day forecast · ' + cur.name;
    $('#dBody').innerHTML = names.map(function (d, i) {
      return '<div><b>' + d + '</b>' + t(cur.c + ((seed + i * 3) % 5) - 2) + '°' + unit + '</div>';
    }).join('');
    var dlg = $('#dlg'); if (dlg.showModal) dlg.showModal(); else dlg.setAttribute('open', '');
  });
  $('#signup').addEventListener('submit', function (e) {
    e.preventDefault();
    $('#msg').textContent = 'Thanks! This is a demo, so nothing was sent.'; $('#mail').value = '';
  });
  window.addEventListener('scroll', function () { $('#nav').classList.toggle('solid', window.scrollY > 40); }, { passive: true });
  render(); hero(cur);
})();
