# Deploys the zeevCode backend to AWS ECS (Fargate) with Razorpay payment env vars.
# Prereq: valid AWS SSO session (run `aws login` first).
# Razorpay values are read from zeevCode\.env at runtime — never hardcoded here.
param(
    [string]$Tag = (git rev-parse --short HEAD),
    [string]$Cluster = "zeevcode-cluster",
    [string]$Service = "zeevcode-backend-service",
    [string]$EcrRepo = "zeevcode-backend",
    [string]$Region = "ap-south-1"
)
$ErrorActionPreference = "Stop"
$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$envFile = Join-Path $root "zeevCode\.env"

$envVars = @{}
Get-Content $envFile | ForEach-Object {
    if ($_ -match '^([A-Za-z0-9_]+)=(.*)$') { $envVars[$matches[1]] = $matches[2] }
}
foreach ($k in "RAZORPAY_KEY_ID", "RAZORPAY_KEY_SECRET", "RAZORPAY_WEBHOOK_SECRET") {
    if (-not $envVars[$k]) { throw "Missing $k in zeevCode\.env" }
}

Write-Host "==> Building image zeevcode-backend:$Tag (multi-stage maven build, ~a few minutes)"
docker build -t "zeevcode-backend:$Tag" (Join-Path $root "zeevCode")

$accountId = (aws sts get-caller-identity --query Account --output text).Trim()
$ecrHost = "$accountId.dkr.ecr.$Region.amazonaws.com"

Write-Host "==> Pushing to ECR $ecrHost/$EcrRepo ($Tag + latest)"
aws ecr get-login-password --region $Region | docker login --username AWS --password-stdin $ecrHost | Out-Null
docker tag "zeevcode-backend:$Tag" "$ecrHost/$EcrRepo:$Tag"
docker push "$ecrHost/$EcrRepo:$Tag"
docker tag "zeevcode-backend:$Tag" "$ecrHost/$EcrRepo:latest"
docker push "$ecrHost/$EcrRepo:latest"

Write-Host "==> Writing SSM parameters /zeevcode/razorpay-*"
aws ssm put-parameter --name /zeevcode/razorpay-key-id --type String --value $envVars["RAZORPAY_KEY_ID"] --overwrite | Out-Null
aws ssm put-parameter --name /zeevcode/razorpay-key-secret --type SecureString --value $envVars["RAZORPAY_KEY_SECRET"] --overwrite | Out-Null
aws ssm put-parameter --name /zeevcode/razorpay-webhook-secret --type SecureString --value $envVars["RAZORPAY_WEBHOOK_SECRET"] --overwrite | Out-Null

Write-Host "==> Registering new task definition revision (adds RAZORPAY_* env, keeps existing config)"
$tdName = (aws ecs describe-services --cluster $Cluster --services $Service --query "services[0].taskDefinition" --output text).Trim()
$td = aws ecs describe-task-definition --cluster $Cluster --task-definition $tdName --query taskDefinition --output json | ConvertFrom-Json
$cont = $td.containerDefinitions[0]

$cont.image = "$ecrHost/$EcrRepo:$Tag"
$cont.environment = @($cont.environment | Where-Object { $_.name -notin @('RAZORPAY_KEY_ID', 'RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET') })
$cont.environment += @(@{ name = 'RAZORPAY_KEY_ID'; value = $envVars['RAZORPAY_KEY_ID'] })
$cont.secrets = @($cont.secrets | Where-Object { $_.name -notin @('RAZORPAY_KEY_SECRET', 'RAZORPAY_WEBHOOK_SECRET') })
$cont.secrets += @(
    @{ name = 'RAZORPAY_KEY_SECRET'; valueFrom = '/zeevcode/razorpay-key-secret' },
    @{ name = 'RAZORPAY_WEBHOOK_SECRET'; valueFrom = '/zeevcode/razorpay-webhook-secret' }
)
$td.revision = $null
$td.containerDefinitions = @($cont)
$contJson = $td.containerDefinitions | ConvertTo-Json -Depth 20

$newTd = aws ecs register-task-definition `
    --family $td.family `
    --requires-compatibilities FARGATE `
    --network-mode awsvpc `
    --cpu $td.cpu --memory $td.memory `
    --execution-role-arn $td.executionRoleArn --task-role-arn $td.taskRoleArn `
    --container-definitions $contJson `
    --query taskDefinition --output json | ConvertFrom-Json
$newRev = $newTd.revision
Write-Host "    registered $($td.family):$newRev"

Write-Host "==> Updating service $Service (rolling deployment)"
aws ecs update-service --cluster $Cluster --service $Service --task-definition "$($td.family):$newRev" --force-new-deployment | Out-Null

Write-Host ""
Write-Host "DONE. Poll:  aws ecs describe-services --cluster $Cluster --services $Service --query 'services[0].deployments[?status==`"RUNNING`"]' "
Write-Host "Verify:      curl http://zeevcode-alb-1681395799.ap-south-1.elb.amazonaws.com/health  (expect {""status"":""ok""})"
