const http = require('http');

http.get('http://127.0.0.1:8288/api/v1/functions', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Functions:', body));
}).on('error', e => console.error('Error fetching functions:', e));

http.get('http://127.0.0.1:8288/api/v1/events', (res) => {
  let body = '';
  res.on('data', d => body += d);
  res.on('end', () => console.log('Events:', body));
}).on('error', e => console.error('Error fetching events:', e));
