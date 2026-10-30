import * as ftp from 'basic-ftp';
import path from 'path';

export async function deployToInfinityFree({ host, user, password, remoteDir = 'htdocs' }) {
  const client = new ftp.Client();
  client.ftp.verbose = true;

  try {
    console.log(`\nConnecting to FTP host: ${host} as ${user}...`);
    await client.access({
      host,
      user,
      password,
      secure: false, // InfinityFree standard FTP uses plain FTP on port 21
    });

    console.log('Connected successfully!');
    console.log(`Navigating to remote directory: ${remoteDir}...`);
    
    // Check if remoteDir exists or create/ensure
    await client.ensureDir(remoteDir);
    await client.clearWorkingDir(); // Clean old files if needed

    const localDist = path.resolve(process.cwd(), 'dist');
    console.log(`Uploading contents of ${localDist} into ${remoteDir}...`);
    await client.uploadFromDir(localDist);

    console.log('\n=============================================');
    console.log('SUCCESS: All QuizRay files deployed to InfinityFree!');
    console.log('=============================================\n');
    return true;
  } catch (err) {
    console.error('FTP Deployment failed:', err.message);
    throw err;
  } finally {
    client.close();
  }
}

// Allow CLI invocation
if (process.argv[1] && process.argv[1].endsWith('deploy-infinityfree.mjs')) {
  const host = process.env.FTP_HOST || process.argv[2] || 'ftpupload.net';
  const user = process.env.FTP_USER || process.argv[3];
  const password = process.env.FTP_PASSWORD || process.argv[4];
  const remoteDir = process.env.FTP_DIR || process.argv[5] || 'htdocs';

  if (!user || !password) {
    console.error('Usage: node scripts/deploy-infinityfree.mjs <host> <user> <password> [remoteDir]');
    process.exit(1);
  }

  deployToInfinityFree({ host, user, password, remoteDir })
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
