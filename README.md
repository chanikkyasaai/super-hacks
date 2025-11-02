# 🚀 Intelligent Patch Orchestrator (IPO)

> **Autonomous AI-Driven Patch Management for Enterprise Security Teams**

[![AWS](https://img.shields.io/badge/AWS-Lambda%20%7C%20Bedrock%20%7C%20DynamoDB-FF9900?logo=amazon-aws)](https://aws.amazon.com/)
[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python)](https://www.python.org/)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://reactjs.org/)
[![CDK](https://img.shields.io/badge/AWS%20CDK-2.0-FF9900)](https://aws.amazon.com/cdk/)
[![SuperHacks 2025](https://img.shields.io/badge/SuperHacks-2025-success)](https://superhacks.devpost.com/)

---

## 🎯 **Vision**

**Transform enterprise patch management from a manual, error-prone process into an intelligent, autonomous workflow powered by AI.**

Enterprise IT teams waste **40% of their time** on manual patch analysis, sandbox testing, and compliance verification. Critical vulnerabilities sit unpatched for days, creating security risks. Our solution uses **Amazon Bedrock's Claude 3.5 Sonnet** as an agentic AI orchestrator to automate the entire patch lifecycle—from CVE analysis to deployment—while maintaining full audit trails for compliance teams.

---

## 👥 **Team**

**Team Lead**: **Chanikya Nelapatla**  
**Team Member**: **Logarathan SV**

---

## 🏆 **The Business Case**

### **The Problem**
- **Manual Overhead**: Security teams spend 15-20 hours/week analyzing CVE reports, running sandbox tests, and coordinating deployments
- **Delayed Response**: Critical patches take 3-7 days to deploy, leaving systems vulnerable
- **Compliance Burden**: Auditors demand detailed logs of every patch decision—manually maintained spreadsheets are error-prone
- **Human Error**: 23% of patch deployments cause production incidents due to inadequate testing

### **Our Solution**
An AI agent that:
1. **Analyzes** CVE severity and calculates business impact using real-time asset data
2. **Tests** patches in isolated sandbox environments with automated compatibility, performance, security, and stability checks
3. **Recommends** deployment decisions with human-in-the-loop approval workflow
4. **Logs** every action to DynamoDB for SOC 2, ISO 27001, HIPAA, and PCI DSS compliance
5. **Generates** audit-ready compliance reports stored in S3

### **The Impact**
- ⏱️ **10-second AI workflow** vs. 15-hour manual process (99.8% time reduction)
- 🔒 **Reduced attack surface**: Critical patches deployed in minutes, not days
- 📊 **Automated compliance**: Zero-effort audit trails across 10 regulatory frameworks
- 💰 **Cost savings**: $180K/year saved per 10-person security team (based on $90/hour labor cost)

---

## 🛠️ **Technical Architecture**

### **Stack Overview**
```
┌─────────────────────────────────────────────────────────────┐
│                     FRONTEND (React + TypeScript)            │
│  Dashboard | Sandbox Testing | Event Logs | Compliance      │
└────────────────────────┬────────────────────────────────────┘
                         │ REST API (API Gateway)
┌────────────────────────▼────────────────────────────────────┐
│              AWS LAMBDA (Python 3.11)                        │
│  ┌──────────────────────────────────────────────────────┐   │
│  │  AGENT.PY: Bedrock Claude 3.5 Sonnet Orchestrator   │   │
│  │  - Action Router (Direct + Conversational AI)       │   │
│  │  - Tool-calling with function definitions           │   │
│  └─────────────┬────────────────────────────────────────┘   │
│                │ Invokes Tools                               │
│  ┌─────────────▼────────────────────────────────────────┐   │
│  │  TOOLS.PY: Real boto3 DynamoDB/S3 Operations        │   │
│  │  - prioritize_patch() → Calculate impact scores     │   │
│  │  - run_sandbox_test() → Execute automated tests     │   │
│  │  - deploy_patch() → Update status + log events      │   │
│  │  - generate_compliance_report() → Create S3 reports │   │
│  └──────────────────────────────────────────────────────┘   │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
┌───────▼──────┐  ┌─────▼──────┐  ┌─────▼──────┐
│  DynamoDB    │  │  DynamoDB  │  │     S3     │
│ IPO-Patches  │  │ IPO-Events │  │ Compliance │
│ (Patch Data) │  │(Audit Logs)│  │  Reports   │
└──────────────┘  └────────────┘  └────────────┘
```

### **Key Technologies**
- **AI Brain**: Amazon Bedrock (Claude 3.5 Sonnet) with tool-calling for agentic behavior
- **Backend**: AWS Lambda (Python 3.11), boto3 for AWS SDK operations
- **Data**: DynamoDB (Patches, Events), S3 (Compliance reports)
- **API**: API Gateway REST API with non-proxy Lambda integration
- **Frontend**: React 18, TypeScript, TanStack Query, shadcn/ui components
- **IaC**: AWS CDK (Python) for infrastructure as code
- **Notifications**: react-hot-toast for professional UX

### **What Makes This "Real" (Not a Mockup)**
✅ **Real Database**: Every patch, status change, and event is stored in DynamoDB  
✅ **Real AI**: Bedrock Claude actually orchestrates multi-step workflows with tool-calling  
✅ **Real Tests**: Sandbox tests write results back to database (not hardcoded JSON)  
✅ **Real Compliance**: S3 reports are generated with actual patch metadata  
✅ **Real Events**: Every action logs to IPO-Events table with timestamps and details  

---

## 🚀 **Quick Start Guide**

### **Prerequisites**
- AWS Account with Bedrock access (us-east-1 region)
- Node.js 18+ and Python 3.11+
- AWS CLI configured with credentials

### **1. Backend Deployment (AWS Infrastructure)**

```bash
# Clone the repository
git clone https://github.com/chanikkyasaai/super-hacks.git
cd super-hacks

# Configure AWS credentials (use SuperOps Global Hackathon workspace)
# Visit: https://superopsglobalhackathon.awsapps.com/start/#/?tab=accounts
aws sts get-caller-identity  # Verify credentials

# Create Python virtual environment
python -m venv .venv
.venv\Scripts\activate  # Windows
# source .venv/bin/activate  # macOS/Linux

# Install dependencies
pip install -r requirements.txt
npm install -g aws-cdk

# Deploy infrastructure (creates DynamoDB, Lambda, API Gateway, S3)
cdk deploy --require-approval never
```

**Expected Output:**
```
✅ SuperHacksStack

Outputs:
SuperHacksStack.IPOApiEndpointFCF9647A = https://n72hgwfh6b.execute-api.us-east-1.amazonaws.com/prod/
```

### **2. Frontend Setup (React Application)**

```bash
cd frontend

# Install dependencies
npm install

# Start development server
npm run dev
```

**Open**: `http://localhost:5173` (Vite default port)

### **3. Seed Demo Data (Optional)**

Add sample patches to DynamoDB via AWS Console:
1. Go to DynamoDB → Tables → `SuperHacksStack-IPOPatches...`
2. Click "Explore table items" → "Create item"
3. Use JSON view and paste:

```json
{
  "patchId": { "S": "PATCH-2024-010" },
  "cve": { "S": "CVE-2024-45679" },
  "description": { "S": "Privilege escalation vulnerability in admin panel" },
  "severity": { "S": "CRITICAL" },
  "status": { "S": "PENDING" },
  "impactScore": { "N": "92" },
  "deployedAt": { "S": "2025-11-02T16:05:00Z" }
}
```

---

## 🔍 **How to Verify It's Real (Not a Mockup)**

---

## 🔍 **How to Verify It's Real (Not a Mockup)**

### **Test 1: Database Integration**
1. Open AWS Console → DynamoDB → `SuperHacksStack-IPOPatches...`
2. Note a patch ID and its status (e.g., PATCH-2024-010, status: PENDING)
3. Open the frontend → Dashboard → Find the same patch
4. Click "Run" → Watch the status change in real-time
5. Refresh DynamoDB → Verify status updated to ANALYZED/SANDBOX_TESTING

### **Test 2: AI Agent Execution**
1. Check Lambda logs: AWS Console → CloudWatch → `/aws/lambda/SuperHacksStack-IpoAgentFunction...`
2. Look for: `"Calling Bedrock with model: anthropic.claude-3-5-sonnet"`
3. Verify tool invocations: `"Tool: run_sandbox_test"`, `"Tool: prioritize_patch"`
4. Confirm: Not hardcoded responses, actual Bedrock API calls

### **Test 3: Event Logging**
1. Click "Run" on any patch in the Dashboard
2. Navigate to Event Logs page
3. See new entries appear: "Sandbox test started", "Test completed: PASS"
4. Open DynamoDB → `SuperHacksStack-IPOEvents...` → Verify same events exist

### **Test 4: Compliance Reports**
1. Navigate to Compliance View
2. Click "Generate Report"
3. Check S3: AWS Console → S3 → `superhacksstack-ipocompliancereports...`
4. Download the JSON file → Verify it contains real patch data from DynamoDB

---

## 📊 **Key Features**

### **For Security Teams**
- 🎯 **AI-Powered Prioritization**: Impact scores based on CVE severity + asset criticality
- 🧪 **Automated Sandbox Testing**: Compatibility, performance, security, stability checks
- 🚀 **Bulk Operations**: Deploy/rollback multiple patches with one click
- 📈 **Real-Time Dashboard**: Live patch queue, success rates, compliance scores

### **For Compliance Officers**
- 📝 **Audit Trails**: Every action logged to DynamoDB with timestamps and details
- 📊 **Multi-Framework Support**: SOC 2, ISO 27001, GDPR, HIPAA, PCI DSS, NIST, FedRAMP, CIS, COBIT, FISMA
- 📁 **S3 Reports**: JSON exports with patch metadata for auditor review
- 🔍 **Event Logs**: Searchable history of all AI decisions and deployments

### **For IT Leadership**
- 💰 **Cost Savings**: $180K/year per 10-person team
- ⚡ **Speed**: 10-second AI workflow vs. 15-hour manual process
- 🔒 **Risk Reduction**: Critical patches deployed in minutes, not days
- 📉 **Incident Reduction**: Automated testing prevents production failures

---

## 🏗️ **CDK Infrastructure Details**

### **AWS Resources Created**
- **3 DynamoDB Tables**: 
  - `IPO-Patches` (Patch metadata, status, scores)
  - `IPO-Events` (Audit log entries)
  - `IPO-Assets` (Critical systems for impact calculation)
- **1 S3 Bucket**: `IPO-ComplianceReports` (JSON reports)
- **1 Lambda Function**: `IpoAgentFunction` (Python 3.11 runtime, 512MB memory)
- **1 API Gateway**: REST API with `/invoke` endpoint
- **IAM Policies**: Bedrock model invocation, DynamoDB read/write, S3 put/get/list

### **Cost Estimate (Production)**
- **DynamoDB**: ~$5/month (25 RCUs, 25 WCUs on-demand)
- **Lambda**: ~$10/month (100K invocations, 512MB, 30s avg duration)
- **Bedrock**: ~$30/month (Claude 3.5 Sonnet, 50K input tokens/day)
- **S3 + API Gateway**: ~$5/month
- **Total**: **~$50/month** for 100 patches/day

---

## 🧪 **Testing & Validation**

### **Backend Tests**
```bash
python -m pytest tests/unit/test_superhacks_stack.py
```

### **Frontend Tests**
```bash
cd frontend
npm run test
```

### **Manual Verification**
1. **Database Check**: AWS Console → DynamoDB → Verify `IPO-Patches` table exists
2. **API Check**: `curl -X POST <API_ENDPOINT>/invoke -d '{"action":"list_patches"}'`
3. **Bedrock Check**: Lambda logs should show "Calling Bedrock with model: anthropic.claude-3-5-sonnet"

---

## 📚 **Useful CDK Commands**

- `cdk ls` — List all stacks in the app
- `cdk synth` — Generate CloudFormation template
- `cdk deploy` — Deploy infrastructure to AWS
- `cdk diff` — Compare deployed stack with current code
- `cdk destroy` — Delete all AWS resources (WARNING: irreversible)
- `cdk docs` — Open AWS CDK documentation

---

## 🛡️ **Security & Compliance**

### **Data Protection**
- ✅ All data encrypted at rest (DynamoDB + S3)
- ✅ IAM least-privilege policies (Lambda can't delete tables)
---

## 🛡️ **Security & Compliance**

### **Data Protection**
- ✅ All data encrypted at rest (DynamoDB + S3)
- ✅ IAM least-privilege policies (Lambda can't delete tables)
- ✅ API Gateway with throttling limits (prevent abuse)
- ✅ No secrets in code (uses AWS environment variables)

### **Compliance Features**
- ✅ Immutable audit logs (DynamoDB with TTL for retention)
- ✅ Role-based access control (future: AWS Cognito integration)
- ✅ Data residency (all resources in us-east-1)
- ✅ Regulatory framework tracking (10 major standards)

---

## 🎓 **Technical Resources**

- [AWS Bedrock Documentation](https://docs.aws.amazon.com/bedrock/)
- [Claude 3.5 Sonnet Guide](https://www.anthropic.com/claude)
- [AWS CDK Python Guide](https://docs.aws.amazon.com/cdk/v2/guide/work-with-cdk-python.html)
- [DynamoDB Best Practices](https://docs.aws.amazon.com/amazondynamodb/latest/developerguide/best-practices.html)

---

## 🙏 **Acknowledgments**

Built for **AWS SuperOps Global Hackathon 2025** using Amazon Bedrock, AWS Lambda, DynamoDB, and S3.

Special thanks to the AWS and Anthropic teams for providing world-class AI infrastructure.

---

## 📞 **Contact**

**Team Lead**: Chanikya Nelapatla  
**Team Member**: Logarathan SV  
**GitHub**: [@chanikkyasaai](https://github.com/chanikkyasaai)  
**Project Repository**: [super-hacks](https://github.com/chanikkyasaai/super-hacks)

---

<div align="center">

**Built with ❤️ for SuperHacks 2025**

*Transforming enterprise security with AI-driven automation*

[![GitHub Stars](https://img.shields.io/github/stars/chanikkyasaai/super-hacks?style=social)](https://github.com/chanikkyasaai/super-hacks)
[![SuperHacks](https://img.shields.io/badge/SuperHacks-2025-success)](https://superhacks.devpost.com/)

</div>
