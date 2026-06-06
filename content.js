// Intercept WebSocket connections and messages from slither.io
(function () {
  const OriginalWebSocket = window.WebSocket;
  let detectedServer = null;
  let lastPos = null;

  // --- sub-packet parser (same logic as bot.py) ---
  function parseSubPackets(data) {
    const d = new Uint8Array(data);
    if (d.length < 1) return [];
    const subs = [];
    if (d[0] < 32) {
      let m = 0;
      while (m < d.length) {
        if (d[m] < 32) {
          if (m + 2 > d.length) break;
          const plen = (d[m] << 8) | d[m + 1];
          m += 2;
          if (m + plen > d.length) break;
          subs.push(d.slice(m, m + plen));
          m += plen;
        } else {
          const plen = d[m] - 32;
          m += 1;
          if (m + plen > d.length) break;
          subs.push(d.slice(m, m + plen));
          m += plen;
        }
      }
    } else {
      subs.push(d);
    }
    return subs;
  }

  function tryParsePosition(data) {
    for (const sub of parseSubPackets(data)) {
      // '=' packet — own snake position (7 bytes)
      if (sub[0] === 0x3D && sub.length === 7) {
        const x = (sub[3] << 8) | sub[4];
        const y = (sub[5] << 8) | sub[6];
        if (x > 0 && y > 0 && (x !== lastPos?.x || y !== lastPos?.y)) {
          lastPos = { x, y };
          chrome.runtime.sendMessage({ type: 'player_pos', data: { x, y } });
        }
      }
      // 'G' packet — own snake angle (extrapolate position)
      if (sub[0] === 0x47 && sub.length >= 3 && lastPos) {
        const iang = (sub[1] << 8) | sub[2];
        const ang = iang * 2 * Math.PI / 65536.0;
        const nx = lastPos.x + Math.round(Math.cos(ang) * 16);
        const ny = lastPos.y + Math.round(Math.sin(ang) * 16);
        if (nx > 0 && ny > 0) {
          lastPos = { x: nx, y: ny };
          chrome.runtime.sendMessage({ type: 'player_pos', data: { x: nx, y: ny } });
        }
      }
    }
  }

  // --- WebSocket monkey-patch ---
  window.WebSocket = function (url, protocols) {
    const urlStr = typeof url === 'string' ? url : url.toString();
    const ws = protocols !== undefined
      ? new OriginalWebSocket(url, protocols)
      : new OriginalWebSocket(url);

    // Detect server from URL
    try {
      if (urlStr.startsWith('ws://') || urlStr.startsWith('wss://')) {
        const u = new URL(urlStr);
        if (u.pathname === '/slither' || u.pathname.startsWith('/slither')) {
          detectedServer = { ip: u.hostname, port: u.port || '444', path: u.pathname };
          chrome.runtime.sendMessage({ type: 'server_detected', data: detectedServer });
        }
      }
    } catch (_) {}

    // Intercept incoming binary messages for position data
    ws.addEventListener('message', function (event) {
      if (event.data instanceof Blob) {
        const reader = new FileReader();
        reader.onload = function () {
          tryParsePosition(new Uint8Array(reader.result));
        };
        reader.readAsArrayBuffer(event.data);
      } else if (event.data instanceof ArrayBuffer) {
        tryParsePosition(new Uint8Array(event.data));
      }
    });

    return ws;
  };

  window.WebSocket.prototype = OriginalWebSocket.prototype;
  window.WebSocket.CONNECTING = OriginalWebSocket.CONNECTING;
  window.WebSocket.OPEN = OriginalWebSocket.OPEN;
  window.WebSocket.CLOSING = OriginalWebSocket.CLOSING;
  window.WebSocket.CLOSED = OriginalWebSocket.CLOSED;

  // Respond to popup queries
  chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
    if (msg && msg.type === 'get_server') {
      sendResponse(detectedServer);
    }
    if (msg && msg.type === 'get_player_pos') {
      sendResponse(lastPos);
    }
  });
})();
