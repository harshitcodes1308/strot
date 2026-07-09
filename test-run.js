const { spawn } = require('child_process');
const server = spawn('npm', ['run', 'dev']);
server.stderr.on('data', data => process.stdout.write('STDERR: ' + data));
server.stdout.on('data', data => {
  process.stdout.write('STDOUT: ' + data);
});
setTimeout(() => process.exit(0), 10000);
