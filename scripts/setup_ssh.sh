#!/bin/bash
set -e
mkdir -v -m 700 $HOME/.ssh
ssh-keyscan -H $HOST >> $HOME/.ssh/known_hosts 2>/dev/null
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

if [ -n "$SSH_PASSPHRASE" ]; then
  eval $(ssh-agent -a /tmp/ssh-agent.sock)
  echo '#!/bin/bash' > /tmp/askpass.sh
  echo 'echo "$SSH_PASSPHRASE"' >> /tmp/askpass.sh
  chmod +x /tmp/askpass.sh
  SSH_ASKPASS=/tmp/askpass.sh DISPLAY=1 setsid -w ssh-add $HOME/.ssh/id_ed25519 < /dev/null || {
    echo "ssh-add failed, trying without passphrase..."
    ssh -o ConnectTimeout=5 -o BatchMode=yes vps "echo OK" || echo "SSH connection failed"
  }
fi
