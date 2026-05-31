#!/bin/bash
set -e
mkdir -v -m 700 $HOME/.ssh
ssh-keyscan -H $HOST >> $HOME/.ssh/known_hosts 2>/dev/null

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
  StrictHostKeyChecking accept-new
EOF
chmod 600 $HOME/.ssh/config
