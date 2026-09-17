# ZeevCode Supabase + Docker Deployment

This setup keeps the current Spring Boot backend. Supabase is used as the PostgreSQL database, so the backend does not need to be rewritten.

## 1. Create Supabase

1. Create a Supabase project.
2. Open **Project Settings > Database**.
3. Copy a PostgreSQL connection string.
4. Convert it to JDBC format:

```text
postgresql://HOST:PORT/postgres?sslmode=require
```

becomes:

```text
jdbc:postgresql://HOST:PORT/postgres?sslmode=require
```

For a long-running Spring Boot container, use Supabase's **Direct connection** if it is reachable from your AWS setup. If your AWS network cannot reach Supabase's direct IPv6 endpoint, use **Shared pooler / Session mode** instead.

Avoid **Transaction pooler** for this backend unless you also disable JDBC prepared statements with `prepareThreshold=0`, because Supabase documents that transaction mode does not support prepared statements.

## 2. Configure the Backend Locally

Copy the example env file:

```powershell
Copy-Item zeevCode/.env.example zeevCode/.env
```

or:

```bash
cp zeevCode/.env.example zeevCode/.env
```

Fill in:

- `SPRING_DATASOURCE_URL`
- `SPRING_DATASOURCE_USERNAME`
- `SPRING_DATASOURCE_PASSWORD`
- `FIREBASE_SERVICE_ACCOUNT`
- `YOUTUBE_API_KEY`
- `CORS_ALLOWED_ORIGINS`

When the backend starts, Flyway will create/update tables in Supabase from `zeevCode/src/main/resources/db/migration`.

## 3. Run the Backend

From the repository root:

```powershell
docker compose up --build
```

or:

```bash
docker compose up --build
```

Check:

```text
http://localhost:8081/health
```

Then verify tables appear in Supabase.

## 4. Configure the Frontend

Copy:

```powershell
Copy-Item judge-frontend/.env.example judge-frontend/.env
```

or:

```bash
cp judge-frontend/.env.example judge-frontend/.env
```

For local development:

```env
VITE_API_URL=http://localhost:8081
VITE_WS_URL=http://localhost:8081/ws
```

For Vercel production, set:

```env
VITE_API_URL=https://YOUR_AWS_BACKEND_DOMAIN
VITE_WS_URL=https://YOUR_AWS_BACKEND_DOMAIN/ws
```

## 5. Deploy Backend to AWS

First deploy the backend Docker image. The simplest choices are:

- AWS Lightsail containers for a quick first launch.
- ECS Fargate for a more production-style AWS setup.

Set the same environment variables from `zeevCode/.env.example` in AWS. Do not upload `.env` or Firebase JSON files to git.

## 6. AWS ECS Fargate Deployment - Complete

### What Was Done

1. **ECR Repository**: `zeevcode-backend` created in `ap-south-1`
   - URI: `654353650288.dkr.ecr.ap-south-1.amazonaws.com/zeevcode-backend`
   - Docker image pushed: `zeevcode-backend:latest`

2. **ECS Cluster**: `zeevcode-cluster` created in `ap-south-1`

3. **IAM Roles**:
   - `zeevcode-ecs-task-execution-role` - for ECS task execution
   - Attached policies: `AmazonECSTaskExecutionRolePolicy` + custom `zeevcode-ssm-access`

4. **Networking**:
   - VPC: `vpc-0e43028be77148622` (default VPC)
   - Subnets: `subnet-0269db3de724dc8fd`, `subnet-080fba3b2808faa55`, `subnet-0342371362109690b`
   - Security Group: `sg-073e1b157388a0a6b` (allows inbound port 80 and 8081)
   - Internet Gateway: `igw-06578767a98411221` (attached to VPC)

5. **Load Balancer**:
   - ALB: `zeevcode-alb` (ARN: `arn:aws:elasticloadbalancing:ap-south-1:654353650288:loadbalancer/app/zeevcode-alb/88396c73c23aeb27`)
   - DNS: `zeevcode-alb-1681395799.ap-south-1.elb.amazonaws.com`
   - Target Group: `zeevcode-targets`
   - Listener: HTTP port 80 → forwards to target group
   - Health Check Path: `/health`

6. **ECS Task Definition**: `zeevcode-backend:3`
   - Fargate: 512 CPU, 1024 Memory
   - Environment variables configured (database, CORS, execution provider)
   - HikariCP pool size reduced to 5 (via environment variable `HIKARI_MAX_POOL_SIZE`)
   - Firebase credentials stored in SSM Parameter Store: `/zeevcode/firebase-service-account`
   - CloudWatch logs: `/ecs/zeevcode-backend`

7. **ECS Service**: `zeevcode-backend-service`
   - Status: ACTIVE, 1 running task

### Issues Resolved

1. **Supabase Connection Pool Exhausted** - Fixed by reducing HikariCP pool size to 5
2. **ALB Health Check Failed (401)** - Fixed by changing health check path from `/` to `/health`
3. **Security Group Missing Port 80** - Fixed by adding inbound rule for port 80

### Verification Results

- Health endpoint returns `{"status":"ok"}` through ALB
- API endpoints return proper responses (tested `/api/submissions/match/00000000-0000-0000-0000-000000000000`)
- Firebase Admin SDK initialized successfully
- Flyway migrations validated successfully

### AWS Resources Created

| Resource | Name/ID | ARN/Details |
|----------|---------|-------------|
| ECR Repository | `zeevcode-backend` | `654353650288.dkr.ecr.ap-south-1.amazonaws.com/zeevcode-backend` |
| ECS Cluster | `zeevcode-cluster` | `arn:aws:ecs:ap-south-1:654353650288:cluster/zeevcode-cluster` |
| ECS Task Definition | `zeevcode-backend:3` | `arn:aws:ecs:ap-south-1:654353650288:task-definition/zeevcode-backend:3` |
| ECS Service | `zeevcode-backend-service` | `arn:aws:ecs:ap-south-1:654353650288:service/zeevcode-cluster/zeevcode-backend-service` |
| ALB | `zeevcode-alb` | `zeevcode-alb-1681395799.ap-south-1.elb.amazonaws.com` |
| Target Group | `zeevcode-targets` | `arn:aws:elasticloadbalancing:ap-south-1:654353650288:targetgroup/zeevcode-targets/be90f63399bed366` |
| Security Group | `zeevcode-backend-sg` | `sg-073e1b157388a0a6b` (ports 80 and 8081 open) |
| IAM Role | `zeevcode-ecs-task-execution-role` | `arn:aws:iam::654353650288:role/zeevcode-ecs-task-execution-role` |
| SSM Parameter | `/zeevcode/firebase-service-account` | SecureString |
| CloudWatch Log Group | `/ecs/zeevcode-backend` | `ap-south-1` |

### Cleanup Commands (if needed)

```powershell
# Scale down
aws ecs update-service --cluster zeevcode-cluster --service zeevcode-backend-service --desired-count 0

# Delete service
aws ecs delete-service --cluster zeevcode-cluster --service zeevcode-backend-service --force

# Delete task definition (deregister)
aws ecs deregister-task-definition --task-definition zeevcode-backend:3

# Delete ALB
aws elbv2 delete-load-balancer --load-balancer-arn arn:aws:elasticloadbalancing:ap-south-1:654353650288:loadbalancer/app/zeevcode-alb/88396c73c23aeb27
aws elbv2 delete-target-group --target-group-arn arn:aws:elasticloadbalancing:ap-south-1:654353650288:targetgroup/zeevcode-targets/be90f63399bed366

# Delete security group
aws ec2 delete-security-group --group-id sg-073e1b157388a0a6b

# Delete ECS cluster
aws ecs delete-cluster --cluster zeevcode-cluster

# Delete ECR repository
aws ecr delete-repository --repository-name zeevcode-backend --force

# Delete IAM role and policies
aws iam delete-role-policy --role-name zeevcode-ecs-task-execution-role --policy-name zeevcode-ssm-access
aws iam detach-role-policy --role-name zeevcode-ecs-task-execution-role --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
aws iam delete-role --role-name zeevcode-ecs-task-execution-role

# Delete SSM parameter
aws ssm delete-parameter --name /zeevcode/firebase-service-account

# Delete CloudWatch log group
aws logs delete-log-group --log-group-name /ecs/zeevcode-backend
```

## Important

Rotate any API keys that were previously committed to the repo before going public or production.
