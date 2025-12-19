const nodemailer = require('nodemailer');
require('dotenv').config();

// Create transporter
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_APP_PASSWORD, // App-specific password, not regular Gmail password
  },
});

// Welcome email template - Matches Votte's dark aesthetic
const getWelcomeEmailHTML = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        * {
          margin: 0;
          padding: 0;
          box-sizing: border-box;
        }
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          background: #000000;
          color: #e5e7eb;
          line-height: 1.6;
          padding: 0;
          margin: 0;
          max-width: 600px;
          margin: 0 auto;
        }
        .email-wrapper {
          background: #000000;
          padding: 0;
          overflow: hidden;
          max-width: 640px;
          margin: 0 auto;
          display: table;
          height: auto;
        }
        .email-container {
          max-width: 600px;
          margin: 0 auto;
          position: relative;
          overflow: hidden;
          height: 100%;
        }
        .header {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
          border: 1px solid rgba(71, 85, 105, 0.5);
          padding: 40px 30px;
          text-align: center;
          position: relative;
          backdrop-filter: blur(10px);
          margin-bottom: 20px;
        }
        .logo {
          font-size: 48px;
          font-weight: bold;
          margin-bottom: 10px;
        }
        .logo-votte {
          color: #f97316;
          font-size: 48px;
        }
        .logo-tech {
          color: #ffffff;
          font-size: 24px;
        }
        .tagline {
          color: #94a3b8;
          font-size: 16px;
          margin-top: 8px;
        }
        .content {
          background: linear-gradient(135deg, rgba(30, 41, 59, 0.5) 0%, rgba(15, 23, 42, 0.5) 100%);
          border: 1px solid rgba(71, 85, 105, 0.5);
          padding: 30px;
          position: relative;
          backdrop-filter: blur(10px);
          margin-bottom: 20px;
        }
        h2 {
          color: #ffffff;
          font-size: 24px;
          margin-bottom: 20px;
        }
        p {
          color: #cbd5e1;
          margin-bottom: 16px;
          font-size: 15px;
        }
        .features {
          background: rgba(15, 23, 42, 0.6);
          border: 1px solid rgba(71, 85, 105, 0.3);
          padding: 20px;
          margin: 25px 0;
        }
        .features h3 {
          color: #ffffff;
          font-size: 18px;
          margin-bottom: 15px;
        }
        .feature-item {
          color: #94a3b8;
          margin: 12px 0;
          padding-left: 28px;
          position: relative;
          font-size: 14px;
        }
        .feature-item:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #06b6d4;
          font-weight: bold;
          font-size: 16px;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #2563eb 0%, #7c3aed 100%);
          color: #ffffff;
          padding: 14px 32px;
          text-decoration: none;
          margin: 25px 0;
          font-weight: 600;
          font-size: 16px;
          box-shadow: 0 4px 14px rgba(37, 99, 235, 0.4);
          transition: transform 0.2s;
        }
        .button:hover {
          transform: translateY(-2px);
        }
        .divider {
          height: 1px;
          background: linear-gradient(90deg, transparent, rgba(6, 182, 212, 0.3), transparent);
          margin: 30px 0;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #64748b;
          font-size: 12px;
        }
        .footer a {
          color: #3b82f6;
          text-decoration: none;
        }
        .highlight {
          color: #f97316;
          font-weight: 600;
        }
        .support-link {
          color: #3b82f6;
          text-decoration: none;
        }
        .support-link:hover {
          text-decoration: underline;
        }
      </style>
    </head>
    <body>
      <div class="email-wrapper">
        <div class="email-container">
          <!-- Header -->
          <div class="header">
            <div class="logo">
              <span class="logo-votte">Votte</span><span class="logo-tech">.FlushingTech.org</span>
            </div>
            <div class="tagline">Where Innovation Meets Collaboration</div>
          </div>

          <!-- Content -->
          <div class="content">
            <h2>Welcome, ${name}! 👋</h2>

            <p>We're thrilled to have you join <span class="highlight">Votte</span> — the premier platform for hackathon enthusiasts and tech innovators at FlushingTech.</p>

            <div class="features">
              <h3>🚀 What You Can Do on Votte:</h3>
              <div class="feature-item">Submit innovative ideas for upcoming hackathons</div>
              <div class="feature-item">Vote on projects and shape what gets built</div>
              <div class="feature-item">Collaborate with talented innovators</div>
              <div class="feature-item">Track your contributions across multiple events</div>
              <div class="feature-item">Showcase projects publicly with shareable links</div>
              <div class="feature-item">Win awards and build your hackathon portfolio</div>
            </div>

            <p>Ready to start building something amazing?</p>

            <center>
              <a href="https://votte.flushingtech.org" class="button" style="color: #ffffff;">
                Explore Votte →
              </a>
            </center>

            <div class="divider"></div>

            <p style="font-size: 14px; color: #94a3b8;">
              Questions? Reach out to us at <a href="mailto:support@flushingtech.org" class="support-link">support@flushingtech.org</a>
            </p>

            <p style="margin-top: 30px; color: #64748b; font-size: 14px;">
              Happy hacking! 🎉<br>
              <strong style="color: #94a3b8;">— The FlushingTech Team</strong>
            </p>
          </div>

          </div>

          <!-- Footer -->
          <div class="footer">
            <p style="margin-bottom: 8px;">© ${new Date().getFullYear()} FlushingTech. All rights reserved.</p>
            <p style="color: #475569;">This email was sent because you signed up for Votte.</p>
          </div>
        </div>
      </div>
    </body>
    </html>
  `;
};

// Send welcome email
const sendWelcomeEmail = async (email, name) => {
  try {
    const mailOptions = {
      from: {
        name: 'Votte by FlushingTech',
        address: process.env.EMAIL_USER,
      },
      to: email,
      subject: '🚀 Welcome to Votte by FlushingTech!',
      html: getWelcomeEmailHTML(name),
      text: `WELCOME TO VOTTE.FLUSHINGTECH.ORG

Hi ${name}!

We're thrilled to have you join Votte — the premier platform for hackathon enthusiasts and tech innovators at FlushingTech.

WHAT YOU CAN DO:
✓ Submit innovative ideas for upcoming hackathons
✓ Vote on projects and shape what gets built
✓ Collaborate with talented innovators
✓ Track your contributions across multiple events
✓ Showcase projects publicly with shareable links
✓ Win awards and build your hackathon portfolio

Ready to start building? Visit: ${process.env.SERVER_URL || 'https://votte.flushingtech.org'}/home

Questions? Reach out at support@flushingtech.org

Happy hacking! 🎉
— The FlushingTech Team`,
    };

    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Welcome email sent successfully:', info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
};
