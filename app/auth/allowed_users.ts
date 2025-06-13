import fs from 'fs';

interface Config {
  allowedUsers: AllowedUser[];
}

interface AllowedUser {
  did: string;
  name: string;
}

const configPath = '/config/config.json';

export function isAllowedUser(userDid: string): boolean {
  try {
    const config = JSON.parse(fs.readFileSync(configPath, 'utf8')) as Config;
    const allowedUserDids = config.allowedUsers.map(user => user.did);
    return !!allowedUserDids.find(did => did === userDid);
  } catch (error) {
    console.error('Could not load allowed users config. Please add some users to enable this app.');
    return false;
  }
}
