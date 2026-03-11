# EC2 MongoDB Access Checklist

This checklist exists because direct SSH access to the MongoDB EC2 host is currently blocked.

## Current blocker

As of 2026-03-11, repeated SSH attempts to `15.164.230.158:22` from the project workspace timed out before authentication.

That means the problem is at the network/access layer, not the PEM key itself and not the SSH username.

## What to verify in AWS

### EC2 state

- The instance is in `running` state.
- The instance still has the public IPv4 address `15.164.230.158`.
- The instance was launched in a public subnet if direct SSH from the internet is intended.

### Security group

Inbound rules should include:

- `TCP 22` from your current public IP or temporary `0.0.0.0/0`

Recommended database rule:

- Do **not** open `TCP 27017` to the whole internet.
- If the app server will run on another EC2 instance, allow `27017` only from that app server security group.
- If developers need temporary access, prefer SSH tunneling instead of public MongoDB exposure.

### Networking

- The subnet route table has a default route to an Internet Gateway.
- Network ACLs are not blocking inbound `22` or the response traffic.
- The instance does not rely on a private IP only.

## SSH usernames to try after port 22 opens

- Ubuntu AMI: `ubuntu`
- Amazon Linux AMI: `ec2-user`

## Next steps once SSH opens

1. Detect the AMI and package manager.
2. Install MongoDB Community Server.
3. Enable and start `mongod`.
4. Create an admin user and an application user.
5. Lock down bind/network settings.
6. Hand back the final `MONGODB_URI` for `.env.local` / deployment envs.

## Recommended connection patterns

### Local development through SSH tunnel

Keep MongoDB private on the EC2 host and tunnel it locally:

```bash
ssh -i relay-story-studio-key.pem -L 27018:127.0.0.1:27017 ubuntu@15.164.230.158
```

Then use:

```bash
mongodb://127.0.0.1:27018/relay_story_studio
```

### Direct app-to-DB connection

Only use this when the app runtime is hosted in AWS and the security group allows traffic from that runtime.

```bash
mongodb://<app-user>:<password>@15.164.230.158:27017/relay_story_studio?authSource=admin
```
