# EC2 MongoDB Notes

## Current status

MongoDB is installed and running on the EC2 host as of 2026-03-11.

- Public IP: `54.180.109.237`
- Private IP: `172.31.43.74`
- OS: Ubuntu 22.04.5 LTS
- MongoDB version: `7.0.30`
- Service: `mongod` enabled with systemd

## Server configuration

- `bindIp` is set to `127.0.0.1,172.31.43.74`
- `authorization` is enabled
- UFW is currently inactive on the host

This means MongoDB accepts:

- local connections on the instance
- private VPC connections to `172.31.43.74:27017`

It should not be exposed to the public internet through the security group.

## Credentials

Application and admin credentials were created on the EC2 host.

They are stored only on the server at:

```bash
/home/ubuntu/relay-story-studio-mongodb.txt
```

That file is `600` and was intentionally not committed to Git.

## Recommended access pattern

### Local development through SSH tunnel

Use a tunnel instead of opening `27017` publicly:

```bash
ssh -i relay-story-studio-key.pem -L 27018:127.0.0.1:27017 ubuntu@54.180.109.237
```

Then point local development to:

```bash
mongodb://127.0.0.1:27018/relay_story_studio
```

### EC2 or VPC-hosted app server

If the app runs inside the same VPC, use the private IP and allow `27017` only from the app server security group.

## AWS security group guidance

- Keep `TCP 22` limited to developer/admin IPs.
- Keep `TCP 27017` closed to `0.0.0.0/0`.
- If a separate app server needs DB access, allow `27017` only from that server security group.

## Basic validation commands

```bash
sudo systemctl status mongod
mongosh --quiet --eval 'db.adminCommand({ ping: 1 })'
ss -ltn | grep 27017
```
