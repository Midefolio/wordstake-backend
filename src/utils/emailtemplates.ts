/* eslint-disable @typescript-eslint/no-explicit-any */
const verificationMail = async (code:string):Promise<string> => {
  const emailBody = `
     <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <link rel="preconnect" href="https://fonts.googleapis.com">
      <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
    </head>
    <style>
   .inter {
    font-family: "Inter", sans-serif;
    font-optical-sizing: auto;
    font-weight:100;
    font-style: normal;
    font-variation-settings:
      "slnt" 0;
  }
  .img-container{
    width:100%;
    height:150px;
    overflow:hidden;
  }
  .img-container img {
    width:100%;
    height:100%;
    object-fit:cover;
  }
  .down-5 {
    margin-top: 5%;
  }
  .b-shadow {
    box-shadow: 0px 2px 16px rgba(0, 0, 0, 0.5);
  }
      .btn-sm {
        text-decoration:none;
        padding:10px 30px;
        color:white;
        font-size:13px;
        background-color:rgb(0, 60, 255);
      }
      .faded {
        color:#555;
      }
      .bold {
        font-weight: bold;
      }
      .px10 {
        font-size: 9px;
      }
      .down-1 {
        margin-top: 1%;
      }
    </style>
    <body style="font-family:inter, sans-serif; font-size: 13px;">
      <div style="max-width: 600px; margin: 0 auto; padding: 20px; border-radius: 10px; color:#fff; background-color: #000;">
        <p>Hello <b class="color-code-1">User</b></p>
        <p>Thank you for signing up on solCart. Your verification code is:</p>
        <p class="down-5 mother"><a href="https://t.me/+2Gx_ihtvqmwzMWE0" class="btn-sm bold">${code}</a></p>
        <p class="down-5">
         This code will expire in 10mins
        </p>
        <div style="font-size: 10px;" class="faded down-5">If you didn't sign up for this service, please ignore this email.</div>
        <div style="font-size: 10px" class=" faded down-1">solCart team. All rights reserved</div>
      </div>
    </body>
  </html>
  `;
 return emailBody;
}

const orderNoticeMail = async () => {
  const emailBody = `
<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>New Order Notification</title>
<style>
    body {
        font-family: Arial, sans-serif;
        background-color: #f4f4f4;
        margin: 0;
        padding: 0;
    }
    .container {
        background-color: #ffffff;
        max-width: 600px;
        margin: 20px auto;
        padding: 20px;
        border: 1px solid #ddd;
        border-radius: 5px;
    }
    .header {
        text-align: center;
        background-color: #1A73E8;
        color: white;
        padding: 10px 0;
    }
    .content {
        padding: 20px;
    }
    .footer {
        text-align: center;
        color: #888;
        font-size: 12px;
        margin-top: 20px;
    }
    .order-details {
        background-color: #f9f9f9;
        padding: 10px;
        border: 1px solid #ddd;
        border-radius: 5px;
        margin-top: 20px;
    }
    .order-details h4 {
        margin: 0 0 10px 0;
        color: #333;
    }
    .order-details p {
        margin: 5px 0;
        font-size: 14px;
    }
    .cta {
        /* text-align: center; */
        margin-top: 20px;
    }
    .cta a {
        background-color: #1A73E8;
        color: white;
        padding: 10px 20px;
        text-decoration: none;
        border-radius: 5px;
        font-size: 16px;
    }
    .cta a:hover {
        background-color: #1A73E8;
    }
</style>
</head>
<body>
<div class="container">
    <!-- Header -->
    <div class="header">
        <h1>New Order Received!</h1>
    </div>
    <div class="content">
        <p>Dear <strong>Seller</strong>,</p>
        <p>We are excited to inform you that a customer has placed an order for your product(s) on our platform.</p>
        <p>Please review the details below and prepare to ship the goods as soon as possible:</p>

        <!-- Call to Action -->
        <div class="cta">
            <a href="https://your-platform.com/orders/123456" target="_blank">View Order Details</a>
        </div>
        <br>
        <p>Thank you for selling with us!</p>
    </div>

    <!-- Footer -->
    <div class="footer">
        <p>If you have any questions or need assistance, feel free to contact our support team.</p>
        <p>&copy; 2024 Solcart global. All rights reserved.</p>
    </div>
</div>
</body>
</html>
  `;
 return emailBody;
}

const meetingMail = async (data:any) => {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Meeting Notification</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: green;
    }
    .header h2 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .details {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
    }
    .details p {
      margin: 8px 0;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h2>New Meeting Scheduled!</h2>
    </div>

    <!-- Content -->
    <div class="content">
      <p>Hi there!<br>A new meeting has been scheduled, and you're invited to join. Please find the meeting details below:</p>

      <!-- Meeting Details -->
      <div class="details">
        <p><strong>Meeting Type:</strong> ${data.type}</p>
        <p><strong>Description:</strong> ${data.description}</p>
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
        <p><strong>Duration:</strong> ${data.duration} minutes</p>
        <p><strong>Venue:</strong> ${data.venue || "Online"}</p>
        <p><strong>Link:</strong> <a href="${data.link}" target="_blank">${data.link}</a></p>
      </div>

      <p>If you have any questions or need further assistance, please reach out to us at <a href="mailto:support@futurelivingafrica.com">support@futurelivingafrica.com</a>.</p>
      
      <p>Best regards,<br><strong>The FutureLivingAfrica Team</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="https://futurelivingafrica.com">Visit our website</a> | <a href="mailto:support@futurelivingafrica.com">Email us</a> | Call us: +123-456-7890</p>
    </div>
  </div>
</body>
</html>`;
  return body;
};

const ReceiptMail = async (data:any)=> {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Receipt - FutureLiving Africa</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: green;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: green;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .transaction-details {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
    }
    .transaction-details p {
      margin: 8px 0;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>FutureLivingAfrica</h1>
      <p>Transaction Receipt</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Hello ${data.customer},</h2>
      <p>Thank you for choosing FutureLivingAfrica. We’re pleased to confirm that we’ve received your recent transaction. Below are the details of your transaction for your reference:</p>
      <p>This contribution is not just a transaction; it’s an investment in the vision of a sustainable and enriching living experience.</p>

      <!-- Transaction Details -->
      <div class="transaction-details">
        <p><strong>Date:</strong> ${data.date}</p>
        <p><strong>Time:</strong> ${data.time}</p>
        <p><strong>Amount:</strong> ${data.currency}${data.amount}</p>
        <p><strong>Description:</strong> ${data.narration}</p>
      </div>
       <p>Unit/Plot: Shall be allotted upon allocation.</p>
      <p>If you have any questions or need further assistance, please don’t hesitate to reach out to us at <a href="mailto:info@futurelivingafrica.com">info@futurelivingafrica.com</a> </p>

      <p>Once again, thank you for choosing Future Living Africa. We look forward to continuing this journey toward a greener, more prosperous future together.</p>

      <p>Warm regards, <br><strong>The FutureLivingAfrica</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="https://futurelivingafrica.com">Visit our website</a> | <a href="mailto:info@futurelivingafrica.com">Email us</a> | Call us: +234 802 431 2231 </p>
    </div>
  </div>
</body>
</html>
`

return body
}

const InvoiceMail = async (data: any) => {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Transaction Invoice - FutureLiving Africa</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: green;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: green;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .transaction-details {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
    }
    .transaction-details p {
      margin: 8px 0;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>FutureLivingAfrica</h1>
      <p>Your Invoice</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Hello ${data.clientName},</h2>
      <p>Thank you for your recent transaction with FutureLivingAfrica. Below are the details of your invoice:</p>

      <!-- Invoice Details -->
      <div class="transaction-details">
        <p><strong>Invoice Description:</strong> ${data.narration}</p>
        <p><strong>Total Amount:</strong> ${data.currency}${data.totalAmountString}</p>
        <p><strong>PaymentType:</strong> ${data.payment_type === 'Installmental' ? 'Installment' : 'One-Time'}</p>
        ${
          data.payment_type === 'Installmental'
            ? 
            `<p><strong>Installment Amount:</strong> ${data.currency}${data.totalInstalString}</p>
            <p><strong>Payment Intervals:</strong> every ${data.interval}days </p>`
            : ''
        }
        <p><strong>Payment Due On:</strong> ${data.dueDate}</p>
        
      </div>

      <p>If you have any questions or need further assistance, please don’t hesitate to reach out to us at <a href="mailto:support@futurelivingafrica.com">support@futurelivingafrica.com</a>.</p>

      <p>Thank you for choosing FutureLivingAfrica as your trusted partner in achieving a sustainable future. We look forward to serving you.</p>

      <p>Warm regards, <br><strong>The FutureLivingAfrica Team</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="https://futurelivingafrica.com">Visit our website</a> | <a href="mailto:support@futurelivingafrica.com">Email us</a> | Call us: 09088977655</p>
    </div>
  </div>
</body>
</html>
  `;
  return body;
};

const ReminderMailTemplate = async ({ clientName, amountDue, dueDate }: any) => {
  const body = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Payment Reminder - FutureLiving Africa</title>
  <style>
    body { font-family: Arial, sans-serif; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { text-align: center; background-color: #e7f1fe; padding: 10px; }
    .content { padding: 20px; }
    .footer { text-align: center; font-size: 12px; margin-top: 20px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>FutureLiving Africa</h1>
    </div>
    <div class="content">
      <h2>Hello ${clientName},</h2>
      <p>This is a friendly reminder that your payment of ${amountDue} is due on ${dueDate.toLocaleDateString()}.</p>
      <p>Thank you for your attention to this matter!</p>
    </div>
    <div class="footer">
      <p>Thank you for being part of the FutureLiving Africa community.</p>
    </div>
  </div>
</body>
</html>`;
  return body;
};

const teamLoginMail = async (data: any) => {
  const body = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Welcome to FutureLiving Africa - Login Credentials</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: green;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: green;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .credentials {
      background-color: #f2f2f2;
      padding: 15px;
      border-radius: 5px;
      margin-top: 15px;
    }
    .credentials p {
      margin: 8px 0;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>FutureLivingAfrica</h1>
      <p>Welcome to the Team!</p>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Hello ${data.firstName} ${data.lastName},</h2>
      <p>We are thrilled to welcome you to the FutureLiving Africa team! To help you get started, we’ve created an account for you on our system. Below are your login credentials:</p>

      <!-- Credentials -->
      <div class="credentials">
        <p><strong>Login Email:</strong> ${data.email}</p>
        <p><strong>Login Password:</strong> ${data.password}</p>
      </div>

      <p>Please use these credentials to log in to your account at <a href="https://team.futurelivingafrica.com/">team.futurelivingafrica.com</a>.</p>

      <p><strong>Important:</strong> For security reasons, we recommend changing your password after your first login.</p>

      <p>If you have any questions or run into any issues, please don’t hesitate to reach out to our IT support team at <a href="mailto:support@futurelivingafrica.com">support@futurelivingafrica.com</a>.</p>

      <p>Once again, welcome to the team. We look forward to achieving great things together!</p>

      <p>Best regards, <br><strong>The FutureLivingAfrica Team</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="https://futurelivingafrica.com">Visit our website</a> | <a href="mailto:info@futurelivingafrica.com">Email us</a> | Call us: +234 802 431 2231 </p>
    </div>
  </div>
</body>
   </html> `
  return body;
}

const birthdayEmailTemplate = async (data: any) => {
  const body = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Happy Birthday from Future Living Africa!</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: green;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: green;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>Happy Birthday from Future Living Africa!</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Dear ${data.firstName} ${data.lastName},</h2>
      <p>Happy birthday to an amazing individual!</p>
      <p>On your special day, we want to take a moment to express our gratitude for being part of the Future Living Africa community. We hope your day is filled with love, laughter, and all your favorite things.</p>
      <p>As a valued subscriber, we're excited to offer you an exclusive birthday gift:</p>
      <p><strong>2% off our next project!</strong></p>
      <p>To redeem your gift, simply reply to this email or give us a call at <strong>09116563907</strong>. We can't wait to celebrate with you!</p>
      <p>Wishing you a birthday as bright and beautiful as you are!</p>

      <p>Best regards, <br><strong>The Future Living Africa Team</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="https://futurelivingafrica.com">Visit our website</a> | <a href="mailto:info@futurelivingafrica.com">Email us</a> | Call us: +234 802 431 2231 </p>
    </div>
  </div>
</body>
   </html> `
  return body;
};


const newTaskEmailTemplate = async (data: any) => {
  const body = `
  <!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New Task Assigned!</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      color: #333;
      margin: 0;
      padding: 0;
      background-color: #f9f9f9;
    }
    .container {
      width: 100%;
      max-width: 600px;
      margin: 0 auto;
      background-color: #ffffff;
      border: 1px solid #e0e0e0;
      padding: 20px;
      box-shadow: 0px 0px 10px rgba(0, 0, 0, 0.1);
    }
    .header {
      text-align: center;
      padding: 20px;
      background-color: #e7f1fe;
      color: #004085;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
    }
    .content {
      padding: 20px;
    }
    .content h2 {
      color: #004085;
      font-size: 20px;
      margin-bottom: 10px;
    }
    .content p {
      font-size: 16px;
      line-height: 1.5;
      color: #555;
    }
    .task-details {
      margin-top: 15px;
      padding: 10px;
      border: 1px solid #e0e0e0;
      background-color: #f9f9f9;
    }
    .task-details p {
      margin: 5px 0;
      font-size: 16px;
    }
    .footer {
      text-align: center;
      padding: 15px;
      background-color: #e7f1fe;
      color: #555;
      font-size: 14px;
    }
    .footer a {
      color: #007bff;
      text-decoration: none;
    }
    .footer a:hover {
      text-decoration: underline;
    }
  </style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <div class="header">
      <h1>New Task Assigned</h1>
    </div>

    <!-- Content -->
    <div class="content">
      <h2>Hi Mate!,</h2>
      <p>You have been assigned a new task. Please find the details below:</p>

      <!-- Task Details -->
      <div class="task-details">
        <p><strong>Task Title:</strong> ${data.title}</p>
        <p><strong>Priority:</strong> ${data.priority}</p>
        <p><strong>Deadline:</strong> ${data.dueDate}</p>
      </div>

      <p>We trust that you will approach this task with diligence and professionalism. If you have any questions or need further clarification, feel free to reach out.</p>
      <p>Thank you for your hard work and dedication!</p>

      <p>Best regards, <br><strong>The Management Team</strong></p>
    </div>

    <!-- Footer -->
    <div class="footer">
      <p><a href="mailto:team@futurelivingafrica.com">Email Us</a> | Call Us: +234 802 431 2231</p>
    </div>
  </div>
</body>
   </html>`;
  return body;
};



export {
  verificationMail,
  orderNoticeMail,
  meetingMail,
  ReceiptMail,
  InvoiceMail,
  ReminderMailTemplate,
  teamLoginMail,
  birthdayEmailTemplate,
  newTaskEmailTemplate
}
