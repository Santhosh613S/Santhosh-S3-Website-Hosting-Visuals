(function () {
  'use strict';
  var NS = 'http://www.w3.org/2000/svg';
  var XL = 'http://www.w3.org/1999/xlink';
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var STEPS = [
    { t: 'Build the landing page locally', s: 'index.html, CSS, JavaScript, demo images',
      plain: 'A website is just files. You make them on your own computer first and check they work before anything goes online.',
      tech: 'Static site: HTML, CSS, JavaScript and image assets. No server-side code.',
      watch: 'The dashed box at the bottom left is your project folder.' },
    { t: 'Create an S3 bucket and upload', s: 'Cloud storage for your files',
      plain: 'Amazon S3 is a giant online folder. You create a bucket with a globally unique name and drop your site files into it.',
      tech: 'Amazon S3 general purpose bucket; objects uploaded with the console, aws s3 sync, or an SDK.',
      watch: 'Purple folder packets travel from your computer into the bucket.' },
    { t: 'Keep the bucket private', s: 'Why not public S3 website hosting?',
      plain: 'S3 can serve a site to the whole internet, but only over plain HTTP, and anyone can fetch files straight from the bucket. A private bucket is safer: only CloudFront is allowed to read it.',
      tech: 'S3 Block Public Access ON; no public bucket policy; static website endpoint not used.',
      watch: 'The red dashed line is direct public access, and it is blocked. The lock marks the private bucket.' },
    { t: 'Create a CloudFront distribution', s: 'S3 REST origin + Origin Access Control',
      plain: 'CloudFront is a delivery network. You point it at your bucket, and give it a special pass so it can read files that nobody else can.',
      tech: 'CloudFront distribution with the S3 REST endpoint as origin and Origin Access Control (OAC). The bucket policy allows the cloudfront.amazonaws.com service principal for this distribution only.',
      watch: 'CloudFront appears in blue. The OAC badge sits on the signed request to S3 and the file coming back.' },
    { t: 'Set the root file and HTTPS', s: 'index.html, redirect HTTP to HTTPS',
      plain: 'When someone opens your address with no file name, CloudFront needs to know which file is the home page. It also sends people to the secure version of the site.',
      tech: 'Default root object = index.html; viewer protocol policy = Redirect HTTP to HTTPS. The default *.cloudfront.net domain uses a CloudFront-provided certificate.',
      watch: 'The visitor’s browser appears. The envelope carries a lock because the request is encrypted (TLS).' },
    { t: 'How edge caching works', s: 'Hits, misses and fetching from S3',
      plain: 'CloudFront keeps copies of your files in data centers near visitors. A copy already there is a hit and returns fast. If it is missing (a miss), CloudFront fetches it from S3 once, then keeps it.',
      tech: 'Edge cache with TTL per cache policy (for example CachingOptimized). Miss: CloudFront → S3 via OAC. Hit: served from the edge location. Invalidate paths after you change files.',
      watch: 'First trip: envelope to S3, folder back, film to the browser (a miss). Second trip: lightning straight from CloudFront (a hit).' },
    { t: 'Get a domain and a hosted zone', s: 'Route 53 holds your DNS records',
      plain: 'A domain is the friendly name people type. Route 53 is the phone book that knows which address that name points to. It only answers name lookups and never carries your website’s files.',
      tech: 'Register or transfer a domain, then create a Route 53 public hosted zone. Point the registrar’s name servers at the zone’s NS records.',
      watch: 'Gold globes are DNS lookups between the browser and Route 53. This is separate from the HTTP request path.' },
    { t: 'Add your own domain with HTTPS', s: 'ACM certificate, alias record',
      plain: 'To show your own name with the padlock, you request a free certificate, prove you own the domain, tell CloudFront to accept that name, and add a Route 53 record pointing the name at CloudFront.',
      tech: 'ACM public certificate requested in us-east-1 (required for CloudFront), DNS validation CNAME in Route 53, alternate domain name (CNAME) on the distribution, Route 53 A/AAAA alias record to the distribution.',
      watch: 'Green ACM joins CloudFront, the gold alias chip appears, and the browser address bar now shows your domain.' },
    { t: 'The whole journey, end to end', s: 'DNS → CloudFront → S3 → page',
      plain: 'The visitor’s browser asks Route 53 where your domain lives, then talks to CloudFront. On a miss CloudFront quietly fetches from private S3. The browser draws the landing page. Later visits are hits.',
      tech: 'DNS resolution (Route 53) → HTTPS GET (CloudFront edge) → on miss, OAC-signed GET (private S3 origin) → response cached and returned → browser renders. Repeat requests: edge cache hit.',
      watch: 'Follow globe, envelope, folder, film and lightning in order. The browser fills with the finished page.' }
  ];

  var PK = {
    dns: ['pDns', '🌐', 1.4], dnsBack: ['pDnsBack', '🌐', 1.4], req: ['pReq', '✉️', 1.3, true],
    miss: ['pMiss', '✉️', 1.3], fetch: ['pFetch', '📁', 1.3], resp: ['pResp', '🎞️', 1.5],
    hit: ['pResp', '⚡', 1.3], up: ['pUp', '📁', 3.2]
  };
  var SCH = {
    2: [['up', 0.2]],
    4: [['miss', 0.2], ['fetch', 1.6]],
    5: [['req', 0.2], ['resp', 1.7]],
    6: [['req', 0], ['miss', 1.5], ['fetch', 2.9], ['resp', 4.3], ['req', 6.4], ['hit', 7.7]],
    7: [['dns', 0.2], ['dnsBack', 1.8]],
    8: [['dns', 0.2], ['dnsBack', 1.8], ['req', 3.6]],
    9: [['dns', 0], ['dnsBack', 1.6], ['req', 3.3], ['miss', 4.8], ['fetch', 6.2], ['resp', 7.6], ['req', 9.7], ['hit', 11]]
  };

  var $ = function (id) { return document.getElementById(id); };
  var svg = $('diagram'), pk = $('packets'), list = $('steps');
  var cur = 1, timer = null, buttons = [];

  STEPS.forEach(function (s, i) {
    var li = document.createElement('li'), b = document.createElement('button');
    b.type = 'button';
    b.innerHTML = '<span class="n">' + (i + 1) + '</span><span><b></b><small></small></span>';
    b.querySelector('b').textContent = s.t;
    b.querySelector('small').textContent = s.s;
    b.addEventListener('click', function () { stop(); go(i + 1); });
    li.appendChild(b); list.appendChild(li); buttons.push(b);
  });

  function mk(tag, attrs) {
    var e = document.createElementNS(NS, tag);
    for (var k in attrs) e.setAttribute(k, attrs[k]);
    return e;
  }

  function buildPackets(step) {
    while (pk.firstChild) pk.removeChild(pk.firstChild);
    var sched = SCH[step];
    if (!sched) return;
    var end = 0;
    sched.forEach(function (p) { end = Math.max(end, p[1] + PK[p[0]][2]); });
    var cycle = end + 1.2;
    sched.forEach(function (p) {
      var d = PK[p[0]], delay = p[1], dur = d[2];
      var g = mk('g', { 'class': 'pk', opacity: reduce ? 1 : 0 });
      var t = mk('text', { 'text-anchor': 'middle', y: 7 }); t.textContent = d[1]; g.appendChild(t);
      if (d[3]) { var l = mk('text', { 'text-anchor': 'middle', x: 12, y: -8, 'font-size': 12 }); l.textContent = '🔒'; l.style.fontSize = '12px'; g.appendChild(l); }
      pk.appendChild(g);
      if (reduce) {
        var path = svg.querySelector('#' + d[0]), pt = path.getPointAtLength(path.getTotalLength() / 2);
        g.setAttribute('transform', 'translate(' + pt.x + ' ' + pt.y + ')');
        return;
      }
      var a = delay / cycle, b = (delay + dur) / cycle;
      var m = mk('animateMotion', { dur: cycle + 's', begin: 'indefinite', repeatCount: 'indefinite', calcMode: 'linear',
        keyPoints: '0;0;1;1', keyTimes: '0;' + a + ';' + b + ';1', fill: 'freeze' });
      var mp = mk('mpath', {}); mp.setAttributeNS(XL, 'href', '#' + d[0]); mp.setAttribute('href', '#' + d[0]);
      m.appendChild(mp);
      var o = mk('animate', { attributeName: 'opacity', dur: cycle + 's', begin: 'indefinite', repeatCount: 'indefinite',
        values: '0;0;1;1;0;0', keyTimes: '0;' + a + ';' + (a + 0.015) + ';' + (b - 0.015) + ';' + b + ';1', calcMode: 'linear' });
      g.appendChild(m); g.appendChild(o);
      if (m.beginElement) { m.beginElement(); o.beginElement(); }
    });
  }

  function go(n) {
    cur = n;
    var s = STEPS[n - 1];
    svg.querySelectorAll('.el').forEach(function (el) {
      var st = +el.getAttribute('data-step');
      el.classList.toggle('on', st <= n);
      el.classList.remove('new');
      if (st === n) { void el.getBoundingClientRect(); el.classList.add('new'); }
    });
    $('urlText').textContent = n >= 8 ? 'https://stratusweather.example' : 'd111111abcdef8.cloudfront.net';
    buttons.forEach(function (b, i) {
      if (i + 1 === n) b.setAttribute('aria-current', 'step'); else b.removeAttribute('aria-current');
      b.classList.toggle('done', i + 1 < n);
    });
    $('capNum').textContent = 'Step ' + n + ' of ' + STEPS.length;
    $('capTitle').textContent = s.t;
    $('capPlain').textContent = s.plain;
    $('capTech').textContent = s.tech;
    $('capWatch').textContent = s.watch + (reduce ? ' (Reduced motion is on, so packets are shown as still icons.)' : '');
    buildPackets(n);
  }

  function stop() { if (timer) { clearInterval(timer); timer = null; } $('auto').setAttribute('aria-pressed', 'false'); $('auto').textContent = 'Auto-play every 5s'; }
  function start() {
    $('auto').setAttribute('aria-pressed', 'true'); $('auto').textContent = 'Pause auto-play';
    timer = setInterval(function () { go(cur >= STEPS.length ? 1 : cur + 1); }, 5000);
  }
  $('auto').addEventListener('click', function () { if (timer) stop(); else start(); });
  $('reset').addEventListener('click', function () { stop(); go(1); });

  var root = document.documentElement, tb = $('theme');
  function theme(t) { root.setAttribute('data-theme', t); tb.textContent = t === 'dark' ? 'Light' : 'Dark'; try { localStorage.setItem('s3viz-theme', t); } catch (e) {} }
  var saved = null; try { saved = localStorage.getItem('s3viz-theme'); } catch (e) {}
  theme(saved || (window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'));
  tb.addEventListener('click', function () { theme(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark'); });

  go(1);
})();
