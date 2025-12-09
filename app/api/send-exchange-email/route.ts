import { NextRequest, NextResponse } from 'next/server'
import nodemailer from 'nodemailer'

interface ExchangeItem {
  product_name: string
  size: string
  quantity: number
  unit_price: number
  total_price: number
}

interface ExchangeEmailDetails {
  order_number: number
  shipping_number: number
  old_items: ExchangeItem[]
  new_items: ExchangeItem[]
  price_difference: number
  exchange_date: string
}

export async function POST(request: NextRequest) {
  try {
    // Only send emails in production mode
    const isProduction = process.env.NODE_ENV === 'production' || process.env.ENABLE_EMAILS === 'true'
    
    if (!isProduction) {
      const exchangeDetails: ExchangeEmailDetails = await request.json()
      console.log('📧 Email skipped (dev mode): Exchange email would be sent for order #' + exchangeDetails.order_number)
      return NextResponse.json({ 
        success: true, 
        messageId: 'skipped-dev-mode',
        skipped: true,
        message: 'Email skipped in development mode' 
      })
    }

    const exchangeDetails: ExchangeEmailDetails = await request.json()

    if (!process.env.EMAIL_PASSWORD) {
      console.error('EMAIL_PASSWORD environment variable is not set')
      return NextResponse.json({ success: false, error: 'Email configuration missing' }, { status: 500 })
    }

    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: 'prvyit@gmail.com',
        pass: process.env.EMAIL_PASSWORD,
      },
    })

    const formatCurrency = (amount: number) =>
      new Intl.NumberFormat('en-US', { style: 'currency', currency: 'AED' }).format(amount)

    const formatDate = (dateString: string) =>
      new Date(dateString).toLocaleString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })

    const oldTotal = exchangeDetails.old_items.reduce((sum, item) => sum + item.total_price, 0)
    const newTotal = exchangeDetails.new_items.reduce((sum, item) => sum + item.total_price, 0)

    const emailSubject = `Order Exchange - #${exchangeDetails.order_number}`

    const productionDomain = process.env.NEXT_PUBLIC_APP_URL || 'https://your-domain.com'

    const htmlEmailBody = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${emailSubject}</title>
    </head>
    <body style="margin:0;padding:0;background-color:#f8fafc;font-family:Arial,Helvetica,sans-serif;">
      <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc;padding:20px 0;">
        <tr>
          <td align="center">
            <table width="600" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:8px;overflow:hidden;">
              
              <!-- Header -->
              <tr>
                <td align="center" style="background:linear-gradient(135deg,#f59e0b 0%,#d97706 100%);padding:30px;color:#fff;">
                  <h1 style="margin:0;font-size:24px;font-weight:bold;">
                    🔄 Order Exchange
                  </h1>
                  <p style="margin:8px 0 0;font-size:16px;">Order #${exchangeDetails.order_number}</p>
                </td>
              </tr>

              <!-- Content -->
              <tr>
                <td style="padding:30px;">

                  <!-- Order Info -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Exchange Information</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;">
                    <tr><td style="font-weight:bold;width:40%;">Order Number</td><td>#${exchangeDetails.order_number}</td></tr>
                    <tr><td style="font-weight:bold;">Shipping Number</td><td>#${exchangeDetails.shipping_number}</td></tr>
                    <tr><td style="font-weight:bold;">Exchange Date</td><td>${formatDate(exchangeDetails.exchange_date)}</td></tr>
                    <tr><td style="font-weight:bold;">Price Difference</td><td style="color:${exchangeDetails.price_difference >= 0 ? '#16a34a' : '#dc2626'};font-weight:bold;">${exchangeDetails.price_difference >= 0 ? '+' : ''}${formatCurrency(exchangeDetails.price_difference)}</td></tr>
                  </table>

                  <!-- Old Order Details -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;color:#dc2626;">❌ Original Items (Returned)</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;background:#fef2f2;">
                    <thead>
                      <tr style="background:#fecaca;">
                        <th align="left" style="border-bottom:2px solid #fca5a5;">Product</th>
                        <th align="left" style="border-bottom:2px solid #fca5a5;">Size</th>
                        <th align="left" style="border-bottom:2px solid #fca5a5;">Qty</th>
                        <th align="left" style="border-bottom:2px solid #fca5a5;">Unit Price</th>
                        <th align="left" style="border-bottom:2px solid #fca5a5;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${exchangeDetails.old_items
                        .map(
                          (item) => `
                        <tr>
                          <td>${item.product_name}</td>
                          <td>${item.size}</td>
                          <td>${item.quantity}</td>
                          <td>${formatCurrency(item.unit_price)}</td>
                          <td>${formatCurrency(item.total_price)}</td>
                        </tr>`
                        )
                        .join('')}
                      <tr style="font-weight:bold;border-top:2px solid #fca5a5;">
                        <td colspan="4">Total (Old)</td>
                        <td>${formatCurrency(oldTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- New Order Details -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;color:#16a34a;">✅ New Items (Exchanged To)</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;margin-bottom:20px;background:#f0fdf4;">
                    <thead>
                      <tr style="background:#bbf7d0;">
                        <th align="left" style="border-bottom:2px solid #86efac;">Product</th>
                        <th align="left" style="border-bottom:2px solid #86efac;">Size</th>
                        <th align="left" style="border-bottom:2px solid #86efac;">Qty</th>
                        <th align="left" style="border-bottom:2px solid #86efac;">Unit Price</th>
                        <th align="left" style="border-bottom:2px solid #86efac;">Total</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${exchangeDetails.new_items
                        .map(
                          (item) => `
                        <tr>
                          <td>${item.product_name}</td>
                          <td>${item.size}</td>
                          <td>${item.quantity}</td>
                          <td>${formatCurrency(item.unit_price)}</td>
                          <td>${formatCurrency(item.total_price)}</td>
                        </tr>`
                        )
                        .join('')}
                      <tr style="font-weight:bold;border-top:2px solid #86efac;">
                        <td colspan="4">Total (New)</td>
                        <td>${formatCurrency(newTotal)}</td>
                      </tr>
                    </tbody>
                  </table>

                  <!-- Summary -->
                  <h2 style="margin:0 0 15px;font-size:18px;border-bottom:1px solid #e2e8f0;padding-bottom:8px;">Exchange Summary</h2>
                  <table width="100%" cellpadding="8" cellspacing="0" style="border-collapse:collapse;">
                    <tr><td>Original Order Value:</td><td align="right">${formatCurrency(oldTotal)}</td></tr>
                    <tr><td>New Order Value:</td><td align="right">${formatCurrency(newTotal)}</td></tr>
                    <tr style="font-weight:bold;font-size:16px;border-top:2px solid #e2e8f0;">
                      <td>Price Difference:</td>
                      <td align="right" style="color:${exchangeDetails.price_difference >= 0 ? '#16a34a' : '#dc2626'};">
                        ${exchangeDetails.price_difference >= 0 ? '+' : ''}${formatCurrency(exchangeDetails.price_difference)}
                      </td>
                    </tr>
                  </table>

                  ${exchangeDetails.price_difference !== 0 ? `
                  <div style="margin-top:20px;padding:15px;background:#fef3c7;border-radius:8px;border:1px solid #fcd34d;">
                    <p style="margin:0;font-weight:bold;color:#92400e;">
                      ${exchangeDetails.price_difference > 0 
                        ? `💰 Customer owes an additional ${formatCurrency(exchangeDetails.price_difference)} (paid by cash - no payment fees)` 
                        : `💸 Customer is owed a refund of ${formatCurrency(Math.abs(exchangeDetails.price_difference))}`}
                    </p>
                  </div>
                  ` : ''}

                </td>
              </tr>

              <!-- Footer -->
              <tr>
                <td align="center" style="background:#f8fafc;padding:20px;color:#718096;font-size:14px;">
                  <p style="margin:0;">This is an automated exchange notification from the Trading Dashboard.</p>
                  <p style="margin:5px 0 0;"><a href="${productionDomain}" style="color:#667eea;text-decoration:none;">Access your dashboard</a></p>
                </td>
              </tr>

            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
    `.trim()

    const info = await transporter.sendMail({
      from: 'prvyit@gmail.com',
      to: 'qudaih.tamer@gmail.com',
      subject: emailSubject,
      html: htmlEmailBody,
    })

    console.log('Exchange email sent successfully:', info.messageId)
    return NextResponse.json({ success: true, messageId: info.messageId })
  } catch (error) {
    console.error('Error sending exchange email:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

