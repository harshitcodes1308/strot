const { spawn } = require('child_process');
const http = require('http');

const server = spawn('npm', ['run', 'dev']);
server.stderr.on('data', data => process.stdout.write('STDERR: ' + data));
server.stdout.on('data', data => {
  process.stdout.write('STDOUT: ' + data);
  if (data.includes('Ready in') || data.includes('Ready')) {
    setTimeout(() => {
      http.get('http://localhost:3000/api/inngest', (res) => {
        let body = '';
        res.on('data', chunk => body += chunk);
        res.on('end', () => {
          console.log('\n\n--- API RESPONSE ---');
          console.log('Status:', res.statusCode);
          console.log('Body:', body);
          setTimeout(() => process.exit(0), 1000);
        });
      });
    }, 1000);
  }
});
setTimeout(() => process.exit(1), 20000);
