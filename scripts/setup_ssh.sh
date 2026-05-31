#!/bin/bash
mkdir -v -m 700 $HOME/.ssh
ssh-keyscan -H $HOST > $HOME/.ssh/known_hosts
printf '%s\n' "$KEY" | sed 's/\r$//' > $HOME/.ssh/id_ed25519
chmod 600 $HOME/.ssh/id_ed25519
