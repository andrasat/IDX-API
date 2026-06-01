#!/bin/bash
set -e
mkdir -v -m 700 $HOME/.ssh

# Pin host key from GitHub Secret to prevent MITM on first connect.
# Set SSH_HOST_KEY to the output of: ssh-keyscan -t ed25519 <host>
if [ -n "$SSH_HOST_KEY" ]; then
  printf '%s\n' "$SSH_HOST_KEY" > $HOME/.ssh/known_hosts
else
  echo 'WARNING: SSH_HOST_KEY not set, falling back to trust-on-first-use'
  ssh-keyscan -H $HOST >> $HOME/.ssh/known_hosts 2>/dev/null
fi

printf '%s\n' "$KEY" | sed 's/\r$//' > /tmp/id_ed25519_encrypted
chmod 600 /tmp/id_ed25519_encrypted

if [ -n "$SSH_PASSPHRASE" ]; then
  ssh-keygen -p -P "$SSH_PASSPHRASE" -N "" -f /tmp/id_ed25519_encrypted
fi

mv /tmp/id_ed25519_encrypted $HOME/.ssh/id_ed25519
chmod 600 $HOME/.ssh/id_ed25519

cat > $HOME/.ssh/config <<EOF
Host vps
  HostName $HOST
  User $USERNAME
  IdentityFile $HOME/.ssh/id_ed25519
  StrictHostKeyChecking yes
EOF
chmod 600 $HOME/.ssh/config
