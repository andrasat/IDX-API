#!/bin/bash
set -e
mkdir -v -m 700 $HOME/.ssh
ssh-keyscan -H $HOST >> $HOME/.ssh/known_hosts
printf '%s\n' "$KEY" | sed 's/\r$//' > $HOME/.ssh/id_ed25519
chmod 600 $HOME/.ssh/id_ed25519

cat > $HOME/.ssh/config <<EOF
Host vps
  HostName $HOST
  User $USERNAME
  IdentityFile $HOME/.ssh/id_ed25519
  StrictHostKeyChecking accept-new
EOF
chmod 600 $HOME/.ssh/config
