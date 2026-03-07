const { execSync } = require('child_process');

console.log('--- Server process.env.PATH ---');
console.log(process.env.PATH || '(empty)');
console.log('--- FFMPEG_PATH env ---');
console.log(process.env.FFMPEG_PATH || '(none)');

const candidates = [];
if (process.env.FFMPEG_PATH) candidates.push(process.env.FFMPEG_PATH);
candidates.push('ffmpeg');
if (process.platform === 'win32') {
  candidates.push('C:\\ffmpeg\\bin\\ffmpeg.exe');
} else {
  candidates.push('/usr/bin/ffmpeg', '/usr/local/bin/ffmpeg');
}

let found = null;
for (const c of candidates) {
  if (!c) continue;
  try {
    const cmd = /\\|\s/.test(c) ? `"${c}" -version` : `${c} -version`;
    const out = execSync(cmd, { stdio: ['ignore', 'pipe', 'pipe'] }).toString();
    console.log('\n--- Candidate succeeded ---');
    console.log('candidate:', c);
    console.log(out.split('\n')[0]);
    found = c;
    break;
  } catch (e) {
    console.error('\n--- Candidate failed ---');
    console.error('candidate:', c);
    console.error(e.message);
  }
}

if (!found) {
  console.error('\nNo ffmpeg executable found by candidates.');
  process.exit(2);
} else {
  console.log('\nResolved ffmpeg:', found);
  process.exit(0);
}
