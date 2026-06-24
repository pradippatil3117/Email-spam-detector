import { ScanHistoryItem } from "../types";

export const getSeedHistory = (): ScanHistoryItem[] => {
  const now = new Date();
  
  const generatePastDate = (daysAgo: number, hour: number, minute: number): string => {
    const d = new Date(now);
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: "scan-1",
      timestamp: generatePastDate(0, 15, 30),
      sender: "security-alerts@paypal-security.com",
      subject: "Urgent: Your account is temporarily restricted",
      body: "We detected unauthorized login attempts. Verify your identity now by logging in to restore full access. Failure to do so within 24 hours will result in permanent suspension.",
      prediction: "Spam",
      confidence: 0.985,
      spam_score: 0.985,
      risk_level: "High",
      processing_time_ms: 18,
      suspicious_keywords: ["urgent", "account", "login", "verify"],
      reasons: ["Contains urgency language", "High frequency of phishing-related terms", "Spam score exceeds threshold"]
    },
    {
      id: "scan-2",
      timestamp: generatePastDate(0, 12, 10),
      sender: "newsletter@smashingmagazine.com",
      subject: "Web Design Weekly: CSS Grid Tips & Figma Layouts",
      body: "Welcome to this week's issue. In this issue, we explore advanced grid layouts, modern CSS variables, and building dynamic typography in Figma.",
      prediction: "Safe",
      confidence: 0.992,
      spam_score: 0.008,
      risk_level: "Low",
      processing_time_ms: 12,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-3",
      timestamp: generatePastDate(1, 17, 45),
      sender: "josh.davis@company-corp.com",
      subject: "Q3 Project Planning: Team Roles & Deliverables",
      body: "Hi team, please find attached the spreadsheet detailing task owners and milestone targets for the next quarter. Let me know if you have any questions before Monday's sync.",
      prediction: "Safe",
      confidence: 0.997,
      spam_score: 0.003,
      risk_level: "Low",
      processing_time_ms: 14,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-4",
      timestamp: generatePastDate(1, 9, 15),
      sender: "deals-finder@promo-savings.net",
      subject: "Exclusive 80% Discount on Premium Leather Goods!",
      body: "Don't miss our flash clearance sale. Buy one get one free for the next 2 hours! Free worldwide shipping included.",
      prediction: "Spam",
      confidence: 0.894,
      spam_score: 0.894,
      risk_level: "High",
      processing_time_ms: 15,
      suspicious_keywords: ["discount", "sale", "free", "shipping"],
      reasons: ["Contains promotional sales jargon", "Spam score exceeds threshold"]
    },
    {
      id: "scan-5",
      timestamp: generatePastDate(2, 16, 20),
      sender: "accounts@netflix-billing.com",
      subject: "Update Required: Your membership renewal failed",
      body: "We were unable to process your monthly payment. Click here to update your card details to prevent service interruption.",
      prediction: "Spam",
      confidence: 0.941,
      spam_score: 0.941,
      risk_level: "High",
      processing_time_ms: 16,
      suspicious_keywords: ["update", "billing", "payment", "card"],
      reasons: ["Contains urgency language", "Phishing patterns match standard billing templates"]
    },
    {
      id: "scan-6",
      timestamp: generatePastDate(2, 11, 5),
      sender: "hr-benefits@company-corp.com",
      subject: "Action Required: Complete your health plan selection by Friday",
      body: "This is a reminder that the open enrollment period for corporate health insurance closes this Friday at 5 PM. Please log in to the employee portal to make your selections.",
      prediction: "Safe",
      confidence: 0.982,
      spam_score: 0.018,
      risk_level: "Low",
      processing_time_ms: 11,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-7",
      timestamp: generatePastDate(3, 14, 0),
      sender: "support@github-updates.com",
      subject: "[GitHub] Security Alert: New SSH key added to your profile",
      body: "A new SSH public key was added to your account from IP address 192.168.1.104. If this was not you, please audit your SSH keys immediately.",
      prediction: "Safe",
      confidence: 0.975,
      spam_score: 0.025,
      risk_level: "Low",
      processing_time_ms: 13,
      suspicious_keywords: ["security", "alert"],
      reasons: ["Keywords flags: security, alert, but classification probability is safe."]
    },
    {
      id: "scan-8",
      timestamp: generatePastDate(3, 10, 30),
      sender: "webinar-hosts@tech-innovate.io",
      subject: "Reserve your spot: Scaling Node.js APIs to 100k req/sec",
      body: "Join us this Thursday for a live session with senior engineers discussing caching strategies, database pooling, and load balancing for high-performance Node APIs.",
      prediction: "Safe",
      confidence: 0.961,
      spam_score: 0.039,
      risk_level: "Low",
      processing_time_ms: 12,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-9",
      timestamp: generatePastDate(4, 18, 15),
      sender: "claims@lottery-bonus-intl.net",
      subject: "You have won a cash award of £5,000,000! Claim now!",
      body: "Your email address has been selected as the grand winner of the global internet lottery promo. Provide your bank details and phone number to transfer your funds immediately.",
      prediction: "Spam",
      confidence: 0.999,
      spam_score: 0.999,
      risk_level: "High",
      processing_time_ms: 22,
      suspicious_keywords: ["won", "cash", "lottery", "funds", "transfer"],
      reasons: ["Contains financial prize scams", "Highly suspicious phrasing matching financial fraud"]
    },
    {
      id: "scan-10",
      timestamp: generatePastDate(4, 8, 45),
      sender: "finance-team@company-corp.com",
      subject: "Weekly Financial Summary - June 2026",
      body: "Please find the attached spreadsheet containing our revenue breakdown, department expenses, and cashflow reports for the week ending June 20, 2026.",
      prediction: "Safe",
      confidence: 0.998,
      spam_score: 0.002,
      risk_level: "Low",
      processing_time_ms: 13,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-11",
      timestamp: generatePastDate(5, 13, 20),
      sender: "marketing-partner@seo-growth.biz",
      subject: "Double your website traffic in 15 days! Guaranteed!",
      body: "Get first-page ranking on Google and Yahoo! Our organic SEO strategies drives customers straight to your store. Call us now for a free evaluation.",
      prediction: "Spam",
      confidence: 0.912,
      spam_score: 0.912,
      risk_level: "High",
      processing_time_ms: 16,
      suspicious_keywords: ["traffic", "guaranteed", "seo", "evaluation"],
      reasons: ["Contains marketing spam guarantees", "Spam score exceeds threshold"]
    },
    {
      id: "scan-12",
      timestamp: generatePastDate(5, 11, 40),
      sender: "systems-admin@company-corp.com",
      subject: "[Syslog] Server Node-3 RAM usage exceeds 90%",
      body: "Alert: Memory utilization on Node-3 has reached 92%. Active processes include elasticsearch and docker-compose. Immediate memory expansion or scaling is recommended.",
      prediction: "Safe",
      confidence: 0.981,
      spam_score: 0.019,
      risk_level: "Low",
      processing_time_ms: 11,
      suspicious_keywords: ["alert"],
      reasons: []
    },
    {
      id: "scan-13",
      timestamp: generatePastDate(6, 16, 50),
      sender: "noreply@linkedin.com",
      subject: "Lisa, you have 3 new connection requests pending",
      body: "See who wants to connect with you on LinkedIn. View requests now and expand your professional network.",
      prediction: "Safe",
      confidence: 0.969,
      spam_score: 0.031,
      risk_level: "Low",
      processing_time_ms: 15,
      suspicious_keywords: [],
      reasons: []
    },
    {
      id: "scan-14",
      timestamp: generatePastDate(6, 9, 5),
      sender: "admin-portal@verification-secure-alert.info",
      subject: "Security Notification: Password update required",
      body: "We detected a login attempt from a device running Linux. To protect your credentials, reset your password now at the secure link below.",
      prediction: "Spam",
      confidence: 0.957,
      spam_score: 0.957,
      risk_level: "High",
      processing_time_ms: 17,
      suspicious_keywords: ["security", "password", "reset", "login"],
      reasons: ["Contains urgency language", "Phishing link detection match", "Spam score exceeds threshold"]
    },
    {
      id: "scan-15",
      timestamp: generatePastDate(7, 14, 25),
      sender: "karen.lee@client-alliance.com",
      subject: "Feedback on Draft Agreement - Action Needed",
      body: "Hi Lisa, our legal team reviewed the draft agreement and made some edits. Most of them are standard provisions, but please look at section 4 regarding indemnification.",
      prediction: "Safe",
      confidence: 0.996,
      spam_score: 0.004,
      risk_level: "Low",
      processing_time_ms: 14,
      suspicious_keywords: [],
      reasons: []
    }
  ];
};
