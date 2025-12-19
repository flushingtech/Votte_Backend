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

// Welcome email template
const getWelcomeEmailHTML = (name) => {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body {
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
          line-height: 1.6;
          color: #333;
          max-width: 600px;
          margin: 0 auto;
          padding: 20px;
        }
        .header {
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 40px 20px;
          text-align: center;
          border-radius: 10px 10px 0 0;
        }
        .header h1 {
          margin: 0;
          font-size: 32px;
        }
        .content {
          background: #ffffff;
          padding: 30px;
          border: 1px solid #e0e0e0;
          border-top: none;
        }
        .button {
          display: inline-block;
          background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
          color: white;
          padding: 12px 30px;
          text-decoration: none;
          border-radius: 5px;
          margin: 20px 0;
          font-weight: bold;
        }
        .footer {
          text-align: center;
          padding: 20px;
          color: #666;
          font-size: 12px;
        }
        .features {
          background: #f8f9fa;
          padding: 20px;
          border-radius: 5px;
          margin: 20px 0;
        }
        .feature-item {
          margin: 10px 0;
          padding-left: 25px;
          position: relative;
        }
        .feature-item:before {
          content: "✓";
          position: absolute;
          left: 0;
          color: #667eea;
          font-weight: bold;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>🚀 Welcome to Votte!</h1>
        <p style="margin: 10px 0 0 0; font-size: 18px;">by FlushingTech</p>
      </div>

      <div class="content">
        <h2>Hi ${name}! 👋</h2>

        <p>Welcome to <strong>Votte</strong> - where innovation meets collaboration! We're thrilled to have you join our community of hackathon enthusiasts and tech innovators.</p>

        <div class="features">
          <h3 style="margin-top: 0;">What you can do on Votte:</h3>
          <div class="feature-item">Submit your innovative ideas for upcoming hackathons</div>
          <div class="feature-item">Vote on projects and help decide what gets built</div>
          <div class="feature-item">Collaborate with other innovators on exciting projects</div>
          <div class="feature-item">Track your contributions across multiple events</div>
          <div class="feature-item">Showcase your projects publicly with shareable links</div>
          <div class="feature-item">Win awards and build your hackathon portfolio</div>
        </div>

        <p>Ready to get started? Jump into the platform and explore what's happening:</p>

        <center>
          <a href="${process.env.SERVER_URL || 'https://votte.flushingtech.org'}/home" class="button">
            Explore Votte →
          </a>
        </center>

        <p style="margin-top: 30px;">If you have any questions or need help getting started, feel free to reach out to us at <a href="mailto:support@flushingtech.org">support@flushingtech.org</a>.</p>

        <p>Happy hacking! 🎉</p>

        <p style="margin-top: 30px; color: #666;">
          — The FlushingTech Team
        </p>
      </div>

      <div class="footer">
        <p>© ${new Date().getFullYear()} FlushingTech. All rights reserved.</p>
        <p>This email was sent because you signed up for Votte.</p>
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
      subject: '🚀 Welcome to Votte - Let\'s Build Something Amazing!',
      html: getWelcomeEmailHTML(name),
      text: `Welcome to Votte, ${name}!

We're excited to have you join our community of innovators and hackathon enthusiasts.

What you can do on Votte:
- Submit innovative ideas for upcoming hackathons
- Vote on projects and help decide what gets built
- Collaborate with other innovators
- Track your contributions across events
- Showcase your projects publicly
- Win awards and build your portfolio

Get started: ${process.env.SERVER_URL || 'https://votte.flushingtech.org'}/home

Questions? Email us at support@flushingtech.org

Happy hacking!
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
