from fastapi import FastAPI, APIRouter, HTTPException, Depends, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict, EmailStr
from typing import List, Optional, Dict, Any
import uuid
from datetime import datetime, timezone, timedelta
import jwt
import bcrypt
from apscheduler.schedulers.background import BackgroundScheduler
import random
import asyncio
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# AI Integration
try:
    from emergentintegrations.llm.chat import LlmChat, UserMessage
    AI_ENABLED = True
except ImportError:
    AI_ENABLED = False
    logging.warning("emergentintegrations not available. Spam scoring disabled.")

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# JWT Config
JWT_SECRET = os.environ.get('JWT_SECRET', 'your-secret-key-change-in-production')
JWT_ALGORITHM = 'HS256'

# Founder account configuration (internal use only)
FOUNDER_EMAILS = [
    "deeip.temp@gmail.com",
    "buradkaraditya08@gmail.com"
]

def is_founder_email(email: str) -> bool:
    """Check if email belongs to a founder account"""
    return email.lower() in [f.lower() for f in FOUNDER_EMAILS]

app = FastAPI()
api_router = APIRouter(prefix="/api")
security = HTTPBearer()

# ============= MODELS =============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    email: EmailStr
    full_name: str
    plan: str = "free"  # free, premium, pro, enterprise, enterprise_internal
    role: Optional[str] = None  # founder, admin, user
    billing_status: Optional[str] = None  # active, exempt
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class TokenResponse(BaseModel):
    token: str
    user: User

class Domain(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    domain: str
    mode: str = "cold_outreach"  # cold_outreach, founder_outbound, newsletter
    health_score: int = 100
    warmup_day: int = 0
    warmup_completed: bool = False
    daily_limit: int = 20
    sent_today: int = 0
    last_reset: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    is_paused: bool = False
    pause_reason: Optional[str] = None
    spf_valid: bool = False
    dkim_valid: bool = False
    dmarc_valid: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DomainCreate(BaseModel):
    domain: str
    mode: str = "cold_outreach"

class Contact(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []
    is_suppressed: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class ContactCreate(BaseModel):
    email: EmailStr
    first_name: Optional[str] = None
    last_name: Optional[str] = None
    company: Optional[str] = None
    tags: List[str] = []

class Campaign(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    domain_id: str
    name: str
    subject: str
    body: str
    recipients: List[str] = []
    status: str = "draft"  # draft, scheduled, sending, completed, paused
    sent_count: int = 0
    delivered_count: int = 0
    bounce_count: int = 0
    spam_count: int = 0
    reply_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    scheduled_at: Optional[datetime] = None

class CampaignCreate(BaseModel):
    domain_id: str
    name: str
    subject: str
    body: str
    recipients: List[str]

class SuppressedEmail(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: EmailStr
    reason: str  # hard_bounce, spam_complaint, unsubscribe, manual
    source: Optional[str] = None  # campaign_id or manual
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SuppressedEmailCreate(BaseModel):
    email: EmailStr
    reason: str
    source: Optional[str] = None

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str

class PasswordResetToken(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    token_hash: str
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    expires_at: datetime
    used: bool = False

class SendingAccount(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    email: EmailStr
    provider: str  # gmail, outlook, smtp
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password_encrypted: Optional[str] = None
    smtp_use_tls: bool = True
    daily_send_limit: int = 50
    reputation_score: int = 100
    health_status: str = "healthy"  # healthy, risky, critical
    warmup_enabled: bool = False
    warmup_day: int = 0
    warmup_completed: bool = False
    warmup_status: str = "inactive"  # inactive, active, paused, completed
    bounce_rate: float = 0.0
    spam_rate: float = 0.0
    emails_sent_today: int = 0
    total_emails_sent: int = 0
    total_replies: int = 0
    total_opens: int = 0
    last_activity: Optional[datetime] = None
    is_verified: bool = False
    is_paused: bool = False
    pause_reason: Optional[str] = None
    # Warmup settings
    warmup_daily_volume: int = 5
    warmup_ramp_up: int = 2
    warmup_reply_rate: float = 30.0
    warmup_random_delay_min: int = 60
    warmup_random_delay_max: int = 300
    warmup_weekend_sending: bool = False
    warmup_auto_pause_bounce_rate: float = 4.0
    warmup_auto_pause_spam_threshold: int = 3
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class SendingAccountCreate(BaseModel):
    email: EmailStr
    provider: str
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: bool = True
    warmup_enabled: bool = True

class SendingAccountUpdate(BaseModel):
    daily_send_limit: Optional[int] = None
    warmup_enabled: Optional[bool] = None
    is_paused: Optional[bool] = None
    smtp_host: Optional[str] = None
    smtp_port: Optional[int] = None
    smtp_username: Optional[str] = None
    smtp_password: Optional[str] = None
    smtp_use_tls: Optional[bool] = None
    # Warmup settings
    warmup_daily_volume: Optional[int] = None
    warmup_ramp_up: Optional[int] = None
    warmup_reply_rate: Optional[float] = None
    warmup_random_delay_min: Optional[int] = None
    warmup_random_delay_max: Optional[int] = None
    warmup_weekend_sending: Optional[bool] = None
    warmup_auto_pause_bounce_rate: Optional[float] = None
    warmup_auto_pause_spam_threshold: Optional[int] = None

class SendingAccountWarmupLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sending_account_id: str
    day: int = 0
    emails_sent: int = 0
    emails_delivered: int = 0
    replies_received: int = 0
    spam_flags: int = 0
    bounce_count: int = 0
    open_count: int = 0
    date: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class WarmupStats(BaseModel):
    total_sent: int
    total_delivered: int
    total_replies: int
    total_opens: int
    total_bounces: int
    total_spam_flags: int
    reply_rate: float
    open_rate: float
    bounce_rate: float
    current_day: int
    status: str
    daily_logs: List[Dict[str, Any]] = []

class WarmupSettings(BaseModel):
    daily_volume: int = 5
    ramp_up: int = 2  # emails to add per day
    reply_rate: float = 30.0  # target reply rate %
    random_delay_min: int = 60  # seconds
    random_delay_max: int = 300  # seconds
    weekend_sending: bool = False
    auto_pause_bounce_rate: float = 4.0  # %
    auto_pause_spam_threshold: int = 3  # count

class WarmupLog(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    domain_id: str
    day: int
    sent: int
    delivered: int
    bounced: int
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class DashboardStats(BaseModel):
    total_domains: int
    active_campaigns: int
    emails_sent_today: int
    domains_in_warmup: int
    average_health_score: float

class SpamScoreRequest(BaseModel):
    subject: str
    body: str
    mode: str = "cold_outreach"

class SpamScoreResponse(BaseModel):
    score: int  # 0-100, lower is better
    risk_level: str  # low, medium, high, critical
    recommendations: List[str]
    predicted_inbox_rate: int  # 0-100%
    details: Dict[str, Any]

# ============= AUTH HELPERS =============

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode('utf-8'), hashed.encode('utf-8'))

# ============= SMTP ENCRYPTION HELPERS =============

from cryptography.fernet import Fernet

# Generate encryption key (in production, store in environment variable)
ENCRYPTION_KEY = os.environ.get('SMTP_ENCRYPTION_KEY', Fernet.generate_key()).encode() if isinstance(os.environ.get('SMTP_ENCRYPTION_KEY', Fernet.generate_key()), str) else os.environ.get('SMTP_ENCRYPTION_KEY', Fernet.generate_key())
cipher_suite = Fernet(ENCRYPTION_KEY if isinstance(ENCRYPTION_KEY, bytes) else ENCRYPTION_KEY.encode())

def encrypt_smtp_password(password: str) -> str:
    """Encrypt SMTP password using AES-256"""
    return cipher_suite.encrypt(password.encode()).decode()

def decrypt_smtp_password(encrypted_password: str) -> str:
    """Decrypt SMTP password"""
    return cipher_suite.decrypt(encrypted_password.encode()).decode()

async def verify_smtp_connection(host: str, port: int, username: str, password: str, use_tls: bool) -> tuple[bool, str]:
    """Test SMTP connection"""
    import smtplib
    from email.mime.text import MIMEText
    
    try:
        if use_tls:
            server = smtplib.SMTP(host, port, timeout=10)
            server.starttls()
        else:
            server = smtplib.SMTP(host, port, timeout=10)
        
        server.login(username, password)
        server.quit()
        return True, "Connection successful"
    except smtplib.SMTPAuthenticationError:
        return False, "Authentication failed - invalid credentials"
    except smtplib.SMTPConnectError:
        return False, "Connection failed - check host and port"
    except Exception as e:
        return False, f"Connection error: {str(e)}"

def create_token(user_id: str) -> str:
    payload = {
        'user_id': user_id,
        'exp': datetime.now(timezone.utc) + timedelta(days=30)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)

async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    try:
        token = credentials.credentials
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get('user_id')
        
        user_doc = await db.users.find_one({'id': user_id}, {'_id': 0})
        if not user_doc:
            raise HTTPException(status_code=401, detail="User not found")
        
        if isinstance(user_doc['created_at'], str):
            user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
        
        return User(**user_doc)
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except Exception as e:
        raise HTTPException(status_code=401, detail="Invalid token")

# ============= PLAN LIMITS =============

def get_plan_limits(plan: str, user_email: str = None) -> Dict[str, Any]:
    # Founder account gets unlimited access
    if user_email and is_founder_email(user_email):
        return {
            "max_domains": 999,
            "daily_limit_per_domain": 10000,
            "warmup_required": True,
            "modes": ["cold_outreach", "founder_outbound", "newsletter"],
            "all_features_unlocked": True
        }
    
    limits = {
        "free": {"max_domains": 1, "daily_limit_per_domain": 20, "warmup_required": True, "modes": ["cold_outreach"]},
        "premium": {"max_domains": 3, "daily_limit_per_domain": 150, "warmup_required": True, "modes": ["cold_outreach", "founder_outbound"]},
        "pro": {"max_domains": 10, "daily_limit_per_domain": 300, "warmup_required": True, "modes": ["cold_outreach", "founder_outbound", "newsletter"]},
        "enterprise": {"max_domains": 50, "daily_limit_per_domain": 1000, "warmup_required": True, "modes": ["cold_outreach", "founder_outbound", "newsletter"]},
        "enterprise_internal": {"max_domains": 999, "daily_limit_per_domain": 10000, "warmup_required": True, "modes": ["cold_outreach", "founder_outbound", "newsletter"], "all_features_unlocked": True}
    }
    return limits.get(plan, limits["free"])

# ============= AI SPAM SCORING =============

async def analyze_spam_score(subject: str, body: str, mode: str = "cold_outreach") -> SpamScoreResponse:
    """Analyze email content for spam risk using AI"""
    
    if not AI_ENABLED:
        # Fallback to basic heuristics if AI is not available
        return _basic_spam_heuristics(subject, body, mode)
    
    try:
        api_key = os.environ.get('EMERGENT_LLM_KEY')
        if not api_key:
            return _basic_spam_heuristics(subject, body, mode)
        
        # Create AI chat instance
        chat = LlmChat(
            api_key=api_key,
            session_id=f"spam-analysis-{uuid.uuid4()}",
            system_message="""You are an expert email deliverability analyst specializing in cold outreach and email marketing. 
Analyze emails for spam indicators and provide actionable recommendations. 
Focus on: spam trigger words, formatting issues, link density, call-to-action clarity, personalization, and compliance."""
        ).with_model("openai", "gpt-4o")
        
        # Prepare analysis prompt
        prompt = f"""Analyze this {mode.replace('_', ' ')} email for spam risk:

SUBJECT: {subject}

BODY:
{body}

Provide a JSON response with:
1. spam_score: 0-100 (0=safe, 100=certain spam)
2. risk_factors: List of specific issues found
3. positive_factors: List of good practices identified
4. recommendations: Specific improvements to make
5. predicted_inbox_rate: 0-100% estimated inbox placement

Format: {{"spam_score": int, "risk_factors": [str], "positive_factors": [str], "recommendations": [str], "predicted_inbox_rate": int}}"""
        
        # Get AI analysis
        user_message = UserMessage(text=prompt)
        response = await chat.send_message(user_message)
        
        # Parse AI response
        try:
            # Try to extract JSON from response
            response_text = response.strip()
            if "```json" in response_text:
                response_text = response_text.split("```json")[1].split("```")[0].strip()
            elif "```" in response_text:
                response_text = response_text.split("```")[1].split("```")[0].strip()
            
            analysis = json.loads(response_text)
            
            spam_score = min(100, max(0, analysis.get('spam_score', 50)))
            
            # Determine risk level
            if spam_score < 20:
                risk_level = "low"
            elif spam_score < 50:
                risk_level = "medium"
            elif spam_score < 75:
                risk_level = "high"
            else:
                risk_level = "critical"
            
            return SpamScoreResponse(
                score=spam_score,
                risk_level=risk_level,
                recommendations=analysis.get('recommendations', [])[:5],
                predicted_inbox_rate=min(100, max(0, analysis.get('predicted_inbox_rate', 70))),
                details={
                    "risk_factors": analysis.get('risk_factors', []),
                    "positive_factors": analysis.get('positive_factors', [])
                }
            )
            
        except json.JSONDecodeError:
            # If JSON parsing fails, use basic heuristics
            return _basic_spam_heuristics(subject, body, mode)
            
    except Exception as e:
        logging.error(f"AI spam analysis failed: {e}")
        return _basic_spam_heuristics(subject, body, mode)

def _basic_spam_heuristics(subject: str, body: str, mode: str) -> SpamScoreResponse:
    """Fallback basic spam scoring without AI"""
    score = 0
    risk_factors = []
    recommendations = []
    
    # Check subject line
    spam_words = ['free', 'guarantee', 'no obligation', 'winner', 'cash', 'prize', 'urgent', 'act now', 'limited time']
    subject_lower = subject.lower()
    
    if len(subject) > 60:
        score += 10
        risk_factors.append("Subject line too long")
        recommendations.append("Keep subject under 60 characters")
    
    if any(word in subject_lower for word in spam_words):
        score += 15
        risk_factors.append("Spam trigger words in subject")
        recommendations.append("Remove spam trigger words")
    
    if subject.isupper():
        score += 20
        risk_factors.append("All caps subject line")
        recommendations.append("Use sentence case")
    
    # Check body
    body_lower = body.lower()
    link_count = body.count('http://') + body.count('https://')
    
    if link_count > 3:
        score += 15
        risk_factors.append(f"Too many links ({link_count})")
        recommendations.append("Reduce links to 1-2 for cold outreach")
    
    if any(word in body_lower for word in spam_words):
        score += 10
        risk_factors.append("Spam trigger words in body")
    
    if len(body) < 50:
        score += 10
        risk_factors.append("Email too short")
        recommendations.append("Add more context (aim for 100-200 words)")
    
    # Positive factors
    if '{{' in body or '{%' in body:
        score -= 10
        recommendations.append("Good: Using personalization tokens")
    
    if mode == "cold_outreach" and link_count <= 1:
        score -= 5
    
    score = min(100, max(0, score))
    
    if score < 20:
        risk_level = "low"
    elif score < 50:
        risk_level = "medium"
    elif score < 75:
        risk_level = "high"
    else:
        risk_level = "critical"
    
    inbox_rate = max(30, 100 - score)
    
    if not recommendations:
        recommendations = ["Your email looks good overall"]
    
    return SpamScoreResponse(
        score=score,
        risk_level=risk_level,
        recommendations=recommendations,
        predicted_inbox_rate=inbox_rate,
        details={"risk_factors": risk_factors, "positive_factors": []}
    )

# ============= WARMUP ENGINE =============

async def progress_warmup():
    """Daily cron job to progress all domains in warmup"""
    domains = await db.domains.find({"warmup_completed": False}, {"_id": 0}).to_list(None)
    
    for domain_doc in domains:
        if isinstance(domain_doc.get('created_at'), str):
            domain_doc['created_at'] = datetime.fromisoformat(domain_doc['created_at'])
        if isinstance(domain_doc.get('last_reset'), str):
            domain_doc['last_reset'] = datetime.fromisoformat(domain_doc['last_reset'])
        
        domain = Domain(**domain_doc)
        
        # Progress to next day
        new_day = domain.warmup_day + 1
        
        # Calculate new daily limit based on warmup progression
        if new_day <= 15:
            base_limit = 10
            daily_limit = base_limit + (new_day * 5)  # Gradual increase
        else:
            # Get user plan limits
            user_doc = await db.users.find_one({"id": domain.user_id}, {"_id": 0})
            if user_doc:
                plan_limits = get_plan_limits(user_doc.get('plan', 'free'), user_doc.get('email'))
                daily_limit = plan_limits['daily_limit_per_domain']
            else:
                daily_limit = 20
        
        warmup_completed = new_day >= 15
        
        # Update domain
        await db.domains.update_one(
            {"id": domain.id},
            {"$set": {
                "warmup_day": new_day,
                "warmup_completed": warmup_completed,
                "daily_limit": daily_limit,
                "sent_today": 0,
                "last_reset": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Log warmup progress
        log_dict = WarmupLog(
            domain_id=domain.id,
            day=new_day,
            sent=domain.sent_today,
            delivered=domain.sent_today,
            bounced=0
        ).model_dump()
        log_dict['timestamp'] = log_dict['timestamp'].isoformat()
        await db.warmup_logs.insert_one(log_dict)

# ============= AUTO-PAUSE ENGINE =============

async def check_domain_health(domain_id: str):
    """Check domain health and auto-pause if risk detected"""
    domain_doc = await db.domains.find_one({"id": domain_id}, {"_id": 0})
    if not domain_doc:
        return
    
    if isinstance(domain_doc.get('created_at'), str):
        domain_doc['created_at'] = datetime.fromisoformat(domain_doc['created_at'])
    if isinstance(domain_doc.get('last_reset'), str):
        domain_doc['last_reset'] = datetime.fromisoformat(domain_doc['last_reset'])
    
    domain = Domain(**domain_doc)
    
    # Get campaign stats for this domain
    campaigns = await db.campaigns.find({"domain_id": domain_id}, {"_id": 0}).to_list(None)
    
    total_sent = sum(c.get('sent_count', 0) for c in campaigns)
    total_bounced = sum(c.get('bounce_count', 0) for c in campaigns)
    total_spam = sum(c.get('spam_count', 0) for c in campaigns)
    
    if total_sent > 0:
        bounce_rate = (total_bounced / total_sent) * 100
        spam_rate = (total_spam / total_sent) * 100
        
        # Auto-pause triggers
        should_pause = False
        pause_reason = None
        
        if bounce_rate > 4.0:
            should_pause = True
            pause_reason = f"High bounce rate detected: {bounce_rate:.1f}%"
        elif spam_rate > 0.2:
            should_pause = True
            pause_reason = f"High spam complaint rate: {spam_rate:.2f}%"
        
        if should_pause:
            new_health_score = max(0, domain.health_score - 20)
            await db.domains.update_one(
                {"id": domain_id},
                {"$set": {
                    "is_paused": True,
                    "pause_reason": pause_reason,
                    "health_score": new_health_score
                }}
            )

# ============= MOCK EMAIL SENDER =============

async def send_email_mock(domain_id: str, to: str, subject: str, body: str, campaign_id: str):
    """Mock email sender with realistic delays"""
    # Simulate sending delay (7-45 seconds in production)
    await asyncio.sleep(random.uniform(0.1, 0.3))  # Shortened for demo
    
    # Simulate delivery outcomes (realistic distribution)
    outcome = random.choices(
        ['delivered', 'bounced', 'spam'],
        weights=[96, 3, 1]  # 96% delivered, 3% bounced, 1% spam
    )[0]
    
    # Update campaign stats
    update_dict = {"$inc": {"sent_count": 1}}
    
    if outcome == 'delivered':
        update_dict["$inc"]["delivered_count"] = 1
    elif outcome == 'bounced':
        update_dict["$inc"]["bounce_count"] = 1
    elif outcome == 'spam':
        update_dict["$inc"]["spam_count"] = 1
    
    await db.campaigns.update_one({"id": campaign_id}, update_dict)
    
    # Update domain sent count
    await db.domains.update_one({"id": domain_id}, {"$inc": {"sent_today": 1}})
    
    # Check domain health after send
    await check_domain_health(domain_id)

# ============= API ROUTES =============

@api_router.post("/auth/register", response_model=TokenResponse)
async def register(user_input: UserCreate):
    # Check if user exists
    existing = await db.users.find_one({"email": user_input.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")
    
    # Determine if this is a founder account
    is_founder = is_founder_email(user_input.email)
    
    # Create user with founder privileges if applicable
    user = User(
        email=user_input.email,
        full_name=user_input.full_name,
        plan="enterprise_internal" if is_founder else "free",
        role="founder" if is_founder else None,
        billing_status="exempt" if is_founder else None
    )
    
    user_dict = user.model_dump()
    user_dict['password'] = hash_password(user_input.password)
    user_dict['created_at'] = user_dict['created_at'].isoformat()
    
    await db.users.insert_one(user_dict)
    
    token = create_token(user.id)
    return TokenResponse(token=token, user=user)

@api_router.post("/auth/login", response_model=TokenResponse)
async def login(credentials: UserLogin):
    user_doc = await db.users.find_one({"email": credentials.email}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    if not verify_password(credentials.password, user_doc['password']):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    # Auto-upgrade founder account if needed
    if is_founder_email(credentials.email):
        if user_doc.get('plan') != 'enterprise_internal' or user_doc.get('role') != 'founder':
            await db.users.update_one(
                {"email": credentials.email},
                {"$set": {
                    "plan": "enterprise_internal",
                    "role": "founder",
                    "billing_status": "exempt"
                }}
            )
            user_doc['plan'] = 'enterprise_internal'
            user_doc['role'] = 'founder'
            user_doc['billing_status'] = 'exempt'
    
    if isinstance(user_doc['created_at'], str):
        user_doc['created_at'] = datetime.fromisoformat(user_doc['created_at'])
    
    user = User(**{k: v for k, v in user_doc.items() if k != 'password'})
    token = create_token(user.id)
    
    return TokenResponse(token=token, user=user)

@api_router.get("/auth/me", response_model=User)
async def get_me(current_user: User = Depends(get_current_user)):
    return current_user

@api_router.get("/dashboard/stats", response_model=DashboardStats)
async def get_dashboard_stats(current_user: User = Depends(get_current_user)):
    # Get all domains for user
    domains = await db.domains.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    # Get all campaigns
    campaigns = await db.campaigns.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    total_sent_today = sum(d.get('sent_today', 0) for d in domains)
    domains_in_warmup = sum(1 for d in domains if not d.get('warmup_completed', False))
    active_campaigns = sum(1 for c in campaigns if c.get('status') in ['scheduled', 'sending'])
    avg_health = sum(d.get('health_score', 100) for d in domains) / len(domains) if domains else 100
    
    return DashboardStats(
        total_domains=len(domains),
        active_campaigns=active_campaigns,
        emails_sent_today=total_sent_today,
        domains_in_warmup=domains_in_warmup,
        average_health_score=round(avg_health, 1)
    )

@api_router.get("/domains", response_model=List[Domain])
async def get_domains(current_user: User = Depends(get_current_user)):
    domains = await db.domains.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    for domain in domains:
        if isinstance(domain.get('created_at'), str):
            domain['created_at'] = datetime.fromisoformat(domain['created_at'])
        if isinstance(domain.get('last_reset'), str):
            domain['last_reset'] = datetime.fromisoformat(domain['last_reset'])
    
    return domains

@api_router.post("/domains", response_model=Domain)
async def create_domain(domain_input: DomainCreate, current_user: User = Depends(get_current_user)):
    # Check plan limits
    plan_limits = get_plan_limits(current_user.plan, current_user.email)
    existing_domains = await db.domains.count_documents({"user_id": current_user.id})
    
    if existing_domains >= plan_limits['max_domains']:
        raise HTTPException(
            status_code=403,
            detail=f"Plan limit reached. Upgrade to add more domains. Current limit: {plan_limits['max_domains']}"
        )
    
    # Check if mode is allowed for plan
    if domain_input.mode not in plan_limits['modes']:
        raise HTTPException(
            status_code=403,
            detail=f"Mode '{domain_input.mode}' not available in your plan"
        )
    
    # Check if domain already exists
    existing = await db.domains.find_one({"domain": domain_input.domain, "user_id": current_user.id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Domain already added")
    
    # Create domain with warmup
    domain = Domain(
        user_id=current_user.id,
        domain=domain_input.domain,
        mode=domain_input.mode,
        warmup_day=0,
        daily_limit=10  # Start with 10 emails/day during warmup
    )
    
    domain_dict = domain.model_dump()
    domain_dict['created_at'] = domain_dict['created_at'].isoformat()
    domain_dict['last_reset'] = domain_dict['last_reset'].isoformat()
    
    await db.domains.insert_one(domain_dict)
    
    return domain

@api_router.get("/domains/{domain_id}", response_model=Domain)
async def get_domain(domain_id: str, current_user: User = Depends(get_current_user)):
    domain_doc = await db.domains.find_one({"id": domain_id, "user_id": current_user.id}, {"_id": 0})
    if not domain_doc:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    if isinstance(domain_doc.get('created_at'), str):
        domain_doc['created_at'] = datetime.fromisoformat(domain_doc['created_at'])
    if isinstance(domain_doc.get('last_reset'), str):
        domain_doc['last_reset'] = datetime.fromisoformat(domain_doc['last_reset'])
    
    return Domain(**domain_doc)

@api_router.post("/domains/{domain_id}/validate")
async def validate_domain(domain_id: str, current_user: User = Depends(get_current_user)):
    """Mock DNS validation"""
    domain_doc = await db.domains.find_one({"id": domain_id, "user_id": current_user.id}, {"_id": 0})
    if not domain_doc:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    # Mock validation (in production, check actual DNS records)
    await db.domains.update_one(
        {"id": domain_id},
        {"$set": {
            "spf_valid": True,
            "dkim_valid": True,
            "dmarc_valid": True
        }}
    )
    
    return {"message": "Domain validated successfully", "spf": True, "dkim": True, "dmarc": True}

@api_router.get("/contacts", response_model=List[Contact])
async def get_contacts(current_user: User = Depends(get_current_user)):
    contacts = await db.contacts.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    for contact in contacts:
        if isinstance(contact.get('created_at'), str):
            contact['created_at'] = datetime.fromisoformat(contact['created_at'])
    
    return contacts

@api_router.post("/contacts", response_model=Contact)
async def create_contact(contact_input: ContactCreate, current_user: User = Depends(get_current_user)):
    # Check if contact exists
    existing = await db.contacts.find_one({"email": contact_input.email, "user_id": current_user.id}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Contact already exists")
    
    contact = Contact(
        user_id=current_user.id,
        **contact_input.model_dump()
    )
    
    contact_dict = contact.model_dump()
    contact_dict['created_at'] = contact_dict['created_at'].isoformat()
    
    await db.contacts.insert_one(contact_dict)
    
    return contact

@api_router.get("/campaigns", response_model=List[Campaign])
async def get_campaigns(current_user: User = Depends(get_current_user)):
    campaigns = await db.campaigns.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    for campaign in campaigns:
        if isinstance(campaign.get('created_at'), str):
            campaign['created_at'] = datetime.fromisoformat(campaign['created_at'])
        if campaign.get('scheduled_at') and isinstance(campaign['scheduled_at'], str):
            campaign['scheduled_at'] = datetime.fromisoformat(campaign['scheduled_at'])
    
    return campaigns

@api_router.post("/campaigns", response_model=Campaign)
async def create_campaign(campaign_input: CampaignCreate, current_user: User = Depends(get_current_user)):
    # Verify domain ownership
    domain_doc = await db.domains.find_one({"id": campaign_input.domain_id, "user_id": current_user.id}, {"_id": 0})
    if not domain_doc:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    if isinstance(domain_doc.get('created_at'), str):
        domain_doc['created_at'] = datetime.fromisoformat(domain_doc['created_at'])
    if isinstance(domain_doc.get('last_reset'), str):
        domain_doc['last_reset'] = datetime.fromisoformat(domain_doc['last_reset'])
    
    domain = Domain(**domain_doc)
    
    # Check if domain is paused
    if domain.is_paused:
        raise HTTPException(status_code=403, detail=f"Domain is paused: {domain.pause_reason}")
    
    # Check daily limit
    remaining = domain.daily_limit - domain.sent_today
    if len(campaign_input.recipients) > remaining:
        raise HTTPException(
            status_code=403,
            detail=f"Daily limit would be exceeded. Remaining today: {remaining}"
        )
    
    campaign = Campaign(
        user_id=current_user.id,
        **campaign_input.model_dump()
    )
    
    campaign_dict = campaign.model_dump()
    campaign_dict['created_at'] = campaign_dict['created_at'].isoformat()
    if campaign_dict.get('scheduled_at'):
        campaign_dict['scheduled_at'] = campaign_dict['scheduled_at'].isoformat()
    
    await db.campaigns.insert_one(campaign_dict)
    
    return campaign

@api_router.post("/campaigns/{campaign_id}/send")
async def send_campaign(campaign_id: str, current_user: User = Depends(get_current_user)):
    campaign_doc = await db.campaigns.find_one({"id": campaign_id, "user_id": current_user.id}, {"_id": 0})
    if not campaign_doc:
        raise HTTPException(status_code=404, detail="Campaign not found")
    
    if isinstance(campaign_doc.get('created_at'), str):
        campaign_doc['created_at'] = datetime.fromisoformat(campaign_doc['created_at'])
    if campaign_doc.get('scheduled_at') and isinstance(campaign_doc['scheduled_at'], str):
        campaign_doc['scheduled_at'] = datetime.fromisoformat(campaign_doc['scheduled_at'])
    
    campaign = Campaign(**campaign_doc)
    
    if campaign.status != "draft":
        raise HTTPException(status_code=400, detail="Campaign already sent or in progress")
    
    # Update campaign status
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {"status": "sending"}})
    
    # Send emails asynchronously
    for recipient in campaign.recipients:
        await send_email_mock(
            domain_id=campaign.domain_id,
            to=recipient,
            subject=campaign.subject,
            body=campaign.body,
            campaign_id=campaign_id
        )
    
    # Update campaign status to completed
    await db.campaigns.update_one({"id": campaign_id}, {"$set": {"status": "completed"}})
    
    return {"message": "Campaign sent successfully"}

@api_router.get("/warmup-logs/{domain_id}", response_model=List[WarmupLog])
async def get_warmup_logs(domain_id: str, current_user: User = Depends(get_current_user)):
    # Verify domain ownership
    domain_doc = await db.domains.find_one({"id": domain_id, "user_id": current_user.id}, {"_id": 0})
    if not domain_doc:
        raise HTTPException(status_code=404, detail="Domain not found")
    
    logs = await db.warmup_logs.find({"domain_id": domain_id}, {"_id": 0}).to_list(None)
    
    for log in logs:
        if isinstance(log.get('timestamp'), str):
            log['timestamp'] = datetime.fromisoformat(log['timestamp'])
    
    return logs

@api_router.get("/suppressed-emails", response_model=List[SuppressedEmail])
async def get_suppressed_emails(current_user: User = Depends(get_current_user)):
    emails = await db.suppressed_emails.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    for email in emails:
        if isinstance(email.get('created_at'), str):
            email['created_at'] = datetime.fromisoformat(email['created_at'])
    
    return emails

@api_router.post("/suppressed-emails", response_model=SuppressedEmail)
async def add_suppressed_email(email_input: SuppressedEmailCreate, current_user: User = Depends(get_current_user)):
    # Check if already suppressed
    existing = await db.suppressed_emails.find_one({
        "email": email_input.email,
        "user_id": current_user.id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Email already suppressed")
    
    suppressed = SuppressedEmail(
        user_id=current_user.id,
        **email_input.model_dump()
    )
    
    suppressed_dict = suppressed.model_dump()
    suppressed_dict['created_at'] = suppressed_dict['created_at'].isoformat()
    
    await db.suppressed_emails.insert_one(suppressed_dict)
    
    return suppressed

@api_router.delete("/suppressed-emails/{email_id}")
async def remove_suppressed_email(email_id: str, current_user: User = Depends(get_current_user)):
    result = await db.suppressed_emails.delete_one({
        "id": email_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Suppressed email not found")
    
    return {"message": "Email removed from suppression list"}

@api_router.post("/auth/forgot-password")
async def forgot_password(request: ForgotPasswordRequest):
    """Send password reset email"""
    import hashlib
    import secrets
    
    # Find user (always return success to prevent email enumeration)
    user_doc = await db.users.find_one({"email": request.email.lower()}, {"_id": 0})
    
    if not user_doc:
        # Still return success but don't send email
        logger.info(f"Password reset requested for non-existent email: {request.email}")
        return {"success": True, "message": "If that email exists, we sent a reset link"}
    
    # Generate secure token
    reset_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(reset_token.encode()).hexdigest()
    
    # Store token with 1 hour expiry
    token_data = {
        "id": str(uuid.uuid4()),
        "user_id": user_doc["id"],
        "token_hash": token_hash,
        "created_at": datetime.now(timezone.utc).isoformat(),
        "expires_at": (datetime.now(timezone.utc) + timedelta(hours=1)).isoformat(),
        "used": False
    }
    
    await db.password_reset_tokens.insert_one(token_data)
    
    # In production, send actual email here
    # For now, log the reset link
    reset_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/reset-password?token={reset_token}"
    logger.info(f"Password reset link for {request.email}: {reset_link}")
    
    # TODO: Send actual email with template
    # await send_password_reset_email(user_doc["email"], user_doc["full_name"], reset_link)
    
    return {"success": True, "message": "If that email exists, we sent a reset link"}

@api_router.get("/auth/verify-reset-token")
async def verify_reset_token(token: str):
    """Verify if reset token is valid"""
    import hashlib
    
    token_hash = hashlib.sha256(token.encode()).hexdigest()
    
    token_doc = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used": False
    }, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    return {"success": True, "valid": True}

@api_router.post("/auth/reset-password")
async def reset_password(request: ResetPasswordRequest):
    """Reset password with token"""
    import hashlib
    
    # Validate password strength
    if len(request.new_password) < 8:
        raise HTTPException(status_code=400, detail="Password must be at least 8 characters")
    
    # Hash token for lookup
    token_hash = hashlib.sha256(request.token.encode()).hexdigest()
    
    # Find and verify token
    token_doc = await db.password_reset_tokens.find_one({
        "token_hash": token_hash,
        "used": False
    }, {"_id": 0})
    
    if not token_doc:
        raise HTTPException(status_code=400, detail="Invalid or expired reset token")
    
    # Check expiry
    expires_at = datetime.fromisoformat(token_doc["expires_at"])
    if expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=400, detail="Reset token has expired")
    
    # Hash new password
    password_hash = hash_password(request.new_password)
    
    # Update user password
    await db.users.update_one(
        {"id": token_doc["user_id"]},
        {"$set": {
            "password": password_hash,
            "password_changed_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    # Mark token as used
    await db.password_reset_tokens.update_one(
        {"token_hash": token_hash},
        {"$set": {"used": True}}
    )
    
    return {"success": True, "message": "Password reset successfully"}

@api_router.post("/spam-score", response_model=SpamScoreResponse)
async def check_spam_score(request: SpamScoreRequest, current_user: User = Depends(get_current_user)):
    """Analyze email content for spam risk using AI"""
    try:
        result = await analyze_spam_score(request.subject, request.body, request.mode)
        return result
    except Exception as e:
        logging.error(f"Spam score analysis failed: {e}")
        raise HTTPException(status_code=500, detail="Failed to analyze spam score")

# ============= SENDING ACCOUNTS API =============

def parse_datetime_fields(doc: dict, fields: List[str]) -> dict:
    """Helper to parse datetime fields from MongoDB documents"""
    for field in fields:
        if doc.get(field) and isinstance(doc[field], str):
            doc[field] = datetime.fromisoformat(doc[field].replace('Z', '+00:00'))
    return doc

@api_router.get("/sending-accounts", response_model=List[SendingAccount])
async def get_sending_accounts(current_user: User = Depends(get_current_user)):
    """Get all sending accounts for the current user"""
    accounts = await db.sending_accounts.find({"user_id": current_user.id}, {"_id": 0}).to_list(None)
    
    for account in accounts:
        parse_datetime_fields(account, ['created_at', 'updated_at', 'last_activity'])
        # Don't expose encrypted password
        if 'smtp_password_encrypted' in account:
            account['smtp_password_encrypted'] = '********' if account['smtp_password_encrypted'] else None
    
    return accounts

@api_router.post("/sending-accounts", response_model=SendingAccount)
async def create_sending_account(account_input: SendingAccountCreate, current_user: User = Depends(get_current_user)):
    """Create a new sending account"""
    # Check if account already exists
    existing = await db.sending_accounts.find_one({
        "email": account_input.email, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if existing:
        raise HTTPException(status_code=400, detail="Sending account with this email already exists")
    
    # Validate SMTP fields for SMTP provider
    if account_input.provider == "smtp":
        if not account_input.smtp_host or not account_input.smtp_port:
            raise HTTPException(status_code=400, detail="SMTP host and port are required for SMTP provider")
    
    # Create the account
    account = SendingAccount(
        user_id=current_user.id,
        email=account_input.email,
        provider=account_input.provider,
        smtp_host=account_input.smtp_host,
        smtp_port=account_input.smtp_port,
        smtp_username=account_input.smtp_username or account_input.email,
        smtp_password_encrypted=encrypt_smtp_password(account_input.smtp_password) if account_input.smtp_password else None,
        smtp_use_tls=account_input.smtp_use_tls,
        warmup_enabled=account_input.warmup_enabled,
        warmup_status="inactive"
    )
    
    account_dict = account.model_dump()
    account_dict['created_at'] = account_dict['created_at'].isoformat()
    account_dict['updated_at'] = account_dict['updated_at'].isoformat()
    if account_dict.get('last_activity'):
        account_dict['last_activity'] = account_dict['last_activity'].isoformat()
    
    await db.sending_accounts.insert_one(account_dict)
    
    # Mask password in response
    account.smtp_password_encrypted = '********' if account.smtp_password_encrypted else None
    
    return account

@api_router.get("/sending-accounts/{account_id}", response_model=SendingAccount)
async def get_sending_account(account_id: str, current_user: User = Depends(get_current_user)):
    """Get a specific sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    parse_datetime_fields(account_doc, ['created_at', 'updated_at', 'last_activity'])
    account_doc['smtp_password_encrypted'] = '********' if account_doc.get('smtp_password_encrypted') else None
    
    return SendingAccount(**account_doc)

@api_router.patch("/sending-accounts/{account_id}", response_model=SendingAccount)
async def update_sending_account(account_id: str, updates: SendingAccountUpdate, current_user: User = Depends(get_current_user)):
    """Update a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    # Build update dict
    update_dict = {"updated_at": datetime.now(timezone.utc).isoformat()}
    
    for field, value in updates.model_dump(exclude_unset=True).items():
        if field == "smtp_password" and value:
            update_dict["smtp_password_encrypted"] = encrypt_smtp_password(value)
        elif value is not None:
            update_dict[field] = value
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": update_dict}
    )
    
    # Fetch updated account
    updated_doc = await db.sending_accounts.find_one({"id": account_id}, {"_id": 0})
    parse_datetime_fields(updated_doc, ['created_at', 'updated_at', 'last_activity'])
    updated_doc['smtp_password_encrypted'] = '********' if updated_doc.get('smtp_password_encrypted') else None
    
    return SendingAccount(**updated_doc)

@api_router.delete("/sending-accounts/{account_id}")
async def delete_sending_account(account_id: str, current_user: User = Depends(get_current_user)):
    """Delete a sending account"""
    result = await db.sending_accounts.delete_one({
        "id": account_id,
        "user_id": current_user.id
    })
    
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    # Also delete warmup logs for this account
    await db.sending_account_warmup_logs.delete_many({"sending_account_id": account_id})
    
    return {"message": "Sending account deleted successfully"}

@api_router.post("/sending-accounts/{account_id}/verify")
async def verify_sending_account(account_id: str, current_user: User = Depends(get_current_user)):
    """Verify SMTP connection for a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    # For OAuth providers, we'd verify tokens differently
    if account_doc['provider'] in ['gmail', 'outlook']:
        # Mock OAuth verification - in production, verify OAuth tokens
        await db.sending_accounts.update_one(
            {"id": account_id},
            {"$set": {
                "is_verified": True,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        return {"success": True, "message": "OAuth connection verified"}
    
    # SMTP verification
    if not account_doc.get('smtp_host') or not account_doc.get('smtp_port'):
        raise HTTPException(status_code=400, detail="SMTP configuration incomplete")
    
    # Decrypt password
    password = decrypt_smtp_password(account_doc['smtp_password_encrypted']) if account_doc.get('smtp_password_encrypted') else None
    
    if not password:
        raise HTTPException(status_code=400, detail="SMTP password not configured")
    
    success, message = await verify_smtp_connection(
        host=account_doc['smtp_host'],
        port=account_doc['smtp_port'],
        username=account_doc.get('smtp_username', account_doc['email']),
        password=password,
        use_tls=account_doc.get('smtp_use_tls', True)
    )
    
    # Update verification status
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "is_verified": success,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    if success:
        return {"success": True, "message": message}
    else:
        raise HTTPException(status_code=400, detail=message)

@api_router.post("/sending-accounts/{account_id}/pause")
async def pause_sending_account(account_id: str, reason: Optional[str] = None, current_user: User = Depends(get_current_user)):
    """Pause a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "is_paused": True,
            "pause_reason": reason or "Manually paused",
            "warmup_status": "paused" if account_doc.get('warmup_enabled') else account_doc.get('warmup_status', 'inactive'),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Sending account paused"}

@api_router.post("/sending-accounts/{account_id}/resume")
async def resume_sending_account(account_id: str, current_user: User = Depends(get_current_user)):
    """Resume a paused sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    # Determine warmup status on resume
    warmup_status = "inactive"
    if account_doc.get('warmup_enabled'):
        if account_doc.get('warmup_completed'):
            warmup_status = "completed"
        else:
            warmup_status = "active"
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "is_paused": False,
            "pause_reason": None,
            "warmup_status": warmup_status,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Sending account resumed"}

# ============= WARMUP API ENDPOINTS =============

@api_router.post("/sending-accounts/{account_id}/warmup/start")
async def start_warmup(account_id: str, current_user: User = Depends(get_current_user)):
    """Start warmup for a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    if not account_doc.get('is_verified'):
        raise HTTPException(status_code=400, detail="Please verify the account before starting warmup")
    
    if account_doc.get('is_paused'):
        raise HTTPException(status_code=400, detail="Account is paused. Resume it first.")
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "warmup_enabled": True,
            "warmup_status": "active",
            "warmup_day": account_doc.get('warmup_day', 0),
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Warmup started successfully"}

@api_router.post("/sending-accounts/{account_id}/warmup/pause")
async def pause_warmup(account_id: str, current_user: User = Depends(get_current_user)):
    """Pause warmup for a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "warmup_status": "paused",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Warmup paused"}

@api_router.get("/sending-accounts/{account_id}/warmup/stats", response_model=WarmupStats)
async def get_warmup_stats(account_id: str, current_user: User = Depends(get_current_user)):
    """Get warmup statistics for a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    # Get warmup logs
    logs = await db.sending_account_warmup_logs.find(
        {"sending_account_id": account_id},
        {"_id": 0}
    ).sort("date", -1).to_list(30)  # Last 30 days
    
    total_sent = sum(log.get('emails_sent', 0) for log in logs)
    total_delivered = sum(log.get('emails_delivered', 0) for log in logs)
    total_replies = sum(log.get('replies_received', 0) for log in logs)
    total_opens = sum(log.get('open_count', 0) for log in logs)
    total_bounces = sum(log.get('bounce_count', 0) for log in logs)
    total_spam_flags = sum(log.get('spam_flags', 0) for log in logs)
    
    reply_rate = (total_replies / total_sent * 100) if total_sent > 0 else 0
    open_rate = (total_opens / total_sent * 100) if total_sent > 0 else 0
    bounce_rate = (total_bounces / total_sent * 100) if total_sent > 0 else 0
    
    # Format daily logs for chart
    daily_logs = []
    for log in reversed(logs[:14]):  # Last 14 days for chart
        daily_logs.append({
            "date": log.get('date'),
            "sent": log.get('emails_sent', 0),
            "delivered": log.get('emails_delivered', 0),
            "replies": log.get('replies_received', 0),
            "opens": log.get('open_count', 0),
            "bounces": log.get('bounce_count', 0),
            "day": log.get('day', 0)
        })
    
    return WarmupStats(
        total_sent=total_sent,
        total_delivered=total_delivered,
        total_replies=total_replies,
        total_opens=total_opens,
        total_bounces=total_bounces,
        total_spam_flags=total_spam_flags,
        reply_rate=round(reply_rate, 2),
        open_rate=round(open_rate, 2),
        bounce_rate=round(bounce_rate, 2),
        current_day=account_doc.get('warmup_day', 0),
        status=account_doc.get('warmup_status', 'inactive'),
        daily_logs=daily_logs
    )

@api_router.patch("/sending-accounts/{account_id}/warmup/settings")
async def update_warmup_settings(account_id: str, settings: WarmupSettings, current_user: User = Depends(get_current_user)):
    """Update warmup settings for a sending account"""
    account_doc = await db.sending_accounts.find_one({
        "id": account_id, 
        "user_id": current_user.id
    }, {"_id": 0})
    
    if not account_doc:
        raise HTTPException(status_code=404, detail="Sending account not found")
    
    await db.sending_accounts.update_one(
        {"id": account_id},
        {"$set": {
            "warmup_daily_volume": settings.daily_volume,
            "warmup_ramp_up": settings.ramp_up,
            "warmup_reply_rate": settings.reply_rate,
            "warmup_random_delay_min": settings.random_delay_min,
            "warmup_random_delay_max": settings.random_delay_max,
            "warmup_weekend_sending": settings.weekend_sending,
            "warmup_auto_pause_bounce_rate": settings.auto_pause_bounce_rate,
            "warmup_auto_pause_spam_threshold": settings.auto_pause_spam_threshold,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }}
    )
    
    return {"success": True, "message": "Warmup settings updated"}

# ============= SENDING ACCOUNT HEALTH CHECK =============

async def check_sending_account_health(account_id: str):
    """Check and update sending account health based on metrics"""
    account_doc = await db.sending_accounts.find_one({"id": account_id}, {"_id": 0})
    if not account_doc:
        return
    
    bounce_rate = account_doc.get('bounce_rate', 0)
    spam_rate = account_doc.get('spam_rate', 0)
    reputation_score = account_doc.get('reputation_score', 100)
    
    # Determine health status
    health_status = "healthy"
    should_pause = False
    pause_reason = None
    
    if bounce_rate >= 4.0 or spam_rate >= 0.5:
        health_status = "critical"
        should_pause = True
        pause_reason = f"Critical: High bounce rate ({bounce_rate:.1f}%) or spam rate ({spam_rate:.2f}%)"
    elif bounce_rate >= 2.0 or spam_rate >= 0.2 or reputation_score < 70:
        health_status = "risky"
    
    # Update health status
    update_dict = {
        "health_status": health_status,
        "updated_at": datetime.now(timezone.utc).isoformat()
    }
    
    # Auto-pause if thresholds exceeded
    if should_pause and account_doc.get('warmup_auto_pause_bounce_rate'):
        if bounce_rate >= account_doc['warmup_auto_pause_bounce_rate']:
            update_dict["is_paused"] = True
            update_dict["pause_reason"] = pause_reason
            update_dict["warmup_status"] = "paused"
    
    await db.sending_accounts.update_one({"id": account_id}, {"$set": update_dict})

# ============= SENDING ACCOUNT WARMUP PROGRESSION =============

async def progress_sending_account_warmup():
    """Daily job to progress warmup for all active sending accounts"""
    accounts = await db.sending_accounts.find({
        "warmup_enabled": True,
        "warmup_status": "active",
        "is_paused": False
    }, {"_id": 0}).to_list(None)
    
    for account in accounts:
        current_day = account.get('warmup_day', 0)
        new_day = current_day + 1
        
        # Calculate expected volume for the day
        base_volume = account.get('warmup_daily_volume', 5)
        ramp_up = account.get('warmup_ramp_up', 2)
        expected_volume = base_volume + (new_day * ramp_up)
        expected_volume = min(expected_volume, account.get('daily_send_limit', 50))
        
        # Simulate warmup email activity (in production, this would be actual sending)
        delivered = int(expected_volume * random.uniform(0.95, 1.0))
        replies = int(delivered * account.get('warmup_reply_rate', 30) / 100 * random.uniform(0.8, 1.2))
        opens = int(delivered * random.uniform(0.4, 0.7))
        bounces = int(expected_volume * random.uniform(0, 0.02))
        spam_flags = 1 if random.random() < 0.01 else 0
        
        # Create warmup log
        log = SendingAccountWarmupLog(
            sending_account_id=account['id'],
            day=new_day,
            emails_sent=expected_volume,
            emails_delivered=delivered,
            replies_received=replies,
            open_count=opens,
            bounce_count=bounces,
            spam_flags=spam_flags
        )
        
        log_dict = log.model_dump()
        log_dict['date'] = log_dict['date'].isoformat()
        await db.sending_account_warmup_logs.insert_one(log_dict)
        
        # Update account stats
        total_sent = account.get('total_emails_sent', 0) + expected_volume
        total_replies = account.get('total_replies', 0) + replies
        total_opens = account.get('total_opens', 0) + opens
        
        bounce_rate = (bounces / expected_volume * 100) if expected_volume > 0 else 0
        reputation_change = -5 if bounce_rate > 2 else (2 if replies > 0 else 0)
        new_reputation = min(100, max(0, account.get('reputation_score', 100) + reputation_change))
        
        warmup_completed = new_day >= 30
        warmup_status = "completed" if warmup_completed else "active"
        
        await db.sending_accounts.update_one(
            {"id": account['id']},
            {"$set": {
                "warmup_day": new_day,
                "warmup_completed": warmup_completed,
                "warmup_status": warmup_status,
                "total_emails_sent": total_sent,
                "total_replies": total_replies,
                "total_opens": total_opens,
                "bounce_rate": round(bounce_rate, 2),
                "reputation_score": new_reputation,
                "emails_sent_today": expected_volume,
                "last_activity": datetime.now(timezone.utc).isoformat(),
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
        
        # Check health after update
        await check_sending_account_health(account['id'])

app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

# Initialize scheduler for warmup progression
scheduler = BackgroundScheduler()
scheduler.add_job(
    lambda: asyncio.run(progress_warmup()),
    'cron',
    hour=0,  # Run at midnight
    minute=0,
    id='domain_warmup'
)
scheduler.add_job(
    lambda: asyncio.run(progress_sending_account_warmup()),
    'cron',
    hour=0,
    minute=5,  # Run 5 mins after domain warmup
    id='sending_account_warmup'
)
scheduler.start()

@app.on_event("shutdown")
async def shutdown_db_client():
    scheduler.shutdown()
    client.close()
