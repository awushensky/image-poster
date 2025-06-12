const allowedUserDids = [
  "did:plc:i63andemyk4z7xv6x7yi4a6l", // flora
  "did:plc:z3charo64t4vybtuaf4psipi", // lumin test
  "did:plc:i63andemyk4z7xv6x7yi4a6l", // king
];

export function isAllowedUser(userDid: string): boolean {
  return !!allowedUserDids.find(did => did === userDid);
}
