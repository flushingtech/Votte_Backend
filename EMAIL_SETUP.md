# Welcome Email Setup Guide

## 1. Install Nodemailer

Run this command in your backend directory:

```bash
cd Votte_Backend
npm install nodemailer
```

## 2. Set Up Gmail App Password

### Step-by-Step:

1. **Go to your Google Account**: https://myaccount.google.com/

2. **Enable 2-Factor Authentication** (if not already enabled):
   - Go to Security → 2-Step Verification
   - Follow the setup process

3. **Create an App Password**:
   - Go to Security → 2-Step Verification → App passwords
   - Or directly: https://myaccount.google.com/apppasswords
   - Select "Mail" as the app
   - Select "Other" as the device and name it "Votte Backend"
   - Click "Generate"
   - Copy the 16-character password (it looks like: `abcd efgh ijkl mnop`)

4. **Update your `.env` file**:
   ```env
   EMAIL_USER=your-actual-email@gmail.com
   EMAIL_APP_PASSWORD=abcdefghijklmnop
   ```
   ⚠️ **Important**: Remove spaces from the app password!

## 3. Test the Email System

### Option 1: Test with a new user signup
Just sign in with a new Google account and you should receive the welcome email!

### Option 2: Test manually
Create a test file `test-email.js`:

```javascript
require('dotenv').config();
const { sendWelcomeEmail } = require('./src/services/emailService');

// Replace with your email for testing
sendWelcomeEmail('your-test-email@gmail.com', 'Test User')
  .then(result => {
    console.log('Email sent:', result);
    process.exit(0);
  })
  .catch(error => {
    console.error('Email failed:', error);
    process.exit(1);
  });
```

Run: `node test-email.js`

## 4. Troubleshooting

### "Invalid login" error
- Make sure you're using an App Password, not your regular Gmail password
- Ensure 2-Factor Authentication is enabled
- Double-check there are no spaces in the password

### Emails going to spam
- Add your domain to SPF records
- Consider using a dedicated email service like SendGrid for production

### Rate limits
- Gmail has a limit of 500 emails per day for free accounts
- For higher volume, consider using SendGrid, AWS SES, or Resend

## 5. Email Content

The welcome email includes:
- ✓ Personalized greeting with user's name
- ✓ Overview of Votte features
- ✓ Call-to-action button to explore the platform
- ✓ Support contact information
- ✓ Professional FlushingTech branding

## 6. Production Considerations

For production, consider:
1. **Use a dedicated email service** (SendGrid, AWS SES, Resend)
2. **Set up a custom domain** (emails@flushingtech.org)
3. **Add email templates** for other notifications
4. **Implement email queue** for better reliability
5. **Add unsubscribe links** for compliance

## 7. Future Enhancements

Potential email notifications to add:
- Event reminders
- Project collaboration requests
- Voting notifications
- Award announcements
- Weekly digest of new projects

---

**Need help?** Contact the development team or check the nodemailer docs: https://nodemailer.com/
